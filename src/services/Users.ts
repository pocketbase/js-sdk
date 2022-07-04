import CrudService from '@/services/utils/CrudService';
import User        from '@/models/User';

export type UserAuthResponse = {
    [key: string]: any,
    token:         string,
    user:          User,
}

export type AuthProviderInfo = {
    name:                string,
    state:               string,
    codeVerifier:        string,
    codeChallenge:       string,
    codeChallengeMethod: string,
    authUrl:             string,
}

export type AuthMethodsList = {
    [key: string]: any,
    emailPassword: boolean,
    authProviders: Array<AuthProviderInfo>,
}

export default class Users extends CrudService<User> {
    /**
     * @inheritdoc
     */
    decode(data: { [key: string]: any }): User {
        return new User(data);
    }

    /**
     * @inheritdoc
     */
    baseCrudPath(): string {
        return '/api/users';
    }

    /**
     * Prepare successfull authorization response.
     */
    protected authResponse(response: any): UserAuthResponse {
        const user = this.decode(response?.data?.user || {});

        if (response?.data?.token && response?.data?.user) {
            this.client.AuthStore.save(response.data.token, user);
        }

        return Object.assign({}, response?.data, {
            // normalize common fields
            'token': response?.data?.token || '',
            'user':  user,
        });
    }

    /**
     * Returns all available application auth methods.
     */
    listAuthMethods(queryParams = {}): Promise<AuthMethodsList> {
        return this.client.send({
            'method': 'get',
            'url':    this.baseCrudPath() + '/auth-methods',
            'params': queryParams,
        }).then((response: any) => {
            return Object.assign({}, response?.data, {
                // normalize common fields
                'emailPassword':  !!response?.data?.emailPassword,
                'authProviders': Array.isArray(response?.data?.authProviders) ? response?.data?.authProviders : [],
            });
        });
    }

    /**
     * Authenticate a user via its email and password.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - new user authentication token
     * - the authenticated user model record
     */
    authViaEmail(
        email: string,
        password: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<UserAuthResponse> {
        bodyParams = Object.assign({
            'email':    email,
            'password': password,
        }, bodyParams);

        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/auth-via-email',
            'params': queryParams,
            'data':   bodyParams,
            'headers': {
                'Authorization': '',
            },
        }).then(this.authResponse.bind(this));
    }

    /**
     * Authenticate a user via OAuth2 client provider.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - new user authentication token
     * - the authenticated user model record
     * - the OAuth2 user profile data (eg. name, email, avatar, etc.)
     */
    authViaOAuth2(
        provider: string,
        code: string,
        codeVerifier: string,
        redirectUrl: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<UserAuthResponse> {
        bodyParams = Object.assign({
            'provider':     provider,
            'code':         code,
            'codeVerifier': codeVerifier,
            'redirectUrl':  redirectUrl,
        }, bodyParams);

        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/auth-via-oauth2',
            'params': queryParams,
            'data':   bodyParams,
            'headers': {
                'Authorization': '',
            },
        }).then(this.authResponse.bind(this));
    }

    /**
     * Refreshes the current user authenticated instance and
     * returns a new token and user data.
     *
     * On success this method also automatically updates the client's AuthStore data.
     */
    refresh(bodyParams = {}, queryParams = {}): Promise<UserAuthResponse> {
        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/refresh',
            'params': queryParams,
            'data':   bodyParams,
        }).then(this.authResponse.bind(this));
    }

    /**
     * Sends user password reset request.
     */
    requestPasswordReset(
        email: string,
        bodyParams  = {},
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
     * Confirms user password reset request.
     */
    confirmPasswordReset(
        passwordResetToken: string,
        password: string,
        passwordConfirm: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<UserAuthResponse> {
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

    /**
     * Sends user verification email request.
     */
    requestVerification(
        email: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'email': email,
        }, bodyParams);

        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/request-verification',
            'params': queryParams,
            'data':   bodyParams,
        }).then(() => true);
    }

    /**
     * Confirms user email verification request.
     */
    confirmVerification(
        verificationToken: string,
        bodyParams  = {},
        queryParams = {},
    ): Promise<UserAuthResponse> {
        bodyParams = Object.assign({
            'token': verificationToken,
        }, bodyParams);

        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/confirm-verification',
            'params': queryParams,
            'data':   bodyParams,
        }).then(this.authResponse.bind(this));
    }

    /**
     * Sends an email change request to the authenticated user.
     */
    requestEmailChange(
        newEmail: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'newEmail': newEmail,
        }, bodyParams);

        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/request-email-change',
            'params': queryParams,
            'data':   bodyParams,
        }).then(() => true);
    }

    /**
     * Confirms user new email address.
     */
    confirmEmailChange(
        emailChangeToken: string,
        password: string,
        bodyParams  = {},
        queryParams = {},
    ): Promise<UserAuthResponse> {
        bodyParams = Object.assign({
            'token': emailChangeToken,
            'password': password,
        }, bodyParams);

        return this.client.send({
            'method': 'post',
            'url':    this.baseCrudPath() + '/confirm-email-change',
            'params': queryParams,
            'data':   bodyParams,
        }).then(this.authResponse.bind(this));
    }
}
