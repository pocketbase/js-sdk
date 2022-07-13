import BaseService from '@/services/utils/BaseService';

export default class Settings extends BaseService {
    /**
     * Fetch all available app settings.
     */
    getAll(queryParams = {}): Promise<{ [key: string]: any }> {
        return this.client.send('/api/settings', {
            'method': 'GET',
            'params': queryParams,
        }).then((responseData) => responseData || {});
    }

    /**
     * Bulk updates app settings.
     */
    update(bodyParams = {}, queryParams = {}): Promise<{ [key: string]: any }> {
        return this.client.send('/api/settings', {
            'method': 'PATCH',
            'params': queryParams,
            'body':   bodyParams,
        }).then((responseData) => responseData || {});
    }
}
