import ListResult      from '@/models/utils/ListResult';
import BaseModel       from '@/models/utils/BaseModel';
import BaseCrudService from '@/services/utils/BaseCrudService';

export default abstract class CrudService<M extends BaseModel> extends BaseCrudService<M> {
    /**
     * Base path for the crud actions (without trailing slash, eg. '/admins').
     */
    abstract baseCrudPath(): string

    /**
     * Returns a promise with all list items batch fetched at once.
     */
    getFullList(batchSize = 100, queryParams = {}): Promise<Array<M>> {
        return this._getFullList(this.baseCrudPath(), batchSize, queryParams);
    }

    /**
     * Returns paginated items list.
     */
    getList(page = 1, perPage = 30, queryParams = {}): Promise<ListResult<M>> {
        return this._getList(this.baseCrudPath(), page, perPage, queryParams);
    }

    /**
     * Returns single item by its id.
     */
    getOne(id: string, queryParams = {}): Promise<M> {
        return this._getOne(this.baseCrudPath(), id, queryParams);
    }

    /**
     * Creates a new item.
     */
    create(bodyParams = {}, queryParams = {}): Promise<M> {
        return this._create(this.baseCrudPath(), bodyParams, queryParams);
    }

    /**
     * Updates an existing item by its id.
     */
    update(id: string, bodyParams = {}, queryParams = {}): Promise<M> {
        return this._update(this.baseCrudPath(), id, bodyParams, queryParams);
    }

    /**
     * Deletes an existing item by its id.
     */
    delete(id: string, bodyParams = {}, queryParams = {}): Promise<boolean> {
        return this._delete(this.baseCrudPath(), id, bodyParams, queryParams);
    }
}
