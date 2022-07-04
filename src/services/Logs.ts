import Request     from '@/models/Request';
import ListResult  from '@/models/utils/ListResult';
import BaseService from '@/services/utils/BaseService';

export type HourlyStats = {
    total: number,
    date:  string,
}

export default class Logs extends BaseService {
    /**
     * Returns paginated logged requests list.
     */
    getRequestsList(page = 1, perPage = 30, queryParams = {}): Promise<ListResult<Request>> {
        queryParams = Object.assign({
            'page':    page,
            'perPage': perPage,
        }, queryParams);

        return this.client.send({
            'method': 'get',
            'url':    '/api/logs/requests',
            'params': queryParams,
        }).then((response: any) => {
            const items: Array<Request> = [];
            if (response?.data?.items) {
                response.data.items = response?.data?.items || [];
                for (const item of response.data.items) {
                    items.push(new Request(item));
                }
            }

            return new ListResult<Request>(
                response?.data?.page || 1,
                response?.data?.perPage || 0,
                response?.data?.totalItems || 0,
                items,
            );
        });
    }

    /**
     * Returns a single logged request by its id.
     */
    getRequest(id: string, queryParams = {}): Promise<Request> {
        return this.client.send({
            'method': 'get',
            'url':    '/api/logs/requests/' + encodeURIComponent(id),
            'params': queryParams
        }).then((response: any) => new Request(response?.data));
    }

    /**
     * Returns request logs statistics.
     */
    getRequestsStats(queryParams = {}): Promise<Array<HourlyStats>> {
        return this.client.send({
            'method': 'get',
            'url':    '/api/logs/requests/stats',
            'params': queryParams
        }).then((response: any) => response?.data);
    }
}
