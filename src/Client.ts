import ClientResponseError from '@/ClientResponseError';
import BaseAuthStore       from '@/stores/BaseAuthStore';
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
    /**
     * The base PocketBase backend url address (eg. 'http://127.0.0.1.8090').
     */
    baseUrl: string;

    /**
     * Hook that get triggered right before sending the fetch request,
     * allowing you to inspect/modify the request config.
     *
     * Returns the new modified config that will be used to send the request.
     *
     * For list of the possible options check https://developer.mozilla.org/en-US/docs/Web/API/fetch#options
     *
     * Example:
     * ```js
     * client.beforeSend = function (url, reqConfig) {
     *     reqConfig.headers = Object.assign({}, reqConfig.headers, {
     *         'X-Custom-Header': 'example',
     *     });
     *
     *     return reqConfig;
     * };
     * ```
     */
    beforeSend?: (url: string, reqConfig: { [key: string]: any }) => { [key: string]: any };

    /**
     * Hook that get triggered after successfully sending the fetch request,
     * allowing you to inspect/modify the response object and its parsed data.
     *
     * Returns the new Promise resolved `data` that will be returned to the client.
     *
     * Example:
     * ```js
     * client.afterSend = function (response, data) {
     *     if (response.status != 200) {
     *         throw new ClientResponseError({
     *             url:      response.url,
     *             status:   response.status,
     *             data:     data,
     *         });
     *     }
     *
     *     return data;
     * };
     * ```
     */
    afterSend?: (response: Response, data: any) => any;

    /**
     * Optional language code (default to `en-US`) that will be sent
     * with the requests to the server as `Accept-Language` header.
     */
    lang: string;

    /**
     * A replaceable instance of the local auth store service.
     */
    authStore: BaseAuthStore;

    /**
     * An instance of the service that handles the **Settings APIs**.
     */
    readonly settings: Settings;

    /**
     * An instance of the service that handles the **Admin APIs**.
     */
    readonly admins: Admins;

    /**
     * An instance of the service that handles the **User APIs**.
     */
    readonly users: Users;

    /**
     * An instance of the service that handles the **Collection APIs**.
     */
    readonly collections: Collections;

    /**
     * An instance of the service that handles the **Record APIs**.
     */
    readonly records: Records;

    /**
     * An instance of the service that handles the **Log APIs**.
     */
    readonly logs: Logs;

    /**
     * An instance of the service that handles the **Realtime APIs**.
     */
    readonly realtime: Realtime;

    private cancelControllers: { [key: string]: AbortController } = {}

    constructor(
        baseUrl = '/',
        lang = 'en-US',
        authStore?: BaseAuthStore | null,
    ) {
        this.baseUrl   = baseUrl;
        this.lang      = lang;
        this.authStore = authStore || new LocalAuthStore();

        // services
        this.admins      = new Admins(this);
        this.users       = new Users(this);
        this.records     = new Records(this);
        this.collections = new Collections(this);
        this.logs        = new Logs(this);
        this.settings    = new Settings(this);
        this.realtime    = new Realtime(this);
    }

    /**
     * @deprecated Legacy alias for `this.authStore`.
     */
    get AuthStore(): BaseAuthStore {
        return this.authStore;
    };

    /**
     * @deprecated Legacy alias for `this.settings`.
     */
    get Settings(): Settings {
        return this.settings;
    };

    /**
     * @deprecated Legacy alias for `this.admins`.
     */
    get Admins(): Admins {
        return this.admins;
    };

    /**
     * @deprecated Legacy alias for `this.users`.
     */
    get Users(): Users {
        return this.users;
    };

    /**
     * @deprecated Legacy alias for `this.collections`.
     */
    get Collections(): Collections {
        return this.collections;
    };

    /**
     * @deprecated Legacy alias for `this.records`.
     */
    get Records(): Records {
        return this.records;
    };

    /**
     * @deprecated Legacy alias for `this.logs`.
     */
    get Logs(): Logs {
        return this.logs;
    };

    /**
     * @deprecated Legacy alias for `this.realtime`.
     */
    get Realtime(): Realtime {
        return this.realtime;
    };

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
    async send(path: string, reqConfig: { [key: string]: any }): Promise<any> {
        let config = Object.assign({ method: 'GET' } as { [key: string]: any }, reqConfig);

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
            this.authStore?.token &&
            // auth header is not explicitly set
            (typeof config?.headers?.Authorization === 'undefined')
        ) {
            let authType = 'Admin';
            if (typeof (this.authStore.model as any)?.verified !== 'undefined') {
                authType = 'User'; // admins don't have verified
            }

            config.headers = Object.assign({}, config.headers, {
                'Authorization': (authType + ' ' + this.authStore.token),
            });
        }

        // handle auto cancelation for duplicated pending request
        if (config.params?.$autoCancel !== false) {
            const cancelKey = config.params?.$cancelKey || ((config.method || 'GET') + path);

            // cancel previous pending requests
            this.cancelRequest(cancelKey);

            const controller = new AbortController();
            this.cancelControllers[cancelKey] = controller;
            config.signal = controller.signal;
        }
        // remove the special cancellation params from the other valid query params
        delete config.params?.$autoCancel;
        delete config.params?.$cancelKey;

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

        if (this.beforeSend) {
            config = Object.assign({}, this.beforeSend(url, config));
        }

        // send the request
        return fetch(url, config)
            .then(async (response) => {
                let data : any = {};

                try {
                    data = await response.json();
                } catch (_) {
                    // all api responses are expected to return json
                    // with the exception of the realtime event and 204
                }

                if (this.afterSend) {
                    data = this.afterSend(response, data);
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
                // wrap to normalize all errors
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
