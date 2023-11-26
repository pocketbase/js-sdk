import { BaseService } from '@/services/utils/BaseService';
import { ListResult, LogModel }  from '@/services/utils/dtos';
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
     * Returns paginated logs list.
     */
    getList(page = 1, perPage = 30, options?: ListOptions): Promise<ListResult<LogModel>> {
        options = Object.assign({'method': 'GET'}, options);

        options.query = Object.assign({
            'page':    page,
            'perPage': perPage,
        }, options.query);

        return this.client.send('/api/logs', options);
    }

    /**
     * Returns a single log by its id.
     */
    getOne(id: string, options?: CommonOptions): Promise<LogModel> {
        options = Object.assign({
            'method': 'GET',
        }, options);

        return this.client.send('/api/logs/' + encodeURIComponent(id), options);
    }

    /**
     * Returns logs statistics.
     */
    getStats(options?: LogStatsOptions): Promise<Array<HourlyStats>> {
        options = Object.assign({
            'method': 'GET',
        }, options);

        return this.client.send('/api/logs/stats', options);
    }
}
