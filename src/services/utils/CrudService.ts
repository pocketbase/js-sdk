import ListResult from '@/models/utils/ListResult';
import BaseModel  from '@/models/utils/BaseModel';
import BaseCrudService, {
    BaseCrudQueryParams,
    ListQueryParams
} from '@/services/utils/BaseCrudService';

export default abstract class CrudService<M extends BaseModel> extends BaseCrudService<M> {
    /**
     * Base path for the crud actions (without trailing slash, eg. '/admins').
     */
    abstract get baseCrudPath(): string

    /**
     * Returns a promise with all list items batch fetched at once.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    getFullList<T = M>(batch = 200, queryParams: ListQueryParams = {}): Promise<Array<T>> {
        return this._getFullList<T>(this.baseCrudPath, batch, queryParams);
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
    getFirstListItem<T = M>(filter: string, queryParams: BaseCrudQueryParams = {}): Promise<T> {
        return this._getFirstListItem<T>(this.baseCrudPath, filter, queryParams);
    }

    /**
     * Returns single item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    getOne<T = M>(id: string, queryParams: BaseCrudQueryParams = {}): Promise<T> {
        return this._getOne<T>(this.baseCrudPath, id, queryParams);
    }

    /**
     * Creates a new item.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    create<T = M>(bodyParams = {}, queryParams: BaseCrudQueryParams = {}): Promise<T> {
        return this._create<T>(this.baseCrudPath, bodyParams, queryParams);
    }

    /**
     * Updates an existing item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    update<T = M>(id: string, bodyParams = {}, queryParams: BaseCrudQueryParams = {}): Promise<T> {
        return this._update<T>(this.baseCrudPath, id, bodyParams, queryParams);
    }

    /**
     * Deletes an existing item by its id.
     */
    delete(id: string, queryParams: BaseCrudQueryParams = {}): Promise<boolean> {
        return this._delete(this.baseCrudPath, id, queryParams);
    }
}
