import { BaseService } from "@/services/utils/BaseService";
import { ClientResponseError } from "@/ClientResponseError";
import { ListResult } from "@/services/utils/dtos";
import { CommonOptions, ListOptions, FullListOptions } from "@/services/utils/options";

export abstract class CrudService<M> extends BaseService {
    /**
     * Base path for the crud actions (without trailing slash, eg. '/admins').
     */
    abstract get baseCrudPath(): string;

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
     *
     * @throws {ClientResponseError}
     */
    async getFullList<T = M>(options?: FullListOptions): Promise<Array<T>>;

    /**
     * Legacy version of getFullList with explicitly specified batch size.
     */
    async getFullList<T = M>(batch?: number, options?: ListOptions): Promise<Array<T>>;

    async getFullList<T = M>(
        batchOrqueryParams?: number | FullListOptions,
        options?: ListOptions,
    ): Promise<Array<T>> {
        if (typeof batchOrqueryParams == "number") {
            return this._getFullList<T>(batchOrqueryParams, options);
        }

        options = Object.assign({}, batchOrqueryParams, options);

        let batch = 500;
        if (options.batch) {
            batch = options.batch;
            delete options.batch;
        }

        return this._getFullList<T>(batch, options);
    }

    /**
     * Returns paginated items list.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * @throws {ClientResponseError}
     */
    async getList<T = M>(
        page = 1,
        perPage = 30,
        options?: ListOptions,
    ): Promise<ListResult<T>> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        options.query = Object.assign(
            {
                page: page,
                perPage: perPage,
            },
            options.query,
        );

        return this.client.send(this.baseCrudPath, options).then((responseData: any) => {
            responseData.items =
                responseData.items?.map((item: any) => {
                    return this.decode<T>(item);
                }) || [];

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
     *
     * @throws {ClientResponseError}
     */
    async getFirstListItem<T = M>(filter: string, options?: CommonOptions): Promise<T> {
        options = Object.assign(
            {
                requestKey: "one_by_filter_" + this.baseCrudPath + "_" + filter,
            },
            options,
        );

        options.query = Object.assign(
            {
                filter: filter,
                skipTotal: 1,
            },
            options.query,
        );

        return this.getList<T>(1, 1, options).then((result) => {
            if (!result?.items?.length) {
                throw new ClientResponseError({
                    status: 404,
                    response: {
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
     *
     * If `id` is empty it will throw a 404 error.
     *
     * @throws {ClientResponseError}
     */
    async getOne<T = M>(id: string, options?: CommonOptions): Promise<T> {
        if (!id) {
            throw new ClientResponseError({
                url: this.client.buildUrl(this.baseCrudPath + "/"),
                status: 404,
                response: {
                    code: 404,
                    message: "Missing required record id.",
                    data: {},
                },
            });
        }

        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client
            .send(this.baseCrudPath + "/" + encodeURIComponent(id), options)
            .then((responseData: any) => this.decode<T>(responseData));
    }

    /**
     * Creates a new item.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * @throws {ClientResponseError}
     */
    async create<T = M>(
        bodyParams?: { [key: string]: any } | FormData,
        options?: CommonOptions,
    ): Promise<T> {
        options = Object.assign(
            {
                method: "POST",
                body: bodyParams,
            },
            options,
        );

        return this.client
            .send(this.baseCrudPath, options)
            .then((responseData: any) => this.decode<T>(responseData));
    }

    /**
     * Updates an existing item by its id.
     *
     * You can use the generic T to supply a wrapper type of the crud model.
     *
     * @throws {ClientResponseError}
     */
    async update<T = M>(
        id: string,
        bodyParams?: { [key: string]: any } | FormData,
        options?: CommonOptions,
    ): Promise<T> {
        options = Object.assign(
            {
                method: "PATCH",
                body: bodyParams,
            },
            options,
        );

        return this.client
            .send(this.baseCrudPath + "/" + encodeURIComponent(id), options)
            .then((responseData: any) => this.decode<T>(responseData));
    }

    /**
     * Deletes an existing item by its id.
     *
     * @throws {ClientResponseError}
     */
    async delete(id: string, options?: CommonOptions): Promise<boolean> {
        options = Object.assign(
            {
                method: "DELETE",
            },
            options,
        );

        return this.client
            .send(this.baseCrudPath + "/" + encodeURIComponent(id), options)
            .then(() => true);
    }

    /**
     * Returns a promise with all list items batch fetched at once.
     */
    protected _getFullList<T = M>(
        batchSize = 500,
        options?: ListOptions,
    ): Promise<Array<T>> {
        options = options || {};
        options.query = Object.assign(
            {
                skipTotal: 1,
            },
            options.query,
        );

        let result: Array<T> = [];

        let request = async (page: number): Promise<Array<any>> => {
            return this.getList(page, batchSize || 500, options).then((list) => {
                const castedList = list as any as ListResult<T>;
                const items = castedList.items;

                result = result.concat(items);

                if (items.length == list.perPage) {
                    return request(page + 1);
                }

                return result;
            });
        };

        return request(1);
    }
}
