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

    /**
     * Performs a S3 storage connection test.
     */
    testS3(queryParams = {}): Promise<boolean> {
        return this.client.send('/api/settings/test/s3', {
            'method': 'POST',
            'params': queryParams,
        }).then(() => true);
    }

    /**
     * Sends a test email.
     *
     * The possible `emailTemplate` values are:
     * - verification
     * - password-reset
     * - email-change
     */
    testEmail(toEmail: string, emailTemplate: string, queryParams = {}): Promise<boolean> {
        const bodyParams = {
            'email':    toEmail,
            'template': emailTemplate,
        };

        return this.client.send('/api/settings/test/email', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }
}
