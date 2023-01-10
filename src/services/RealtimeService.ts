import BaseService from '@/services/utils/BaseService';
import ClientResponseError from '@/ClientResponseError';

interface promiseCallbacks {
    resolve: Function
    reject: Function
}

export type UnsubscribeFunc = () => Promise<void>;

export default class RealtimeService extends BaseService {
    private clientId: string = "";
    private eventSource: EventSource | null = null;
    private subscriptions: { [key: string]: Array<EventListener> } = {};
    private lastSentTopics: Array<string> = [];
    private connectTimeoutId: any;
    private maxConnectTimeout: number = 15000;
    private reconnectTimeoutId: any;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = Infinity;
    private predefinedReconnectIntervals: Array<number> = [
        200, 300, 500, 1000, 1200, 1500, 2000,
    ];
    private pendingConnects: Array<promiseCallbacks> = [];

    /**
     * Returns whether the realtime connection has been established.
     */
    get isConnected(): boolean {
        return !!this.eventSource && !!this.clientId && !this.pendingConnects.length;
    }

    /**
     * Register the subscription listener.
     *
     * You can subscribe multiple times to the same topic.
     *
     * If the SSE connection is not started yet,
     * this method will also initialize it.
     */
    async subscribe(topic: string, callback: (data: any) => void): Promise<UnsubscribeFunc> {
        if (!topic) {
            throw new Error('topic must be set.')
        }

        const listener = function (e: Event) {
            const msgEvent = (e as MessageEvent);

            let data;
            try {
                data = JSON.parse(msgEvent?.data);
            } catch {}

            callback(data || {});
        };

        // store the listener
        if (!this.subscriptions[topic]) {
            this.subscriptions[topic] = [];
        }
        this.subscriptions[topic].push(listener);

        if (!this.isConnected) {
            // initialize sse connection
            await this.connect();
        } else if (this.subscriptions[topic].length === 1) {
            // send the updated subscriptions (if it is the first for the topic)
            await this.submitSubscriptions();
        } else {
            // only register the listener
            this.eventSource?.addEventListener(topic, listener);
        }

        return async (): Promise<void> => {
            return this.unsubscribeByTopicAndListener(topic, listener);
        };
    }

