import BaseService         from '@/services/utils/BaseService';
import { BaseQueryParams } from '@/services/utils/QueryParams';

export interface healthCheckResponse {
    code:    number;
    message: string;
}

export default class HealthService extends BaseService {
    /**
     * Checks the health status of the api.
     */
    check(queryParams: BaseQueryParams = {}): Promise<healthCheckResponse> {
        return this.client.send('/api/health', {
            'method': 'GET',
            'params': queryParams,
        });
    }
}
