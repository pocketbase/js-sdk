import ListResult      from '@/models/utils/ListResult';
import BaseModel       from '@/models/utils/BaseModel';
import BaseCrudService from '@/services/utils/BaseCrudService';
import {
    BaseQueryParams,
    ListQueryParams,
    FullListQueryParams
} from '@/services/utils/QueryParams';

export default abstract class CrudService<M extends BaseModel> extends BaseCrudService<M> {
    /**
     * Base path for the crud actions (without trailing slash, eg. '/admins').
     */
    abstract get baseCrudPath(): string

    /**
     * Returns a promise with all list items batch fetched at once
     * (by default 200 items per request; to change it set the `batch` query param).
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    getFullList<T = M>(queryParams?: FullListQueryParams): Promise<Array<T>>

    /**
     * Legacy version of getFullList with explicitly specified batch size.
     */
    getFullList<T = M>(batch?: number, queryParams?: ListQueryParams): Promise<Array<T>>

    getFullList<T = M>(batchOrqueryParams?: number|FullListQueryParams, queryParams?: ListQueryParams): Promise<Array<T>> {
        if (typeof batchOrqueryParams == "number") {
            return this._getFullList<T>(this.baseCrudPath, batchOrqueryParams, queryParams);
        }

        const params = Object.assign({}, batchOrqueryParams, queryParams);

        return this._getFullList<T>(this.baseCrudPath, params.batch || 200, params);
    }

    /**
     * Returns paginated items list.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    getList<T = M>(page = 1, perPage = 30, queryParams: ListQueryParams = {}): Promise<ListResult<T>> {
        return this._getList<T>(this.baseCrudPath, page, perPage, queryParams);
    }

    /**
     * Returns the first found item by the specified filter.
     *
     * Internally it calls `getList(1, 1, { filter })` and returns the
     * first found item.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * For consistency with `getOne`, this method will throw a 404
     * ClientResponseError if no item was found.
     */
    getFirstListItem<T = M>(filter: string, queryParams: BaseQueryParams = {}): Promise<T> {
        return this._getFirstListItem<T>(this.baseCrudPath, filter, queryParams);
    }

    /**
     * Returns single item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    getOne<T = M>(id: string, queryParams: BaseQueryParams = {}): Promise<T> {
        return this._getOne<T>(this.baseCrudPath, id, queryParams);
    }

    /**
     * Creates a new item.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    create<T = M>(bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<T> {
        return this._create<T>(this.baseCrudPath, bodyParams, queryParams);
    }

    /**
     * Updates an existing item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    update<T = M>(id: string, bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<T> {
        return this._update<T>(this.baseCrudPath, id, bodyParams, queryParams);
    }

    /**
     * Deletes an existing item by its id.
     */
    delete(id: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        return this._delete(this.baseCrudPath, id, queryParams);
    }
}
