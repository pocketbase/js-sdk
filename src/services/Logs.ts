import LogRequest  from '@/models/LogRequest';
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
    getRequestsList(page = 1, perPage = 30, queryParams = {}): Promise<ListResult<LogRequest>> {
        queryParams = Object.assign({
            'page':    page,
            'perPage': perPage,
        }, queryParams);

        return this.client.send('/api/logs/requests', {
            'method': 'GET',
            'params': queryParams,
        }).then((responseData: any) => {
            const items: Array<LogRequest> = [];
            if (responseData?.items) {
                responseData.items = responseData?.items || [];
                for (const item of responseData.items) {
                    items.push(new LogRequest(item));
                }
            }

            return new ListResult<LogRequest>(
                responseData?.page || 1,
                responseData?.perPage || 0,
                responseData?.totalItems || 0,
                items,
            );
        });
    }

    /**
     * Returns a single logged request by its id.
     */
    getRequest(id: string, queryParams = {}): Promise<LogRequest> {
        return this.client.send('/api/logs/requests/' + encodeURIComponent(id), {
            'method': 'GET',
            'params': queryParams
        }).then((responseData: any) => new LogRequest(responseData));
    }

    /**
     * Returns request logs statistics.
     */
    getRequestsStats(queryParams = {}): Promise<Array<HourlyStats>> {
        return this.client.send('/api/logs/requests/stats', {
            'method': 'GET',
            'params': queryParams
        }).then((responseData: any) => responseData);
    }
}