    /**
     * Unsubscribe from all subscription listeners with the specified topic.
     *
     * If `topic` is not provided, then this method will unsubscribe
     * from all active subscriptions.
     *
     * This method is no-op if there are no active subscriptions.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    async unsubscribe(topic?: string): Promise<void> {
        if (!this.hasSubscriptionListeners(topic)) {
            return; // already unsubscribed
        }

        if (!topic) {
            // remove all subscriptions
            this.subscriptions = {};
        } else {
            // remove all topic listeners
            for (let listener of this.subscriptions[topic]) {
                this.eventSource?.removeEventListener(topic, listener);
            }
            delete this.subscriptions[topic];
        }

        if (!this.hasSubscriptionListeners()) {
            // no other active subscriptions -> close the sse connection
            this.disconnect();
        } else if (!this.hasSubscriptionListeners(topic)) {
            // submit subscriptions change if there are no other active subscriptions related to the topic
            await this.submitSubscriptions();
        }
    }

    /**
     * Unsubscribe from all subscription listeners starting with the specified topic prefix.
     *
     * This method is no-op if there are no active subscriptions with the specified topic prefix.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    async unsubscribeByPrefix(topicPrefix: string): Promise<void> {
        let hasAtleastOneTopic = false;
        for (let topic in this.subscriptions) {
            if (!topic.startsWith(topicPrefix)) {
                continue;
            }

            hasAtleastOneTopic = true;
            for (let listener of this.subscriptions[topic]) {
                this.eventSource?.removeEventListener(topic, listener);
            }
            delete this.subscriptions[topic];
        }

        if (!hasAtleastOneTopic) {
            return; // nothing to unsubscribe from
        }

        if (this.hasSubscriptionListeners()) {
            // submit the deleted subscriptions
            await this.submitSubscriptions();
        } else {
            // no other active subscriptions -> close the sse connection
            this.disconnect();
        }
    }

    /**
     * Unsubscribe from all subscriptions matching the specified topic and listener function.
     *
     * This method is no-op if there are no active subscription with
     * the specified topic and listener.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    async unsubscribeByTopicAndListener(topic: string, listener: EventListener): Promise<void> {
        if (!Array.isArray(this.subscriptions[topic]) || !this.subscriptions[topic].length) {
            return; // already unsubscribed
        }

        let exist = false;
        for (let i = this.subscriptions[topic].length - 1; i >= 0; i--) {
            if (this.subscriptions[topic][i] !== listener) {
                continue;
            }

            exist = true;                           // has at least one matching listener
            delete this.subscriptions[topic][i];    // removes the function reference
            this.subscriptions[topic].splice(i, 1); // reindex the array
            this.eventSource?.removeEventListener(topic, listener);
        }
        if (!exist) {
            return;
        }

        // remove the topic from the subscriptions list if there are no other listeners
        if (!this.subscriptions[topic].length) {
            delete this.subscriptions[topic];
        }

        if (!this.hasSubscriptionListeners()) {
            // no other active subscriptions -> close the sse connection
            this.disconnect();
        } else if (!this.hasSubscriptionListeners(topic)) {
            // submit subscriptions change if there are no other active subscriptions related to the topic
            await this.submitSubscriptions();
        }
    }

    private hasSubscriptionListeners(topicToCheck?: string): boolean {
        this.subscriptions = this.subscriptions || {};

        // check the specified topic
        if (topicToCheck) {
            return !!this.subscriptions[topicToCheck]?.length;
        }

        // check for at least one non-empty topic
        for (let topic in this.subscriptions) {
            if (!!this.subscriptions[topic]?.length) {
                return true
            }
        }

        return false;
    }

    private async submitSubscriptions(): Promise<void> {
        if (!this.clientId) {
            return; // no client/subscriber
        }

        // optimistic update
        this.addAllSubscriptionListeners();

        this.lastSentTopics = this.getNonEmptySubscriptionTopics();

        return this.client.send('/api/realtime', {
            'method': 'POST',
            'body': {
                'clientId': this.clientId,
                'subscriptions': this.lastSentTopics,
            },
            'params': {
                '$cancelKey': "realtime_" + this.clientId,
            },
        }).catch((err) => {
            if (err?.isAbort) {
                return; // silently ignore aborted pending requests
            }
            throw err;
        });
    }

    private getNonEmptySubscriptionTopics(): Array<string> {
        const result : Array<string> = [];

        for (let topic in this.subscriptions) {
            if (this.subscriptions[topic].length) {
                result.push(topic);
            }
        }

        return result;
    }

    private addAllSubscriptionListeners(): void {
        if (!this.eventSource) {
            return;
        }

        this.removeAllSubscriptionListeners();

        for (let topic in this.subscriptions) {
            for (let listener of this.subscriptions[topic]) {
                this.eventSource.addEventListener(topic, listener);
            }
        }
    }

    private removeAllSubscriptionListeners(): void {
        if (!this.eventSource) {
            return;
        }

        for (let topic in this.subscriptions) {
            for (let listener of this.subscriptions[topic]) {
                this.eventSource.removeEventListener(topic, listener);
            }
        }
    }

    private async connect(): Promise<void> {
        if (this.reconnectAttempts > 0)  {
            // immediately resolve the promise to avoid indefinitely
            // blocking the client during reconnection
            return;
        }

        return new Promise((resolve, reject) => {
            this.pendingConnects.push({ resolve, reject });

            if (this.pendingConnects.length > 1) {
                // all promises will be resolved once the connection is established
                return;
            }

            this.initConnect();
        })
    }

    private initConnect() {
        this.disconnect(true);

        // wait up to 15s for connect
        clearTimeout(this.connectTimeoutId);
        this.connectTimeoutId = setTimeout(() => {
            this.connectErrorHandler(new Error("EventSource connect took too long."));
        }, this.maxConnectTimeout);

        this.eventSource = new EventSource(this.client.buildUrl('/api/realtime'))

        this.eventSource.onerror = (_) => {
            this.connectErrorHandler(new Error("Failed to establish realtime connection."));
        };

        this.eventSource.addEventListener('PB_CONNECT', (e) => {
            const msgEvent = (e as MessageEvent);
            this.clientId = msgEvent?.lastEventId;

            this.submitSubscriptions()
            .then(async () => {
                let retries = 3;
                while (this.hasUnsentSubscriptions() && retries > 0) {
                    retries--;
                    // resubscribe to ensure that the latest topics are submitted
                    //
                    // This is needed because missed topics could happen on reconnect
                    // if after the pending sent `submitSubscriptions()` call another `subscribe()`
                    // was made before the submit was able to complete.
                    await this.submitSubscriptions();
                }
            }).then(() => {
                for (let p of this.pendingConnects) {
                    p.resolve();
                }

                // reset connect meta
                this.pendingConnects = [];
                this.reconnectAttempts = 0;
                clearTimeout(this.reconnectTimeoutId);
                clearTimeout(this.connectTimeoutId);
            }).catch((err) => {
                this.clientId = "";
                this.connectErrorHandler(err);
            });
        });
    }

    private hasUnsentSubscriptions(): boolean {
        const latestTopics = this.getNonEmptySubscriptionTopics();
        if (latestTopics.length != this.lastSentTopics.length) {
            return true;
        }

        for (const t of latestTopics) {
            if (!this.lastSentTopics.includes(t)) {
                return true;
            }
        }

        return false;
    }

    private connectErrorHandler(err: any) {
        clearTimeout(this.connectTimeoutId);
        clearTimeout(this.reconnectTimeoutId);

        if (
            // wasn't previously connected -> direct reject
            (!this.clientId && !this.reconnectAttempts) ||
            // was previously connected but the max reconnection limit has been reached
            this.reconnectAttempts > this.maxReconnectAttempts
        ) {
            for (let p of this.pendingConnects) {
                p.reject(new ClientResponseError(err));
            }
            this.disconnect();
            return;
        }

        // otherwise -> reconnect in the background
        this.disconnect(true);
        const timeout = this.predefinedReconnectIntervals[this.reconnectAttempts] || this.predefinedReconnectIntervals[this.predefinedReconnectIntervals.length - 1];
        this.reconnectAttempts++;
        this.reconnectTimeoutId = setTimeout(() => {
            this.initConnect();
        }, timeout);
    }

    private disconnect(fromReconnect = false): void {
        clearTimeout(this.connectTimeoutId);
        clearTimeout(this.reconnectTimeoutId);
        this.removeAllSubscriptionListeners();
        this.eventSource?.close();
        this.eventSource = null;
        this.clientId = "";

        if (!fromReconnect) {
            this.reconnectAttempts = 0;

            // reject any remaining connect promises
            const err = new ClientResponseError(new Error("Realtime disconnected."));
            for (let p of this.pendingConnects) {
                p.reject(err);
            }
            this.pendingConnects = [];
        }
    }
}
