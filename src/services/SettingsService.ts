import BaseService         from '@/services/utils/BaseService';
import { BaseQueryParams } from '@/services/utils/QueryParams';

interface appleClientSecret {
    secret: string;
}

export default class SettingsService extends BaseService {
    /**
     * Fetch all available app settings.
     */
    getAll(queryParams: BaseQueryParams = {}): Promise<{ [key: string]: any }> {
        return this.client.send('/api/settings', {
            'method': 'GET',
            'params': queryParams,
        }).then((responseData) => responseData || {});
    }

    /**
     * Bulk updates app settings.
     */
    update(bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<{ [key: string]: any }> {
        return this.client.send('/api/settings', {
            'method': 'PATCH',
            'params': queryParams,
            'body':   bodyParams,
        }).then((responseData) => responseData || {});
    }

    /**
     * Performs a S3 storage connection test.
     */
    testS3(queryParams: BaseQueryParams = {}): Promise<boolean> {
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
    testEmail(toEmail: string, emailTemplate: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
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

    /**
     * Generates a new Apple OAuth2 client secret.
     */
    generateAppleClientSecret(
        clientId: string,
        teamId: string,
        keyId: string,
        privateKey: string,
        duration: number,
        bodyParams = {},
        queryParams: BaseQueryParams = {}
    ): Promise<appleClientSecret> {
        bodyParams = Object.assign({
            clientId,
            teamId,
            keyId,
            privateKey,
            duration,
        }, bodyParams);

        return this.client.send('/api/settings/apple/generate-client-secret', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        });
    }
}
