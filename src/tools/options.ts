export interface SendOptions extends RequestInit {
    // for backward compatibility and to minimize the verbosity,
    // any top-level field that doesn't exist in RequestInit or the
    // fields below will be treated as query parameter.
    [key: string]: any;

    /**
     * Optional custom fetch function to use for sending the request.
     */
    fetch?: (url: RequestInfo | URL, config?: RequestInit) => Promise<Response>;

    /**
     * Custom headers to send with the requests.
     */
    headers?: { [key: string]: string };

    /**
     * The body of the request (serialized automatically for json requests).
     */
    body?: any;

    /**
     * Query parameters that will be appended to the request url.
     */
    query?: { [key: string]: any };

    /**
     * @deprecated use `query` instead
     *
     * for backward-compatibility `params` values are merged with `query`,
     * but this option may get removed in the final v1 release
     */
    params?: { [key: string]: any };

    /**
     * The request identifier that can be used to cancel pending requests.
     */
    requestKey?: string | null;

    /**
     * @deprecated use `requestKey:string` instead
     */
    $cancelKey?: string;

    /**
     * @deprecated use `requestKey:null` instead
     */
    $autoCancel?: boolean;
}

export interface CommonOptions extends SendOptions {
    fields?: string;
}

export interface ListOptions extends CommonOptions {
    page?: number;
    perPage?: number;
    sort?: string;
    filter?: string;
    skipTotal?: boolean;
}

export interface FullListOptions extends ListOptions {
    batch?: number;
}

export interface RecordOptions extends CommonOptions {
    expand?: string;
}

export interface RecordListOptions extends ListOptions, RecordOptions {}

export interface RecordFullListOptions extends FullListOptions, RecordOptions {}

export interface RecordSubscribeOptions extends SendOptions {
    fields?: string;
    filter?: string;
    expand?: string;
}

export interface LogStatsOptions extends CommonOptions {
    filter?: string;
}

export interface FileOptions extends CommonOptions {
    thumb?: string;
    download?: boolean;
}

export interface AuthOptions extends CommonOptions {
    /**
     * If autoRefreshThreshold is set it will take care to auto refresh
     * when necessary the auth data before each request to ensure that
     * the auth state is always valid.
     *
     * The value must be in seconds, aka. the amount of seconds
     * that will be subtracted from the current token `exp` claim in order
     * to determine whether it is going to expire within the specified time threshold.
     *
     * For example, if you want to auto refresh the token if it is
     * going to expire in the next 30mins (or already has expired),
     * it can be set to `1800`
     */
    autoRefreshThreshold?: number;
}

// -------------------------------------------------------------------

// list of known SendOptions keys (everything else is treated as query param)
const knownSendOptionsKeys = [
    "requestKey",
    "$cancelKey",
    "$autoCancel",
    "fetch",
    "headers",
    "body",
    "query",
    "params",
    // ---,
    "cache",
    "credentials",
    "headers",
    "integrity",
    "keepalive",
    "method",
    "mode",
    "redirect",
    "referrer",
    "referrerPolicy",
    "signal",
    "window",
];

// modifies in place the provided options by moving unknown send options as query parameters.
export function normalizeUnknownQueryParams(options?: SendOptions): void {
    if (!options) {
        return;
    }

    options.query = options.query || {};
    for (let key in options) {
        if (knownSendOptionsKeys.includes(key)) {
            continue;
        }

        options.query[key] = options[key];
        delete options[key];
    }
}

export function serializeQueryParams(params: { [key: string]: any }): string {
    const result: Array<string> = [];

    for (const key in params) {
        const encodedKey = encodeURIComponent(key);
        const arrValue = Array.isArray(params[key]) ? params[key] : [params[key]];

        for (let v of arrValue) {
            v = prepareQueryParamValue(v);
            if (v === null) {
                continue
            }
            result.push(encodedKey + "=" + v);
        }
    }

    return result.join("&");
}

// encodes and normalizes the provided query param value.
function prepareQueryParamValue(value: any): null|string {
    if (value === null || typeof value === "undefined") {
        return null;
    }

    if (value instanceof Date) {
        return encodeURIComponent(value.toISOString().replace("T", " "));
    }

    if (typeof value === "object") {
        return encodeURIComponent(JSON.stringify(value));
    }

    return encodeURIComponent(value)
}
