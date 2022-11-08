import BaseService from '@/services/utils/BaseService';

export type UnsubscribeFunc = () => Promise<void>;

export default class RealtimeService extends BaseService {
    private clientId: string = "";
    private eventSource: EventSource | null = null;
    private subscriptions: { [key: string]: Array<EventListener> } = {};

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

        // register the listener
        if (!this.subscriptions[topic]) {
            this.subscriptions[topic] = [];
        }
        this.subscriptions[topic].push(listener);

        if (!this.eventSource) {
            // start a new sse connection
            this.connect();
        } else if (this.clientId && this.subscriptions[topic].length === 1) {
            // send the updated subscriptions (if it is the first for the topic)
            await this.submitSubscriptions();
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

    private async submitSubscriptions(): Promise<boolean> {
        if (!this.clientId) {
            return false;
        }

        // optimistic update
        this.addAllSubscriptionListeners();

        return this.client.send('/api/realtime', {
            'method': 'POST',
            'body': {
                'clientId': this.clientId,
                'subscriptions': Object.keys(this.subscriptions),
            },
            'params': {
                '$cancelKey': "realtime_subscriptions_" + this.clientId,
            },
        }).then(() => true).catch((err) => {
            if (err?.isAbort) {
                return true; // silently ignore aborted pending requests
            }
            throw err;
        });
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

    private connectHandler(e: Event): void {
        const msgEvent = (e as MessageEvent);
        this.clientId = msgEvent?.lastEventId;
        this.submitSubscriptions();
    }

    private connect(): void {
        this.disconnect();
        this.eventSource = new EventSource(this.client.buildUrl('/api/realtime'))
        this.eventSource.addEventListener('PB_CONNECT', (e) => this.connectHandler(e));
    }

    private disconnect(): void {
        this.removeAllSubscriptionListeners();
        this.eventSource?.removeEventListener('PB_CONNECT', (e) => this.connectHandler(e));
        this.eventSource?.close();
        this.eventSource = null;
        this.clientId = "";
    }
}
