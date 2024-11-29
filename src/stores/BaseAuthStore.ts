import { cookieParse, cookieSerialize, SerializeOptions } from "@/tools/cookie";
import { isTokenExpired, getTokenPayload } from "@/tools/jwt";
import { RecordModel } from "@/tools/dtos";

export type AuthRecord = RecordModel | null;

export type AuthModel = AuthRecord; // for backward compatibility

export type OnStoreChangeFunc = (token: string, record: AuthRecord) => void;

const defaultCookieKey = "pb_auth";

/**
 * Base AuthStore class that stores the auth state in runtime memory (aka. only for the duration of the store instane).
 *
 * Usually you wouldn't use it directly and instead use the builtin LocalAuthStore, AsyncAuthStore
 * or extend it with your own custom implementation.
 */
export class BaseAuthStore {
    protected baseToken: string = "";
    protected baseModel: AuthRecord = null;

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
    get record(): AuthRecord {
        return this.baseModel;
    }

    /**
     * @deprecated use `record` instead.
     */
    get model(): AuthRecord {
        return this.baseModel;
    }

    /**
     * Loosely checks if the store has valid token (aka. existing and unexpired exp claim).
     */
    get isValid(): boolean {
        return !isTokenExpired(this.token);
    }

    /**
     * Loosely checks whether the currently loaded store state is for superuser.
     *
     * Alternatively you can also compare directly `pb.authStore.record?.collectionName`.
     */
    get isSuperuser(): boolean {
        let payload = getTokenPayload(this.token)

        return payload.type == "auth" && (
            this.record?.collectionName == "_superusers" ||
            // fallback in case the record field is not populated and assuming
            // that the collection crc32 checksum id wasn't manually changed
            (!this.record?.collectionName && payload.collectionId == "pbc_3142635823")
        );
    }

    /**
     * @deprecated use `isSuperuser` instead or simply check the record.collectionName property.
     */
    get isAdmin(): boolean {
        console.warn("Please replace pb.authStore.isAdmin with pb.authStore.isSuperuser OR simply check the value of pb.authStore.record?.collectionName");
        return this.isSuperuser;
    }

    /**
     * @deprecated use `!isSuperuser` instead or simply check the record.collectionName property.
     */
    get isAuthRecord(): boolean {
        console.warn("Please replace pb.authStore.isAuthRecord with !pb.authStore.isSuperuser OR simply check the value of pb.authStore.record?.collectionName");
        return getTokenPayload(this.token).type == "auth" && !this.isSuperuser;
    }

    /**
     * Saves the provided new token and model data in the auth store.
     */
    save(token: string, record?: AuthRecord): void {
        this.baseToken = token || "";
        this.baseModel = record || null;

        this.triggerChange();
    }

    /**
     * Removes the stored token and model data form the auth store.
     */
    clear(): void {
        this.baseToken = "";
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
        const rawData = cookieParse(cookie || "")[key] || "";

        let data: { [key: string]: any } = {};
        try {
            data = JSON.parse(rawData);
            // normalize
            if (typeof data === null || typeof data !== "object" || Array.isArray(data)) {
                data = {};
            }
        } catch (_) {}

        this.save(data.token || "", data.record || data.model || null);
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
            secure: true,
            sameSite: true,
            httpOnly: true,
            path: "/",
        };

        // extract the token expiration date
        const payload = getTokenPayload(this.token);
        if (payload?.exp) {
            defaultOptions.expires = new Date(payload.exp * 1000);
        } else {
            defaultOptions.expires = new Date("1970-01-01");
        }

        // merge with the user defined options
        options = Object.assign({}, defaultOptions, options);

        const rawData = {
            token: this.token,
            record: this.record ? JSON.parse(JSON.stringify(this.record)) : null,
        };

        let result = cookieSerialize(key, JSON.stringify(rawData), options);

        const resultLength =
            typeof Blob !== "undefined" ? new Blob([result]).size : result.length;

        // strip down the model data to the bare minimum
        if (rawData.record && resultLength > 4096) {
            rawData.record = { id: rawData.record?.id, email: rawData.record?.email };
            const extraProps = ["collectionId", "collectionName", "verified"];
            for (const prop in this.record) {
                if (extraProps.includes(prop)) {
                    rawData.record[prop] = this.record[prop];
                }
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
            callback(this.token, this.record);
        }

        return () => {
            for (let i = this._onChangeCallbacks.length - 1; i >= 0; i--) {
                if (this._onChangeCallbacks[i] == callback) {
                    delete this._onChangeCallbacks[i]; // removes the function reference
                    this._onChangeCallbacks.splice(i, 1); // reindex the array
                    return;
                }
            }
        };
    }

    protected triggerChange(): void {
        for (const callback of this._onChangeCallbacks) {
            callback && callback(this.token, this.record);
        }
    }
}
