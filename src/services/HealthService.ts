import BaseService             from '@/services/utils/BaseService';
import { CommonOptions }       from '@/services/utils/options';
import { HealthCheckResponse } from '@/services/utils/dtos';

export default class HealthService extends BaseService {
    /**
     * Checks the health status of the api.
     */
    check(options?: CommonOptions): Promise<HealthCheckResponse> {
        options = Object.assign({
            'method': 'GET',
        }, options);

        return this.client.send('/api/health', options);
    }
}
