import BaseModel   from '@/models/utils/BaseModel';
import ListResult  from '@/models/utils/ListResult';
import BaseService from '@/services/utils/BaseService';

export default abstract class BaseCrudService<M extends BaseModel> extends BaseService {
    /**
     * Response data decoder.
     */
    abstract decode(data: { [key: string]: any }): M

    /**
     * Returns a promise with all list items batch fetched at once.
     */
    protected _getFullList(basePath: string, batchSize = 100, queryParams = {}): Promise<Array<M>> {
        var result: Array<M> = [];

        let request = async (page: number): Promise<Array<any>> => {
            return this._getList(basePath, page, batchSize, queryParams).then((list) => {
                const castedList = (list as ListResult<M>);
                const items = castedList.items;
                const totalItems = castedList.totalItems;

                result = result.concat(items);

                if (items.length && totalItems > result.length) {
                    return request(page + 1);
                }

                return result;
            });
        }

        return request(1);
    }

    /**
     * Returns paginated items list.
     */
    protected _getList(basePath: string, page = 1, perPage = 30, queryParams = {}): Promise<ListResult<M>> {
        queryParams = Object.assign({
            'page':    page,
            'perPage': perPage,
        }, queryParams);

        return this.client.send(basePath, {
            'method': 'GET',
            'params': queryParams,
        }).then((responseData: any) => {
            const items: Array<M> = [];
            if (responseData?.items) {
                responseData.items = responseData.items || [];
                for (const item of responseData.items) {
                    items.push(this.decode(item));
                }
            }

            return new ListResult<M>(
                responseData?.page || 1,
                responseData?.perPage || 0,
                responseData?.totalItems || 0,
                items,
            );
        });
    }

    /**
     * Returns single item by its id.
     */
    protected _getOne(basePath: string, id: string, queryParams = {}): Promise<M> {
        return this.client.send(basePath + '/' + encodeURIComponent(id), {
            'method': 'GET',
            'params': queryParams
        }).then((responseData: any) => this.decode(responseData));
    }

    /**
     * Creates a new item.
     */
    protected _create(basePath: string, bodyParams = {}, queryParams = {}): Promise<M> {
        return this.client.send(basePath, {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then((responseData: any) => this.decode(responseData));
    }

    /**
     * Updates an existing item by its id.
     */
    protected _update(basePath: string, id: string, bodyParams = {}, queryParams = {}): Promise<M> {
        return this.client.send(basePath + '/' + encodeURIComponent(id), {
            'method': 'PATCH',
            'params': queryParams,
            'body':   bodyParams,
        }).then((responseData: any) => this.decode(responseData));
    }

    /**
     * Deletes an existing item by its id.
     */
    protected _delete(basePath: string, id: string, bodyParams = {}, queryParams = {}): Promise<boolean> {
        return this.client.send(basePath + '/' + encodeURIComponent(id), {
            'method': 'DELETE',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }
}
