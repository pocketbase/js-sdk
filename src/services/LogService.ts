import BaseService from '@/services/utils/BaseService';
import {
    ResultList,
    LogRequestModel,
}  from '@/services/utils/ResponseModels';
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
    getRequestsList(page = 1, perPage = 30, queryParams: ListQueryParams = {}): Promise<ResultList<LogRequestModel>> {
        queryParams = Object.assign({
            'page':    page,
            'perPage': perPage,
        }, queryParams);

        return this.client.send('/api/logs/requests', {
            'method': 'GET',
            'params': queryParams,
        });
    }

    /**
     * Returns a single logged request by its id.
     */
    getRequest(id: string, queryParams: BaseQueryParams = {}): Promise<LogRequestModel> {
        return this.client.send('/api/logs/requests/' + encodeURIComponent(id), {
            'method': 'GET',
            'params': queryParams
        });
    }

    /**
     * Returns request logs statistics.
     */
    getRequestsStats(queryParams: LogStatsQueryParams = {}): Promise<Array<HourlyStats>> {
        return this.client.send('/api/logs/requests/stats', {
            'method': 'GET',
            'params': queryParams
        });
    }
}
