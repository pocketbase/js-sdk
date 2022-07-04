import BaseModel       from '@/models/utils/BaseModel';
import ListResult      from '@/models/utils/ListResult';
import BaseCrudService from '@/services/utils/BaseCrudService';

export default abstract class SubCrudService<M extends BaseModel> extends BaseCrudService<M> {
    /**
     * Base path for the crud actions (without trailing slash, eg. '/collections/{:sub}/records').
     */
    abstract baseCrudPath(sub: string): string

    /**
     * Returns a promise with all list items batch fetched at once.
     */
    getFullList(sub: string, batchSize = 100, queryParams = {}): Promise<Array<M>> {
        return this._getFullList(this.baseCrudPath(sub), batchSize, queryParams);
    }

    /**
     * Returns paginated items list.
     */
    getList(sub: string, page = 1, perPage = 30, queryParams = {}): Promise<ListResult<M>> {
        return this._getList(this.baseCrudPath(sub), page, perPage, queryParams);
    }

    /**
     * Returns single item by its id.
     */
    getOne(sub: string, id: string, queryParams = {}): Promise<M> {
        return this._getOne(this.baseCrudPath(sub), id, queryParams);
    }

    /**
     * Creates a new item.
     */
    create(sub: string, bodyParams = {}, queryParams = {}): Promise<M> {
        return this._create(this.baseCrudPath(sub), bodyParams, queryParams);
    }

    /**
     * Updates an existing item by its id.
     */
    update(sub: string, id: string, bodyParams = {}, queryParams = {}): Promise<M> {
        return this._update(this.baseCrudPath(sub), id, bodyParams, queryParams);
    }

    /**
     * Deletes an existing item by its id.
     */
    delete(sub: string, id: string, bodyParams = {}, queryParams = {}): Promise<boolean> {
        return this._delete(this.baseCrudPath(sub), id, bodyParams, queryParams);
    }
}
