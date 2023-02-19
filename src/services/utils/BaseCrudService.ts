import BaseModel           from '@/models/utils/BaseModel';
import ListResult          from '@/models/utils/ListResult';
import BaseService         from '@/services/utils/BaseService';
import ClientResponseError from '@/ClientResponseError';
import {
    BaseQueryParams,
    ListQueryParams
} from '@/services/utils/QueryParams';

// @todo since there is no longer need of SubCrudService consider merging with CrudService in v0.9+
export default abstract class BaseCrudService<M extends BaseModel> extends BaseService {
    /**
     * Response data decoder.
     */
    abstract decode(data: { [key: string]: any }): M

    /**
     * Returns a promise with all list items batch fetched at once.
     */
    protected _getFullList<T = M>(basePath: string, batchSize = 200, queryParams: ListQueryParams = {}): Promise<Array<T>> {
        var result: Array<T> = [];

        let request = async (page: number): Promise<Array<any>> => {
            return this._getList(basePath, page, batchSize || 200, queryParams).then((list) => {
                const castedList = (list as any as ListResult<T>);
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
    protected _getList<T = M>(basePath: string, page = 1, perPage = 30, queryParams: ListQueryParams = {}): Promise<ListResult<T>> {
        queryParams = Object.assign({
            'page': page,
            'perPage': perPage,
        }, queryParams);

        return this.client.send(basePath, {
            'method': 'GET',
            'params': queryParams,
        }).then((responseData: any) => {
            const items: Array<T> = [];
            if (responseData?.items) {
                responseData.items = responseData.items || [];
                for (const item of responseData.items) {
                    items.push(this.decode(item) as any as T);
                }
            }

            return new ListResult<T>(
                responseData?.page || 1,
                responseData?.perPage || 0,
                responseData?.totalItems || 0,
                responseData?.totalPages || 0,
                items,
            );
        });
    }

    /**
     * Returns single item by its id.
     */
    protected _getOne<T = M>(basePath: string, id: string, queryParams: BaseQueryParams = {}): Promise<T> {
        return this.client.send(basePath + '/' + encodeURIComponent(id), {
            'method': 'GET',
            'params': queryParams
        }).then((responseData: any) => this.decode(responseData) as any as T);
    }

    /**
     * Returns the first found item by a list filter.
     *
     * Internally it calls `_getList(basePath, 1, 1, { filter })` and returns its
     * first item.
     *
     * For consistency with `_getOne`, this method will throw a 404
     * ClientResponseError if no item was found.
     */
    protected _getFirstListItem<T = M>(basePath: string, filter: string, queryParams: BaseQueryParams = {}): Promise<T> {
        queryParams = Object.assign({
            'filter': filter,
            '$cancelKey': 'one_by_filter_' + basePath + "_" + filter,
        }, queryParams);

        return this._getList<T>(basePath, 1, 1, queryParams)
            .then((result) => {
                if (!result?.items?.length) {
                    throw new ClientResponseError({
                        status: 404,
                        data: {
                            code: 404,
                            message: "The requested resource wasn't found.",
                            data: {},
                        },
                    });
                }

                return result.items[0];
            });
    }

    /**
     * Creates a new item.
     */
    protected _create<T = M>(basePath: string, bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<T> {
        return this.client.send(basePath, {
            'method': 'POST',
            'params': queryParams,
            'body': bodyParams,
        }).then((responseData: any) => this.decode(responseData) as any as T);
    }

    /**
     * Updates an existing item by its id.
     */
    protected _update<T = M>(basePath: string, id: string, bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<T> {
        return this.client.send(basePath + '/' + encodeURIComponent(id), {
            'method': 'PATCH',
            'params': queryParams,
            'body': bodyParams,
        }).then((responseData: any) => this.decode(responseData) as any as T);
    }

    /**
     * Deletes an existing item by its id.
     */
    protected _delete(basePath: string, id: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        return this.client.send(basePath + '/' + encodeURIComponent(id), {
            'method': 'DELETE',
            'params': queryParams,
        }).then(() => true);
    }
}
