import { AuthStore } from '@/stores/utils/AuthStore';
import JWT           from '@/stores/utils/JWT';
import User          from '@/models/User';
import Admin         from '@/models/Admin';

/**
 * Default token store for browsers with auto fallback
 * to runtime/memory if local storage is undefined (eg. node env).
 */
export default class LocalAuthStore implements AuthStore {
    private fallback: { [key: string]: any } = {};
    private storageKey: string

    constructor(storageKey = "pocketbase_auth") {
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
    get model(): User | Admin | {} {
        const data = this._storageGet(this.storageKey) || {};

        if (
            data === null ||
            typeof data !== 'object' ||
            data.model === null ||
            typeof data.model !== 'object'
        ) {
            return {};
        }

        // admins don't have `verified` prop
        if (typeof data.model?.verified !== 'undefined') {
            return new User(data.model);
        }

        return new Admin(data.model);
    }

    /**
     * @inheritdoc
     */
    get isValid(): boolean {
        return !JWT.isExpired(this.token);
    }

    /**
     * @inheritdoc
     */
    save(token: string, model: User | Admin | {}) {
        this._storageSet(this.storageKey, {
            'token': token,
            'model': model,
        });
    }

    /**
     * @inheritdoc
     */
    clear() {
        return this._storageRemove(this.storageKey);
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
            const rawValue = window?.localStorage?.getItem(key) || '';
            try {
                return JSON.parse(rawValue);
            } catch (e) { // not a json
                return rawValue;
            }
        }

        // fallback to runtime/memory
        return this.fallback[key];
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
            window?.localStorage?.setItem(key, normalizedVal);
        } else {
            // store in runtime/memory
            this.fallback[key] = value;
        }
    }

    /**
     * Removes `key` from the browser's local storage and the runtime/memory.
     */
    private _storageRemove(key: string) {
        // delete from local storage
        if (typeof window !== 'undefined') {
            window?.localStorage?.removeItem(key);
        }

        // delete from runtime/memory
        delete this.fallback[key];
    }
}
