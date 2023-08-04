import BaseService         from '@/services/utils/BaseService';
import ClientResponseError from '@/ClientResponseError';
import { ResultList }      from '@/services/utils/ResponseModels';

import {
    BaseQueryParams,
    ListQueryParams,
    FullListQueryParams
} from '@/services/utils/QueryParams';

export default abstract class CrudService<M> extends BaseService   {
    /**
     * Base path for the crud actions (without trailing slash, eg. '/admins').
     */
    abstract get baseCrudPath(): string

    /**
     * Response data decoder.
     */
    decode<T = M>(data: { [key: string]: any }): T {
        return data as T;
    }

    /**
     * Returns a promise with all list items batch fetched at once
     * (by default 500 items per request; to change it set the `batch` query param).
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
            return this._getFullList<T>(batchOrqueryParams, queryParams);
        }

        const params = Object.assign({}, batchOrqueryParams, queryParams);

        let batch = 500;
        if (params.batch) {
            batch = params.batch;
            delete params.batch;
        }

        return this._getFullList<T>(batch, params);
    }

    /**
     * Returns paginated items list.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    getList<T = M>(page = 1, perPage = 30, queryParams: ListQueryParams = {}): Promise<ResultList<T>> {
        queryParams = Object.assign({
            'page': page,
            'perPage': perPage,
        }, queryParams);

        return this.client.send(this.baseCrudPath, {
            'method': 'GET',
            'params': queryParams,
        }).then((responseData: any) => {
            const items: Array<T> = [];

            if (responseData?.items) {
                responseData.items = responseData.items || [];
                for (const item of responseData.items) {
                    items.push(this.decode<T>(item));
                }
                responseData.items = items;
            }

            return responseData;
        });
    }

    /**
     * Returns the first found item by the specified filter.
     *
     * Internally it calls `getList(1, 1, { filter, skipTotal })` and
     * returns the first found item.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * For consistency with `getOne`, this method will throw a 404
     * ClientResponseError if no item was found.
     */
    getFirstListItem<T = M>(filter: string, queryParams: BaseQueryParams = {}): Promise<T> {
        queryParams = Object.assign({
            'filter':     filter,
            'skipTotal':  1,
            '$cancelKey': 'one_by_filter_' + this.baseCrudPath + "_" + filter,
        }, queryParams);

        return this.getList<T>(1, 1, queryParams)
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
     * Returns single item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    getOne<T = M>(id: string, queryParams: BaseQueryParams = {}): Promise<T> {
        return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(id), {
            'method': 'GET',
            'params': queryParams
        }).then((responseData: any) => this.decode(responseData) as any as T);
    }

    /**
     * Creates a new item.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    create<T = M>(bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<T> {
        return this.client.send(this.baseCrudPath, {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then((responseData: any) => this.decode<T>(responseData));
    }

    /**
     * Updates an existing item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     */
    update<T = M>(id: string, bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<T> {
        return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(id), {
            'method': 'PATCH',
            'params': queryParams,
            'body':   bodyParams,
        }).then((responseData: any) => this.decode<T>(responseData));
    }

    /**
     * Deletes an existing item by its id.
     */
    delete(id: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(id), {
            'method': 'DELETE',
            'params': queryParams,
        }).then(() => true);
    }

    /**
     * Returns a promise with all list items batch fetched at once.
     */
    protected _getFullList<T = M>(batchSize = 500, queryParams: ListQueryParams = {}): Promise<Array<T>> {
        queryParams = Object.assign({
            'skipTotal': 1,
        }, queryParams);

        let result: Array<T> = [];

        let request = async (page: number): Promise<Array<any>> => {
            return this.getList(page, batchSize || 500, queryParams).then((list) => {
                const castedList = (list as any as ResultList<T>);
                const items      = castedList.items;

                result = result.concat(items);

                if (items.length == list.perPage) {
                    return request(page + 1);
                }

                return result;
            });
        }

        return request(1);
    }
}
