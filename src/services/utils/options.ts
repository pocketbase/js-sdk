export interface SendOptions extends RequestInit {
    [key: string]: any; // for backward compatibility

    // optional custom fetch function to use for sending the request
    fetch?: (url: RequestInfo | URL, config?: RequestInit | undefined) => Promise<Response>;

    // custom headers to send with the requests
    headers?: { [key: string]: string };

    // the body of the request (serialized automatically for json requests)
    body?: any;

    // query params that will be appended to the request url
    query?: { [key: string]: any };

    // @deprecated use `query` instead
    //
    // for backward-compatibility `params` values are merged with `query`,
    // but this option may get removed in the final v1 release
    params?: { [key: string]: any };

    // the request identifier that can be used to cancel pending requests
    requestKey?:  string|null;

    // @deprecated use `requestKey:string` instead
    $cancelKey?:  string;

    // @deprecated use `requestKey:null` instead
    $autoCancel?: boolean;
}

export interface CommonOptions extends SendOptions {
    fields?: string;
}

export interface ListOptions extends CommonOptions {
    page?:      number;
    perPage?:   number;
    sort?:      string;
    filter?:    string;
    skipTotal?: boolean;
}

export interface FullListOptions extends ListOptions {
    batch?: number;
}

export interface RecordOptions extends CommonOptions {
    expand?: string;
}

export interface RecordListOptions extends ListOptions, RecordOptions {
}

export interface RecordFullListOptions extends FullListOptions, RecordOptions {
}

export interface LogStatsOptions extends CommonOptions {
    filter?: string;
}

export interface FileOptions extends CommonOptions {
    thumb?: string;
    download?: boolean;
}
