export interface BaseQueryParams {
    [key: string]: any;

    $autoCancel?: boolean;
    $cancelKey?:  string;
}

export interface ListQueryParams extends BaseQueryParams {
    page?:    number;
    perPage?: number;
    sort?:    string;
    filter?:  string;
}

export interface FullListQueryParams extends ListQueryParams {
    batch?: number;
}

export interface RecordQueryParams extends BaseQueryParams {
    expand?: string;
}

export interface RecordListQueryParams extends ListQueryParams, RecordQueryParams {
}

export interface RecordFullListQueryParams extends FullListQueryParams, RecordQueryParams {
}

export interface LogStatsQueryParams extends BaseQueryParams {
    filter?: string;
}

export interface FileQueryParams extends BaseQueryParams {
    thumb?: string;
}
