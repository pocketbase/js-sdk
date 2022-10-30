import BaseAuthStore from '@/stores/BaseAuthStore';
import Record        from '@/models/Record';
import Admin         from '@/models/Admin';

/**
 * The default token store for browsers with auto fallback
 * to runtime/memory if local storage is undefined (eg. in node env).
 */
export default class LocalAuthStore extends BaseAuthStore {
    private storageFallback: { [key: string]: any } = {};
    private storageKey: string

    constructor(storageKey = "pocketbase_auth") {
        super();

        this.storageKey = storageKey;
    }

    /**
     * @inheritdoc
     */
    get token(): string {
        const data = this._storageGet(this.storageKey) || {};

        return data.token || '';
    }

    /**
     * @inheritdoc
     */
    get model(): Record|Admin|null {
        const data = this._storageGet(this.storageKey) || {};

        if (
            data === null ||
            typeof data !== 'object' ||
            data.model === null ||
            typeof data.model !== 'object'
        ) {
            return null;
        }

        // admins don't have `collectionId` prop
        if (typeof data.model?.collectionId === 'undefined') {
            return new Admin(data.model);
        }

        return new Record(data.model);
    }

    /**
     * @inheritdoc
     */
    save(token: string, model: Record|Admin|null) {
        this._storageSet(this.storageKey, {
            'token': token,
            'model': model,
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
        if (typeof window !== 'undefined' && window?.localStorage) {
            const rawValue = window.localStorage.getItem(key) || '';
            try {
                return JSON.parse(rawValue);
            } catch (e) { // not a json
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
        if (typeof window !== 'undefined' && window?.localStorage) {
            // store in local storage
            let normalizedVal = value;
            if (typeof value !== 'string') {
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
        if (typeof window !== 'undefined' && window?.localStorage) {
            window.localStorage?.removeItem(key);
        }

        // delete from fallback
        delete this.storageFallback[key];
    }
}
