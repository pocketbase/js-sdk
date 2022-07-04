import BaseService from '@/services/utils/BaseService';

export default class Settings extends BaseService {
    /**
     * Fetch all available app settings.
     */
    getAll(queryParams = {}): Promise<{ [key: string]: any }> {
        return this.client.send({
            'method': 'get',
            'url':    '/api/settings',
            'params': queryParams,
        }).then((response) => response?.data || {});
    }

    /**
     * Bulk updates app settings.
     */
    update(bodyParams = {}, queryParams = {}): Promise<{ [key: string]: any }> {
        return this.client.send({
            'method': 'patch',
            'url':    '/api/settings',
            'params': queryParams,
            'data':   bodyParams,
        }).then((response) => response?.data || {});
    }
}
