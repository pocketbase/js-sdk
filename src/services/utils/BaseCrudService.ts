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

        return this.client.send({
            'method': 'get',
            'url':    basePath,
            'params': queryParams,
        }).then((response: any) => {
            const items: Array<M> = [];
            if (response?.data?.items) {
                response.data.items = response?.data?.items || [];
                for (const item of response.data.items) {
                    items.push(this.decode(item));
                }
            }

            return new ListResult<M>(
                response?.data?.page || 1,
                response?.data?.perPage || 0,
                response?.data?.totalItems || 0,
                items,
            );
        });
    }

    /**
     * Returns single item by its id.
     */
    protected _getOne(basePath: string, id: string, queryParams = {}): Promise<M> {
        return this.client.send({
            'method': 'get',
            'url':    basePath + '/' + encodeURIComponent(id),
            'params': queryParams
        }).then((response: any) => this.decode(response?.data));
    }

    /**
     * Creates a new item.
     */
    protected _create(basePath: string, bodyParams = {}, queryParams = {}): Promise<M> {
        return this.client.send({
            'method': 'post',
            'url':    basePath,
            'params': queryParams,
            'data':   bodyParams,
        }).then((response: any) => this.decode(response?.data));
    }

    /**
     * Updates an existing item by its id.
     */
    protected _update(basePath: string, id: string, bodyParams = {}, queryParams = {}): Promise<M> {
        return this.client.send({
            'method': 'patch',
            'url':    basePath + '/' + encodeURIComponent(id),
            'params': queryParams,
            'data':   bodyParams,
        }).then((response: any) => this.decode(response?.data));
    }

    /**
     * Deletes an existing item by its id.
     */
    protected _delete(basePath: string, id: string, bodyParams = {}, queryParams = {}): Promise<boolean> {
        return this.client.send({
            'method': 'delete',
            'url':    basePath + '/' + encodeURIComponent(id),
            'params': queryParams,
            'data':   bodyParams,
        }).then(() => true);
    }
}
