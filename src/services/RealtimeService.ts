import BaseService from '@/services/utils/BaseService';

export default class RealtimeService extends BaseService {
    private clientId: string = "";
    private eventSource: EventSource | null = null;
    private subscriptions: { [key: string]: EventListener } = {};

    /**
     * Inits the sse connection (if not already) and register the subscription.
     */
    async subscribe(subscription: string, callback: (data: any) => void): Promise<void> {
        if (!subscription) {
            throw new Error('subscription must be set.')
        }

        // unsubscribe existing
        if (this.subscriptions[subscription]) {
            this.eventSource?.removeEventListener(subscription, this.subscriptions[subscription]);
        }

        // register subscription
        this.subscriptions[subscription] = function (e: Event) {
            const msgEvent = (e as MessageEvent);

            let data;
            try {
                data = JSON.parse(msgEvent?.data);
            } catch {}

            callback(data || {});
        }

        if (!this.eventSource) {
            // start a new sse connection
            this.connect();
        } else if (this.clientId) {
            // otherwise - just persist the updated subscriptions
            await this.submitSubscriptions();
        }
    }

    /**
     * Unsubscribe from all subscriptions starting with the provided prefix.
     *
     * This method is no-op if there are no active subscriptions with the provided prefix.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operation there are no active subscriptions left.
     */
    async unsubscribeByPrefix(subscriptionPrefix: string): Promise<void> {
        const toUnsubscribe = [];
        for (let sub in this.subscriptions) {
            if (sub.startsWith(subscriptionPrefix)) {
                toUnsubscribe.push(sub);
            }
        }

        if (!toUnsubscribe.length) {
            return;
        }

        return this.unsubscribe(...toUnsubscribe);
    }

    /**
     * Unsubscribe from the specified subscription(s).
     *
     * If the `subscriptions` argument is not set,
     * then the client will unsubscribe from all registered subscriptions.
     *
     * The related sse connection will be autoclosed if after the
     * unsubscribe operations there are no active subscriptions left.
     */
    async unsubscribe(...subscriptions: Array<string>): Promise<void> {
        if (!subscriptions || subscriptions.length == 0) {
            // remove all subscriptions
            this.removeSubscriptionListeners();
            this.subscriptions = {};
        } else {
            // remove each passed subscription
            let found = false;
            for (let sub of subscriptions) {
                found = true;
                this.eventSource?.removeEventListener(sub, this.subscriptions[sub]);
                delete this.subscriptions[sub];
            }
            if (!found) {
                // not subscribed to any of specified subscriptions
                return;
            }
        }

        if (this.clientId) {
            await this.submitSubscriptions();
        }

        // no more subscriptions -> close the sse connection
        if (!Object.keys(this.subscriptions).length) {
            this.disconnect();
        }
    }

    private async submitSubscriptions(): Promise<boolean> {
        // optimistic update
        this.addSubscriptionListeners();

        return this.client.send('/api/realtime', {
            'method': 'POST',
            'body': {
                'clientId': this.clientId,
                'subscriptions': Object.keys(this.subscriptions),
            },
            'params': {
                '$autoCancel': false,
            },
        }).then(() => true);
    }

    private addSubscriptionListeners(): void {
        if (!this.eventSource) {
            return;
        }

        this.removeSubscriptionListeners();

        for (let sub in this.subscriptions) {
            this.eventSource.addEventListener(sub, this.subscriptions[sub]);
        }
    }

    private removeSubscriptionListeners(): void {
        if (!this.eventSource) {
            return;
        }

        for (let sub in this.subscriptions) {
            this.eventSource.removeEventListener(sub, this.subscriptions[sub]);
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
        this.removeSubscriptionListeners();
        this.eventSource?.removeEventListener('PB_CONNECT', (e) => this.connectHandler(e));
        this.eventSource?.close();
        this.eventSource = null;
        this.clientId = "";
    }
}
