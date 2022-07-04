import CrudService from '@/services/utils/CrudService';
import Admin       from '@/models/Admin';

export type AdminAuthResponse = {
    [key: string]: any,
    token: string,
    admin: Admin,
}

export default class Admins extends CrudService<Admin> {
    /**
     * @inheritdoc
     */
    decode(data: { [key: string]: any }): Admin {
        return new Admin(data);
    }

    /**
     * @inheritdoc
     */
    baseCrudPath(): string {
        return '/api/admins';
    }

    /**
     * Prepare successfull authorize response.
     */
    protected authResponse(response: any): AdminAuthResponse {
        const admin = this.decode(response?.data?.admin || {});

        if (response?.data?.token && response?.data?.admin) {
            this.client.AuthStore.save(response.data.token, admin);
        }

        return Object.assign({}, response?.data, {
            // normalize common fields
            'token': response?.data?.token || '',
            'admin': admin,
        });
    }

    /**
     * Authenticate an admin account by its email and password
     * and returns a new admin token and data.
     *
     * On success this method automatically updates the client's AuthStore data.
     */
    authViaEmail(
        email: string,
        password: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<AdminAuthResponse> {
        bodyParams = Object.assign({
            'email':    email,
            'password': password,
        }, bodyParams);

        return this.client.send({
            'method':  'post',
            'url':     this.baseCrudPath() + '/auth-via-email',
            'params':  queryParams,
            'data':    bodyParams,
            'headers': {
                'Authorization': '',
            },
        }).then(this.authResponse.bind(this));
    }

    /**
     * Refreshes the current admin authenticated instance and
     * returns a new token and admin data.
     *
     * On success this method automatically updates the client's AuthStore data.
     */
    refresh(bodyParams = {}, queryParams = {}): Promise<AdminAuthResponse> {
        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/refresh',
            'params': queryParams,
            'data':   bodyParams,
        }).then(this.authResponse.bind(this));
    }

    /**
     * Sends admin password reset request.
     */
    requestPasswordReset(
        email: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'email': email,
        }, bodyParams);

        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/request-password-reset',
            'params': queryParams,
            'data':   bodyParams,
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
        queryParams = {},
    ): Promise<AdminAuthResponse> {
        bodyParams = Object.assign({
            'token':           passwordResetToken,
            'password':        password,
            'passwordConfirm': passwordConfirm,
        }, bodyParams);

        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/confirm-password-reset',
            'params': queryParams,
            'data':   bodyParams,
        }).then(this.authResponse.bind(this));
    }
}
