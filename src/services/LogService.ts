import { BaseService } from '@/services/utils/BaseService';
import { ListResult, LogRequestModel }  from '@/services/utils/dtos';
import {
    CommonOptions,
    ListOptions,
    LogStatsOptions,
} from '@/services/utils/options';

export interface HourlyStats {
    total: number;
    date:  string;
}

export class LogService extends BaseService {
    /**
     * Returns paginated logged requests list.
     */
    getRequestsList(page = 1, perPage = 30, options?: ListOptions): Promise<ListResult<LogRequestModel>> {
        options = Object.assign({'method': 'GET'}, options);

        options.query = Object.assign({
            'page':    page,
            'perPage': perPage,
        }, options.query);

        return this.client.send('/api/logs/requests', options);
    }

    /**
     * Returns a single logged request by its id.
     */
    getRequest(id: string, options?: CommonOptions): Promise<LogRequestModel> {
        options = Object.assign({
            'method': 'GET',
        }, options);

        return this.client.send('/api/logs/requests/' + encodeURIComponent(id), options);
    }

    /**
     * Returns request logs statistics.
     */
    getRequestsStats(options?: LogStatsOptions): Promise<Array<HourlyStats>> {
        options = Object.assign({
            'method': 'GET',
        }, options);

        return this.client.send('/api/logs/requests/stats', options);
    }
}
