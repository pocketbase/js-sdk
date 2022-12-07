import Client from '@/Client';

/**
 * BaseService class that should be inherited from all API services.
 */
export default abstract class BaseService {
    readonly client: Client

    constructor(client: Client) {
        this.client = client;
    }
}

export interface BaseQueryParams {
    [key: string]: any;

    $autoCancel?:  boolean;
    $cancelKey?:   string;
}

export interface ExpandableQueryParams {
    expand?: string;
}

export interface PaginatedQueryParams {
    page?:    number;
    perPage?: number;
}

export interface SortableQueryParams {
    sort?: string;
}

export interface FilterableQueryParams {
    filter?: string;
}
