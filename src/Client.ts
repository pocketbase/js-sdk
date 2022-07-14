import ClientResponseError from '@/ClientResponseError';
import { AuthStore }       from '@/stores/utils/AuthStore';
import LocalAuthStore      from '@/stores/LocalAuthStore';
import Settings            from '@/services/Settings';
import Admins              from '@/services/Admins';
import Users               from '@/services/Users';
import Collections         from '@/services/Collections';
import Records             from '@/services/Records';
import Logs                from '@/services/Logs';
import Realtime            from '@/services/Realtime';

/**
 * PocketBase JS Client.
 */
export default class Client {
    baseUrl:   string;
    lang:      string;
    AuthStore: AuthStore;

    readonly Settings:    Settings;
    readonly Admins:      Admins;
    readonly Users:       Users;
    readonly Collections: Collections;
    readonly Records:     Records;
    readonly Logs:        Logs;
    readonly Realtime:    Realtime;

    private cancelControllers: { [key: string]: AbortController } = {}

    constructor(
        baseUrl = '/',
        lang = 'en-US',
        authStore?: AuthStore | null,
    ) {
        this.baseUrl     = baseUrl;
        this.lang        = lang;
        this.AuthStore   = authStore || new LocalAuthStore();
        this.Settings    = new Settings(this);
        this.Admins      = new Admins(this);
        this.Users       = new Users(this);
        this.Collections = new Collections(this);
        this.Records     = new Records(this);
        this.Logs        = new Logs(this);
        this.Realtime    = new Realtime(this);
    }

    /**
     * Cancels single request by its cancellation key.
     */
    cancelRequest(cancelKey: string): Client {
        if (this.cancelControllers[cancelKey]) {
            this.cancelControllers[cancelKey].abort();
            delete this.cancelControllers[cancelKey];
        }

        return this;
    }

    /**
     * Cancels all pending requests.
     */
    cancelAllRequests(): Client {
        for (let k in this.cancelControllers) {
            this.cancelControllers[k].abort();
        }

        this.cancelControllers = {};

        return this;
    }

    /**
     * Sends an api http request.
     */
    send(path: string, reqConfig: { [key: string]: any }): Promise<any> {
        const config = Object.assign({}, reqConfig);

        // serialize the body if needed and set the correct content type
        // note1: for FormData body the Content-Type header should be skipped
        // note2: we are checking the constructor name because FormData is not available natively in node
        if (config.body && config.body.constructor.name !== 'FormData') {
            if (typeof config.body !== 'string') {
                config.body = JSON.stringify(config.body);
            }

            // add the json header (if not already)
            if (typeof config?.headers?.['Content-Type'] === 'undefined') {
                config.headers = Object.assign({}, config.headers, {
                    'Content-Type': 'application/json',
                });
            }
        }

        // add Accept-Language header (if not already)
        if (typeof config?.headers?.['Accept-Language'] === 'undefined') {
            config.headers = Object.assign({}, config.headers, {
                'Accept-Language': this.lang,
            });
        }

        // check if Authorization header can be added
        if (
            // has stored token
            this.AuthStore?.token &&
            // auth header is not explicitly set
            (typeof config?.headers?.Authorization === 'undefined')
        ) {
            let authType = 'Admin';
            if (typeof (this.AuthStore.model as any)?.verified !== 'undefined') {
                authType = 'User'; // admins don't have verified
            }

            config.headers = Object.assign({}, config.headers, {
                'Authorization': (authType + ' ' + this.AuthStore.token),
            });
        }

        // handle auto cancelation for duplicated pending request
        if (config?.params?.$autoCancel !== false) {
            const cancelKey = config?.params?.$cancelKey || ((config.method || 'GET') + path);

            // cancel previous pending requests
            this.cancelRequest(cancelKey);

            const controller = new AbortController();
            this.cancelControllers[cancelKey] = controller;
            config.signal = controller.signal;
        }
        // remove the special cancellation params from the other valid query params
        delete config?.params?.$autoCancel;
        delete config?.params?.$cancelKey;

        // build url + path
        let url = this.buildUrl(path);

        // serialize the query parameters
        if (typeof config.params !== 'undefined') {
            const query = this.serializeQueryParams(config.params)
            if (query) {
                url += (url.includes('?') ? '&' : '?') + query;
            }
            delete config.params;
        }

        // send the request
        return fetch(url, Object.assign({
            method: 'GET',
            mode:   ('cors' as RequestMode),
        }, config))
            .then(async (response) => {
                let data = {};

                try {
                    data = await response.json();
                } catch (_) {
                    // all api responses are expected to return json
                    // with the exception of the realtime event and 204
                }

                if (response.status >= 400) {
                    throw new ClientResponseError({
                        url:      response.url,
                        status:   response.status,
                        data:     data,
                    });
                }

                return data;
            }).catch((err) => {
                if (err instanceof ClientResponseError) {
                    throw err; // rethrow
                }

                // wrap any other error
                throw new ClientResponseError(err);
            });
    }

    /**
     * Builds a full client url by safely concatenating the provided path.
     */
    buildUrl(path: string): string {
        let url = this.baseUrl + (this.baseUrl.endsWith('/') ? '' : '/');
        if (path) {
            url += (path.startsWith('/') ? path.substring(1) : path);
        }
        return url;
    }

    /**
     * Serializes the provided query parameters into a query string.
     */
    private serializeQueryParams(params: {[key: string]: any}): string {
        const result: Array<string> = [];
        for (const key in params) {
            if (params[key] === null) {
                // skip null query params
                continue;
            }

            const value = params[key];
            const encodedKey = encodeURIComponent(key);

            if (Array.isArray(value)) {
                // "repeat" array params
                for (const v of value) {
                    result.push(encodedKey + "=" + encodeURIComponent(v));
                }
            } else if (value instanceof Date) {
                result.push(encodedKey + "=" + encodeURIComponent(value.toISOString()));
            } else if (typeof value !== null && typeof value === 'object') {
                result.push(encodedKey + "=" + encodeURIComponent(JSON.stringify(value)));
            } else {
                result.push(encodedKey + "=" + encodeURIComponent(value));
            }
        }

        return result.join('&');
    }
}
