import { BaseAuthStore, AuthModel } from "@/stores/BaseAuthStore";

/**
 * The default token store for browsers with auto fallback
 * to runtime/memory if local storage is undefined (eg. in node env).
 */
export class LocalAuthStore extends BaseAuthStore {
    private storageFallback: { [key: string]: any } = {};
    private storageKey: string;

    constructor(storageKey = "pocketbase_auth") {
        super();

        this.storageKey = storageKey;

        this._bindStorageEvent();
    }

    /**
     * @inheritdoc
     */
    get token(): string {
        const data = this._storageGet(this.storageKey) || {};

        return data.token || "";
    }

    /**
     * @inheritdoc
     */
    get model(): AuthModel {
        const data = this._storageGet(this.storageKey) || {};

        return data.model || null;
    }

    /**
     * @inheritdoc
     */
    save(token: string, model?: AuthModel) {
        this._storageSet(this.storageKey, {
            token: token,
            model: model,
        });

        super.save(token, model);
    }

    /**
     * @inheritdoc
     */
    clear() {
        this._storageRemove(this.storageKey);

        super.clear();
    }

    // ---------------------------------------------------------------
    // Internal helpers:
    // ---------------------------------------------------------------

    /**
     * Retrieves `key` from the browser's local storage
     * (or runtime/memory if local storage is undefined).
     */
    private _storageGet(key: string): any {
        if (typeof window !== "undefined" && window?.localStorage) {
            const rawValue = window.localStorage.getItem(key) || "";
            try {
                return JSON.parse(rawValue);
            } catch (e) {
                // not a json
                return rawValue;
            }
        }

        // fallback
        return this.storageFallback[key];
    }

    /**
     * Stores a new data in the browser's local storage
     * (or runtime/memory if local storage is undefined).
     */
    private _storageSet(key: string, value: any) {
        if (typeof window !== "undefined" && window?.localStorage) {
            // store in local storage
            let normalizedVal = value;
            if (typeof value !== "string") {
                normalizedVal = JSON.stringify(value);
            }
            window.localStorage.setItem(key, normalizedVal);
        } else {
            // store in fallback
            this.storageFallback[key] = value;
        }
    }

    /**
     * Removes `key` from the browser's local storage and the runtime/memory.
     */
    private _storageRemove(key: string) {
        // delete from local storage
        if (typeof window !== "undefined" && window?.localStorage) {
            window.localStorage?.removeItem(key);
        }

        // delete from fallback
        delete this.storageFallback[key];
    }

    /**
     * Updates the current store state on localStorage change.
     */
    private _bindStorageEvent() {
        if (
            typeof window === "undefined" ||
            !window?.localStorage ||
            !window.addEventListener
        ) {
            return;
        }

        window.addEventListener("storage", (e) => {
            if (e.key != this.storageKey) {
                return;
            }

            const data = this._storageGet(this.storageKey) || {};

            super.save(data.token || "", data.model || null);
        });
    }
}
