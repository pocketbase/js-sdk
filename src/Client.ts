import { ClientResponseError } from "@/ClientResponseError";
import { BaseAuthStore } from "@/stores/BaseAuthStore";
import { LocalAuthStore } from "@/stores/LocalAuthStore";
import { SettingsService } from "@/services/SettingsService";
import { RecordService } from "@/services/RecordService";
import { CollectionService } from "@/services/CollectionService";
import { LogService } from "@/services/LogService";
import { RealtimeService } from "@/services/RealtimeService";
import { HealthService } from "@/services/HealthService";
import { FileService } from "@/services/FileService";
import { BackupService } from "@/services/BackupService";
import { CronService } from "@/services/CronService";
import { BatchService } from "@/services/BatchService";
import { RecordModel } from "@/tools/dtos";
import {
    SendOptions,
    FileOptions,
    normalizeUnknownQueryParams,
    serializeQueryParams,
} from "@/tools/options";
import { isFormData, convertToFormDataIfNeeded } from "@/tools/formdata";

export interface BeforeSendResult {
    [key: string]: any; // for backward compatibility
    url?: string;
    options?: { [key: string]: any };
}

/**
 * PocketBase JS Client.
 */
export default class Client {
    /**
     * The base PocketBase backend url address (eg. 'http://127.0.0.1.8090').
     */
    baseURL: string;

    /**
     * Legacy getter alias for baseURL.
     * @deprecated Please replace with baseURL.
     */
    get baseUrl(): string {
        return this.baseURL;
    }

    /**
     * Legacy setter alias for baseURL.
     * @deprecated Please replace with baseURL.
     */
    set baseUrl(v: string) {
        this.baseURL = v;
    }

    /**
     * Hook that get triggered right before sending the fetch request,
     * allowing you to inspect and modify the url and request options.
     *
     * For list of the possible options check https://developer.mozilla.org/en-US/docs/Web/API/fetch#options
     *
     * You can return a non-empty result object `{ url, options }` to replace the url and request options entirely.
     *
     * Example:
     * ```js
     * const pb = new PocketBase("https://example.com")
     *
     * pb.beforeSend = function (url, options) {
     *     options.headers = Object.assign({}, options.headers, {
     *         'X-Custom-Header': 'example',
     *     })
     *
     *     return { url, options }
     * }
     *
     * // use the created client as usual...
     * ```
     */
    beforeSend?: (
        url: string,
        options: SendOptions,
    ) => BeforeSendResult | Promise<BeforeSendResult>;

    /**
     * Hook that get triggered after successfully sending the fetch request,
     * allowing you to inspect/modify the response object and its parsed data.
     *
     * Returns the new Promise resolved `data` that will be returned to the client.
     *
     * Example:
     * ```js
     * const pb = new PocketBase("https://example.com")
     *
     * pb.afterSend = function (response, data, options) {
     *     if (response.status != 200) {
     *         throw new ClientResponseError({
     *             url:      response.url,
     *             status:   response.status,
     *             response: { ... },
     *         })
     *     }
     *
     *     return data;
     * }
     *
     * // use the created client as usual...
     * ```
     */
    afterSend?: ((response: Response, data: any) => any) &
        ((response: Response, data: any, options: SendOptions) => any);

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
     * An instance of the service that handles the **Collection APIs**.
     */
    readonly collections: CollectionService;

    /**
     * An instance of the service that handles the **File APIs**.
     */
    readonly files: FileService;

    /**
     * An instance of the service that handles the **Log APIs**.
     */
    readonly logs: LogService;

    /**
     * An instance of the service that handles the **Realtime APIs**.
     */
    readonly realtime: RealtimeService;

    /**
     * An instance of the service that handles the **Health APIs**.
     */
    readonly health: HealthService;

    /**
     * An instance of the service that handles the **Backup APIs**.
     */
    readonly backups: BackupService;

    /**
     * An instance of the service that handles the **Cron APIs**.
     */
    readonly crons: CronService;

    private cancelControllers: { [key: string]: AbortController } = {};
    private recordServices: { [key: string]: RecordService } = {};
    private enableAutoCancellation: boolean = true;

    constructor(baseURL = "/", authStore?: BaseAuthStore | null, lang = "en-US") {
        this.baseURL = baseURL;
        this.lang = lang;

        if (authStore) {
            this.authStore = authStore;
        } else if (typeof window != "undefined" && !!(window as any).Deno) {
            // note: to avoid common security issues we fallback to runtime/memory store in case the code is running in Deno env
            this.authStore = new BaseAuthStore();
        } else {
            this.authStore = new LocalAuthStore();
        }

        // common services
        this.collections = new CollectionService(this);
        this.files = new FileService(this);
        this.logs = new LogService(this);
        this.settings = new SettingsService(this);
        this.realtime = new RealtimeService(this);
        this.health = new HealthService(this);
        this.backups = new BackupService(this);
        this.crons = new CronService(this);
    }

