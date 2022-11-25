import { cookieParse, cookieSerialize, SerializeOptions } from '@/stores/utils/cookie';
import { isTokenExpired, getTokenPayload } from '@/stores/utils/jwt';
import Record  from '@/models/Record';
import Admin from '@/models/Admin';

export type OnStoreChangeFunc = (token: string, model: Record|Admin|null) => void;

const defaultCookieKey = 'pb_auth';

/**
 * Base AuthStore class that is intended to be extended by all other
 * PocketBase AuthStore implementations.
 */
export default abstract class BaseAuthStore {
    protected baseToken: string = '';
    protected baseModel: Record|Admin|null = null;

    private _onChangeCallbacks: Array<OnStoreChangeFunc> = [];

    /**
     * Retrieves the stored token (if any).
     */
    get token(): string {
        return this.baseToken;
    }

    /**
     * Retrieves the stored model data (if any).
     */
    get model(): Record|Admin|null {
        return this.baseModel;
    }

    /**
     * Loosely checks if the store has valid token (aka. existing and unexpired exp claim).
     */
    get isValid(): boolean {
        return !isTokenExpired(this.token);
    }

    /**
     * Saves the provided new token and model data in the auth store.
     */
    save(token: string, model: Record|Admin|null): void {
        this.baseToken = token || '';

        // normalize the model instance
        if (model !== null && typeof model === 'object') {
            this.baseModel = typeof (model as any).collectionId !== 'undefined' ?
                new Record(model) : new Admin(model);
        } else {
            this.baseModel = null;
        }

        this.triggerChange();
    }

    /**
     * Removes the stored token and model data form the auth store.
     */
    clear(): void {
        this.baseToken = '';
        this.baseModel = null;
        this.triggerChange();
    }

    /**
     * Parses the provided cookie string and updates the store state
     * with the cookie's token and model data.
     *
     * NB! This function doesn't validate the token or its data.
     * Usually this isn't a concern if you are interacting only with the
     * PocketBase API because it has the proper server-side security checks in place,
     * but if you are using the store `isValid` state for permission controls
     * in a node server (eg. SSR), then it is recommended to call `authRefresh()`
     * after loading the cookie to ensure an up-to-date token and model state.
     * For example:
     *
     * ```js
     * pb.authStore.loadFromCookie("cookie string...");
     *
     * try {
     *     // get an up-to-date auth store state by veryfing and refreshing the loaded auth model (if any)
     *     pb.authStore.isValid && await pb.collection('users').authRefresh();
     * } catch (_) {
     *     // clear the auth store on failed refresh
     *     pb.authStore.clear();
     * }
     * ```
     */
    loadFromCookie(cookie: string, key = defaultCookieKey): void {
        const rawData = cookieParse(cookie || '')[key] || '';

        let data: { [key: string]: any } = {};
        try {
            data = JSON.parse(rawData);
            // normalize
            if (typeof data === null || typeof data !== 'object' || Array.isArray(data)) {
                data = {};
            }
        } catch (_) {}

        this.save(data.token || '', data.model || null);
    }

    /**
     * Exports the current store state as cookie string.
     *
     * By default the following optional attributes are added:
     * - Secure
     * - HttpOnly
     * - SameSite=Strict
     * - Path=/
     * - Expires={the token expiration date}
     *
     * NB! If the generated cookie exceeds 4096 bytes, this method will
     * strip the model data to the bare minimum to try to fit within the
     * recommended size in https://www.rfc-editor.org/rfc/rfc6265#section-6.1.
     */
    exportToCookie(options?: SerializeOptions, key = defaultCookieKey): string {
        const defaultOptions: SerializeOptions = {
            secure:   true,
            sameSite: true,
            httpOnly: true,
            path:     "/",
        };

        // extract the token expiration date
        const payload = getTokenPayload(this.token);
        if (payload?.exp) {
            defaultOptions.expires = new Date(payload.exp * 1000);
        } else {
            defaultOptions.expires = new Date('1970-01-01');
        }

        // merge with the user defined options
        options = Object.assign({}, defaultOptions, options);

        const rawData = {
            token: this.token,
            model: this.model?.export() || null,
        };

        let result = cookieSerialize(key, JSON.stringify(rawData), options);

        const resultLength = typeof Blob !== 'undefined' ?
            (new Blob([result])).size : result.length;

        // strip down the model data to the bare minimum
        if (rawData.model && resultLength > 4096) {
            rawData.model = {id: rawData?.model?.id, email: rawData?.model?.email};
            if (this.model instanceof Record) {
                rawData.model.username     = this.model.username;
                rawData.model.verified     = this.model.verified;
                rawData.model.collectionId = this.model.collectionId;
            }
            result = cookieSerialize(key, JSON.stringify(rawData), options);
        }

        return result;
    }

    /**
     * Register a callback function that will be called on store change.
     *
     * You can set the `fireImmediately` argument to true in order to invoke
     * the provided callback right after registration.
     *
     * Returns a removal function that you could call to "unsubscribe" from the changes.
     */
    onChange(callback: OnStoreChangeFunc, fireImmediately = false): () => void {
        this._onChangeCallbacks.push(callback);

        if (fireImmediately) {
            callback(this.token, this.model);
        }

        return () => {
            for (let i = this._onChangeCallbacks.length - 1; i >= 0; i--) {
                if (this._onChangeCallbacks[i] == callback) {
                    delete this._onChangeCallbacks[i];    // removes the function reference
                    this._onChangeCallbacks.splice(i, 1); // reindex the array
                    return;
                }
            }
        }
    }

    protected triggerChange(): void {
        for (const callback of this._onChangeCallbacks) {
            callback && callback(this.token, this.model);
        }
    }
}
