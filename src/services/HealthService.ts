import BaseService         from '@/services/utils/BaseService';
import { BaseQueryParams } from '@/services/utils/QueryParams';

export interface HealthCheckResponse {
    code:    number;
    message: string;
    data:    {[key: string]: any};
}

export default class HealthService extends BaseService {
    /**
     * Checks the health status of the api.
     */
    check(queryParams: BaseQueryParams = {}): Promise<HealthCheckResponse> {
        return this.client.send('/api/health', {
            'method': 'GET',
            'params': queryParams,
        });
    }
}
