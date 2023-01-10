import Admin               from '@/models/Admin';
import CrudService         from '@/services/utils/CrudService';
import { BaseQueryParams } from '@/services/utils/QueryParams';

export interface AdminAuthResponse {
    [key: string]: any;

    token: string;
    admin: Admin;
}

export default class AdminService extends CrudService<Admin> {
    /**
     * @inheritdoc
     */
    decode(data: { [key: string]: any }): Admin {
        return new Admin(data);
    }

    /**
     * @inheritdoc
     */
    get baseCrudPath(): string {
        return '/api/admins';
    }

    // ---------------------------------------------------------------
    // Post update/delete AuthStore sync
    // ---------------------------------------------------------------

    /**
     * @inheritdoc
     *
     * If the current `client.authStore.model` matches with the updated id, then
     * on success the `client.authStore.model` will be updated with the result.
     */
    update<T = Admin>(id: string, bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<T> {
        return super.update<Admin>(id, bodyParams, queryParams).then((item) => {
            // update the store state if the updated item id matches with the stored model
            if (
                this.client.authStore.model &&
                typeof this.client.authStore.model?.collectionId === 'undefined' && // is not record auth
                this.client.authStore.model?.id === item?.id
            ) {
                this.client.authStore.save(this.client.authStore.token, item);
            }

            return item as any as T;
        });
    }

    /**
     * @inheritdoc
     *
     * If the current `client.authStore.model` matches with the deleted id,
     * then on success the `client.authStore` will be cleared.
     */
    delete(id: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        return super.delete(id, queryParams).then((success) => {
            // clear the store state if the deleted item id matches with the stored model
            if (
                success &&
                this.client.authStore.model &&
                typeof this.client.authStore.model?.collectionId === 'undefined' && // is not record auth
                this.client.authStore.model?.id === id
            ) {
                this.client.authStore.clear();
            }
            return success;
        });
    }

    // ---------------------------------------------------------------
    // Auth handlers
    // ---------------------------------------------------------------

    /**
     * Prepare successful authorize response.
     */
    protected authResponse(responseData: any): AdminAuthResponse {
        const admin = this.decode(responseData?.admin || {});

        if (responseData?.token && responseData?.admin) {
            this.client.authStore.save(responseData.token, admin);
        }

        return Object.assign({}, responseData, {
            // normalize common fields
            'token': responseData?.token || '',
            'admin': admin,
        });
    }

    /**
     * Authenticate an admin account with its email and password
     * and returns a new admin token and data.
     *
     * On success this method automatically updates the client's AuthStore data.
     */
    authWithPassword(
        email: string,
        password: string,
        bodyParams = {},
        queryParams: BaseQueryParams = {},
    ): Promise<AdminAuthResponse> {
        bodyParams = Object.assign({
            'identity': email,
            'password': password,
        }, bodyParams);

        return this.client.send(this.baseCrudPath + '/auth-with-password', {
            'method':  'POST',
            'params':  queryParams,
            'body':    bodyParams,
        }).then(this.authResponse.bind(this));
    }

    /**
     * Refreshes the current admin authenticated instance and
     * returns a new token and admin data.
     *
     * On success this method automatically updates the client's AuthStore data.
     */
    authRefresh(bodyParams = {}, queryParams: BaseQueryParams = {}): Promise<AdminAuthResponse> {
        return this.client.send(this.baseCrudPath + '/auth-refresh', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(this.authResponse.bind(this));
    }

    /**
     * Sends admin password reset request.
     */
    requestPasswordReset(
        email: string,
        bodyParams = {},
        queryParams: BaseQueryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'email': email,
        }, bodyParams);

        return this.client.send(this.baseCrudPath + '/request-password-reset', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }

    /**
     * Confirms admin password reset request.
     */
    confirmPasswordReset(
        passwordResetToken: string,
        password: string,
        passwordConfirm: string,
        bodyParams = {},
        queryParams: BaseQueryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'token':           passwordResetToken,
            'password':        password,
            'passwordConfirm': passwordConfirm,
        }, bodyParams);

        return this.client.send(this.baseCrudPath + '/confirm-password-reset', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }
}
