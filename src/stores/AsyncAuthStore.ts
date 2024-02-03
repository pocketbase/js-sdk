import { BaseAuthStore, AuthModel } from "@/stores/BaseAuthStore";

export type AsyncSaveFunc = (serializedPayload: string) => Promise<void>;

export type AsyncClearFunc = () => Promise<void>;

type queueFunc = () => Promise<void>;

/**
 * AsyncAuthStore is a helper auth store implementation
 * that could be used with any external async persistent layer
 * (key-value db, local file, etc.).
 *
 * Here is an example with the React Native AsyncStorage package:
 *
 * ```
 * import AsyncStorage from "@react-native-async-storage/async-storage";
 * import PocketBase, { AsyncAuthStore } from "pocketbase";
 *
 * const store = new AsyncAuthStore({
 *     save:    async (serialized) => AsyncStorage.setItem("pb_auth", serialized),
 *     initial: AsyncStorage.getItem("pb_auth"),
 * });
 *
 * const pb = new PocketBase("https://example.com", store)
 * ```
 */
export class AsyncAuthStore extends BaseAuthStore {
    private saveFunc: AsyncSaveFunc;
    private clearFunc?: AsyncClearFunc;
    private queue: Array<queueFunc> = [];

    constructor(config: {
        // The async function that is called every time
        // when the auth store state needs to be persisted.
        save: AsyncSaveFunc;

        /// An *optional* async function that is called every time
        /// when the auth store needs to be cleared.
        ///
        /// If not explicitly set, `saveFunc` with empty data will be used.
        clear?: AsyncClearFunc;

        // An *optional* initial data to load into the store.
        initial?: string | Promise<any>;
    }) {
        super();

        this.saveFunc = config.save;
        this.clearFunc = config.clear;

        this._enqueue(() => this._loadInitial(config.initial));
    }

    /**
     * @inheritdoc
     */
    save(token: string, model?: AuthModel): void {
        super.save(token, model);

        let value = "";
        try {
            value = JSON.stringify({ token, model });
        } catch (err) {
            console.warn("AsyncAuthStore: failed to stringify the new state");
        }

        this._enqueue(() => this.saveFunc(value));
    }

    /**
     * @inheritdoc
     */
    clear(): void {
        super.clear();

        if (this.clearFunc) {
            this._enqueue(() => this.clearFunc!());
        } else {
            this._enqueue(() => this.saveFunc(""));
        }
    }

    /**
     * Initializes the auth store state.
     */
    private async _loadInitial(payload?: string | Promise<any>) {
        try {
            payload = await payload;

            if (payload) {
                let parsed;
                if (typeof payload === "string") {
                    parsed = JSON.parse(payload) || {};
                } else if (typeof payload === "object") {
                    parsed = payload;
                }

                this.save(parsed.token || "", parsed.model || null);
            }
        } catch (_) {}
    }

    /**
     * Appends an async function to the queue.
     */
    private _enqueue(asyncCallback: () => Promise<void>) {
        this.queue.push(asyncCallback);

        if (this.queue.length == 1) {
            this._dequeue();
        }
    }

    /**
     * Starts the queue processing.
     */
    private _dequeue() {
        if (!this.queue.length) {
            return;
        }

        this.queue[0]().finally(() => {
            this.queue.shift();

            if (!this.queue.length) {
                return;
            }

            this._dequeue();
        });
    }
}
