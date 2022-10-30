import ClientResponseError from '@/ClientResponseError';
import BaseAuthStore       from '@/stores/BaseAuthStore';
import LocalAuthStore      from '@/stores/LocalAuthStore';
import SettingsService     from '@/services/SettingsService';
import AdminService        from '@/services/AdminService';
import RecordService       from '@/services/RecordService';
import CollectionService   from '@/services/CollectionService';
import LogService          from '@/services/LogService';
import RealtimeService     from '@/services/RealtimeService';
import Record              from '@/models/Record';

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
    readonly settings: SettingsService;

    /**
     * An instance of the service that handles the **Admin APIs**.
     */
    readonly admins: AdminService;

    /**
     * An instance of the service that handles the **Collection APIs**.
     */
    readonly collections: CollectionService;

    /**
     * An instance of the service that handles the **Log APIs**.
     */
    readonly logs: LogService;

    /**
     * An instance of the service that handles the **Realtime APIs**.
     */
    readonly realtime: RealtimeService;

    private cancelControllers: { [key: string]: AbortController } = {};
    private recordServices: { [key: string]: RecordService } = {};
    private enableAutoCancellation: boolean = true;

    constructor(
        baseUrl = '/',
        authStore?: BaseAuthStore | null,
        lang = 'en-US',
    ) {
        this.baseUrl   = baseUrl;
        this.lang      = lang;
        this.authStore = authStore || new LocalAuthStore();

        // services
        this.admins      = new AdminService(this);
        this.collections = new CollectionService(this);
        this.logs        = new LogService(this);
        this.settings    = new SettingsService(this);
        this.realtime    = new RealtimeService(this);
    }

    /**
     * Returns the RecordService associated to the specified collection.
     *
     * @param  {string} idOrName
     * @return {RecordService}
     */
    collection(idOrName: string): RecordService {
        if (!this.recordServices[idOrName]) {
            this.recordServices[idOrName] = new RecordService(this, idOrName);
        }

        return this.recordServices[idOrName];
    }

    /**
     * Globally enable or disable auto cancellation for pending duplicated requests.
     */
    autoCancellation(enable: boolean): Client {
        this.enableAutoCancellation = !!enable;

        return this;
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
            config.headers = Object.assign({}, config.headers, {
                'Authorization': this.authStore.token,
            });
        }

        // handle auto cancelation for duplicated pending request
        if (this.enableAutoCancellation && config.params?.$autoCancel !== false) {
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
     * Builds and returns an absolute record file url for the provided filename.
     */
    getFileUrl(record: Record, filename: string, queryParams = {}): string {
        const parts = [];
        parts.push("api")
        parts.push("files")
        parts.push(encodeURIComponent(record.collectionId || record.collectionName))
        parts.push(encodeURIComponent(record.id))
        parts.push(encodeURIComponent(filename))

        let result = this.buildUrl(parts.join('/'));

        if (Object.keys(queryParams).length) {
            const params = new URLSearchParams(queryParams);
            result += (result.includes("?") ? "&" : "?") + params;
        }

        return result
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
