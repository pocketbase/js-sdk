import LogRequest  from '@/models/LogRequest';
import ListResult  from '@/models/utils/ListResult';
import BaseService from '@/services/utils/BaseService';
import {
    BaseQueryParams,
    ListQueryParams,
    LogStatsQueryParams,
} from '@/services/utils/QueryParams';

export interface HourlyStats {
    total: number;
    date:  string;
}

export default class LogService extends BaseService {
    /**
     * Returns paginated logged requests list.
     */
    getRequestsList(page = 1, perPage = 30, queryParams: ListQueryParams = {}): Promise<ListResult<LogRequest>> {
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
                responseData?.totalPages || 0,
                items,
            );
        });
    }

    /**
     * Returns a single logged request by its id.
     */
    getRequest(id: string, queryParams: BaseQueryParams = {}): Promise<LogRequest> {
        return this.client.send('/api/logs/requests/' + encodeURIComponent(id), {
            'method': 'GET',
            'params': queryParams
        }).then((responseData: any) => new LogRequest(responseData));
    }

    /**
     * Returns request logs statistics.
     */
    getRequestsStats(queryParams: LogStatsQueryParams = {}): Promise<Array<HourlyStats>> {
        return this.client.send('/api/logs/requests/stats', {
            'method': 'GET',
            'params': queryParams
        }).then((responseData: any) => responseData);
    }
}