    /**
     * @deprecated
     * With PocketBase v0.23.0 admins are converted to a regular auth
     * collection named "_superusers", aka. you can use directly collection("_superusers").
     */
    get admins(): RecordService {
        return this.collection("_superusers");
    }

    /**
     * Creates a new batch handler for sending multiple transactional
     * create/update/upsert/delete collection requests in one network call.
     *
     * Example:
     * ```js
     * const batch = pb.createBatch();
     *
     * batch.collection("example1").create({ ... })
     * batch.collection("example2").update("RECORD_ID", { ... })
     * batch.collection("example3").delete("RECORD_ID")
     * batch.collection("example4").upsert({ ... })
     *
     * await batch.send()
     * ```
     */
    createBatch(): BatchService {
        return new BatchService(this);
    }

    /**
     * Returns the RecordService associated to the specified collection.
     */
    collection<M = RecordModel>(idOrName: string): RecordService<M> {
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
    cancelRequest(requestKey: string): Client {
        if (this.cancelControllers[requestKey]) {
            this.cancelControllers[requestKey].abort();
            delete this.cancelControllers[requestKey];
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
     * Constructs a filter expression with placeholders populated from a parameters object.
     *
     * Placeholder parameters are defined with the `{:paramName}` notation.
     *
     * The following parameter values are supported:
     *
     * - `string` (_single quotes are autoescaped_)
     * - `number`
     * - `boolean`
     * - `Date` object (_stringified into the PocketBase datetime format_)
     * - `null`
     * - everything else is converted to a string using `JSON.stringify()`
     *
     * Example:
     *
     * ```js
     * pb.collection("example").getFirstListItem(pb.filter(
     *    'title ~ {:title} && created >= {:created}',
     *    { title: "example", created: new Date()}
     * ))
     * ```
     */
    filter(raw: string, params?: { [key: string]: any }): string {
        if (!params) {
            return raw;
        }

        for (let key in params) {
            let val = params[key];
            switch (typeof val) {
                case "boolean":
                case "number":
                    val = "" + val;
                    break;
                case "string":
                    val = "'" + val.replace(/'/g, "\\'") + "'";
                    break;
                default:
                    if (val === null) {
                        val = "null";
                    } else if (val instanceof Date) {
                        val = "'" + val.toISOString().replace("T", " ") + "'";
                    } else {
                        val = "'" + JSON.stringify(val).replace(/'/g, "\\'") + "'";
                    }
            }
            raw = raw.replaceAll("{:" + key + "}", val);
        }

        return raw;
    }

    /**
     * @deprecated Please use `pb.files.getURL()`.
     */
    getFileUrl(
        record: { [key: string]: any },
        filename: string,
        queryParams: FileOptions = {},
    ): string {
        console.warn("Please replace pb.getFileUrl() with pb.files.getURL()");
        return this.files.getURL(record, filename, queryParams);
    }

    /**
     * @deprecated Please use `pb.buildURL()`.
     */
    buildUrl(path: string): string {
        console.warn("Please replace pb.buildUrl() with pb.buildURL()");
        return this.buildURL(path);
    }

    /**
     * Builds a full client url by safely concatenating the provided path.
     */
    buildURL(path: string): string {
        let url = this.baseURL;

        // construct an absolute base url if in a browser environment
        if (
            typeof window !== "undefined" &&
            !!window.location &&
            !url.startsWith("https://") &&
            !url.startsWith("http://")
        ) {
            url = window.location.origin?.endsWith("/")
                ? window.location.origin.substring(0, window.location.origin.length - 1)
                : window.location.origin || "";

            if (!this.baseURL.startsWith("/")) {
                url += window.location.pathname || "/";
                url += url.endsWith("/") ? "" : "/";
            }

            url += this.baseURL;
        }

        // concatenate the path
        if (path) {
            url += url.endsWith("/") ? "" : "/"; // append trailing slash if missing
            url += path.startsWith("/") ? path.substring(1) : path;
        }

        return url;
    }

    /**
     * Sends an api http request.
     *
     * @throws {ClientResponseError}
     */
    async send<T = any>(path: string, options: SendOptions): Promise<T> {
        options = this.initSendOptions(path, options);

        // build url + path
        let url = this.buildURL(path);

        if (this.beforeSend) {
            const result = Object.assign({}, await this.beforeSend(url, options));
            if (
                typeof result.url !== "undefined" ||
                typeof result.options !== "undefined"
            ) {
                url = result.url || url;
                options = result.options || options;
            } else if (Object.keys(result).length) {
                // legacy behavior
                options = result as SendOptions;
                console?.warn &&
                    console.warn(
                        "Deprecated format of beforeSend return: please use `return { url, options }`, instead of `return options`.",
                    );
            }
        }

        // serialize the query parameters
        if (typeof options.query !== "undefined") {
            const query = serializeQueryParams(options.query);
            if (query) {
                url += (url.includes("?") ? "&" : "?") + query;
            }
            delete options.query;
        }

        // ensures that the json body is serialized
        if (
            this.getHeader(options.headers, "Content-Type") == "application/json" &&
            options.body &&
            typeof options.body !== "string"
        ) {
            options.body = JSON.stringify(options.body);
        }

        // early throw an abort error in case the request was already cancelled
        const fetchFunc = options.fetch || fetch;

        // send the request
        return fetchFunc(url, options)
            .then(async (response) => {
                let data: any = {};

                try {
                    data = await response.json();
                } catch (err: any) {
                    // @todo map against the response content type
                    // all api responses are expected to return json
                    // with exception of the realtime events and 204
                    if (
                        options.signal?.aborted ||
                        err?.name == "AbortError" ||
                        err?.message == "Aborted"
                    ) {
                        throw err;
                    }
                }

                if (this.afterSend) {
                    data = await this.afterSend(response, data, options);
                }

                if (response.status >= 400) {
                    throw new ClientResponseError({
                        url: response.url,
                        status: response.status,
                        data: data,
                    });
                }

                return data as T;
            })
            .catch((err) => {
                // wrap to normalize all errors
                throw new ClientResponseError(err);
            });
    }

    /**
     * Shallow copy the provided object and takes care to initialize
     * any options required to preserve the backward compatability.
     *
     * @param  {SendOptions} options
     * @return {SendOptions}
     */
    private initSendOptions(path: string, options: SendOptions): SendOptions {
        options = Object.assign({ method: "GET" } as SendOptions, options);

        // auto convert the body to FormData, if needed
        options.body = convertToFormDataIfNeeded(options.body);

        // move unknown send options as query parameters
        normalizeUnknownQueryParams(options);

        // requestKey normalizations for backward-compatibility
        // ---
        options.query = Object.assign({}, options.params, options.query);
        if (typeof options.requestKey === "undefined") {
            if (options.$autoCancel === false || options.query.$autoCancel === false) {
                options.requestKey = null;
            } else if (options.$cancelKey || options.query.$cancelKey) {
                options.requestKey = options.$cancelKey || options.query.$cancelKey;
            }
        }
        // remove the deprecated special cancellation params from the other query params
        delete options.$autoCancel;
        delete options.query.$autoCancel;
        delete options.$cancelKey;
        delete options.query.$cancelKey;
        // ---

        // add the json header, if not explicitly set
        // (for FormData body the Content-Type header should be skipped since the boundary is autogenerated)
        if (
            this.getHeader(options.headers, "Content-Type") === null &&
            !isFormData(options.body)
        ) {
            options.headers = Object.assign({}, options.headers, {
                "Content-Type": "application/json",
            });
        }

        // add Accept-Language header, if not explicitly set
        if (this.getHeader(options.headers, "Accept-Language") === null) {
            options.headers = Object.assign({}, options.headers, {
                "Accept-Language": this.lang,
            });
        }

        // check if Authorization header can be added
        if (
            // has valid token
            this.authStore.token &&
            // auth header is not explicitly set
            this.getHeader(options.headers, "Authorization") === null
        ) {
            options.headers = Object.assign({}, options.headers, {
                Authorization: this.authStore.token,
            });
        }

        // handle auto cancellation for duplicated pending request
        if (this.enableAutoCancellation && options.requestKey !== null) {
            const requestKey = options.requestKey || (options.method || "GET") + path;

            delete options.requestKey;

            // cancel previous pending requests
            this.cancelRequest(requestKey);

            // @todo evaluate if a cleanup after the request is necessary
            // (check also authWithOAuth2 as it currently relies on the controller)
            const controller = new AbortController();
            this.cancelControllers[requestKey] = controller;
            options.signal = controller.signal;
        }

        return options;
    }

    /**
     * Extracts the header with the provided name in case-insensitive manner.
     * Returns `null` if no header matching the name is found.
     */
    private getHeader(
        headers: { [key: string]: string } | undefined,
        name: string,
    ): string | null {
        headers = headers || {};
        name = name.toLowerCase();

        for (let key in headers) {
            if (key.toLowerCase() == name) {
                return headers[key];
            }
        }

        return null;
    }
}
