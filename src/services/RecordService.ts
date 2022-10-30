import Client       from '@/Client';
import CrudService  from '@/services/utils/CrudService';
import Record       from '@/models/Record';
import ExternalAuth from '@/models/ExternalAuth';

export interface RecordAuthResponse<T = Record> {
    [key: string]: any;

    token:  string;
    record: T;
}

export interface AuthProviderInfo {
    name:                string;
    state:               string;
    codeVerifier:        string;
    codeChallenge:       string;
    codeChallengeMethod: string;
    authUrl:             string;
}

export interface AuthMethodsList {
    [key: string]: any;

    usernamePassword: boolean;
    emailPassword:    boolean;
    authProviders:    Array<AuthProviderInfo>;
}

export interface RecordSubscription<T = Record> {
    [key: string]: any;

    action: string;
    record: T;
}

export default class RecordService extends CrudService<Record> {
    readonly collectionIdOrName: string;

    constructor(client: Client, collectionIdOrName: string) {
        super(client);

        this.collectionIdOrName = collectionIdOrName;
    }

    /**
     * @inheritdoc
     */
    decode<T = Record>(data: { [key: string]: any }): T {
        return new Record(data) as any as T;
    }

    /**
     * @inheritdoc
     */
    get baseCrudPath(): string {
        return this.baseCollectionPath + '/records';
    }

    /**
     * Returns the current collection service base path.
     */
    get baseCollectionPath(): string {
        return '/api/collections/' + encodeURIComponent(this.collectionIdOrName);
    }

    // ---------------------------------------------------------------
    // Realtime handlers
    // ---------------------------------------------------------------

    /**
     * Subscribe to realtime changes of any record from the collection.
     */
    async subscribe<T = Record>(callback: (data: RecordSubscription<T>) => void): Promise<void> {
        return this.client.realtime.subscribe(this.collectionIdOrName, callback)
    }

    /**
     * Subscribe to the realtime changes of a single record in the collection.
     */
    async subscribeOne<T = Record>(recordId: string, callback: (data: RecordSubscription<T>) => void): Promise<void> {
        return this.client.realtime.subscribe(this.collectionIdOrName + "/" + recordId, callback);
    }

    /**
     * Unsubscribe from the specified realtime record subscription(s).
     *
     * If `recordIds` is not set, then this method will unsubscribe from
     * all subscriptions associated to the current collection.
     */
    async unsubscribe(...recordIds: Array<string>): Promise<void> {
        if (recordIds && recordIds.length) {
            const subs = [];
            for (let id of recordIds) {
                subs.push(this.collectionIdOrName + "/" + id);
            }
            return this.client.realtime.unsubscribe(...subs);
        }

        return this.client.realtime.unsubscribeByPrefix(this.collectionIdOrName);
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
    update<T = Record>(id: string, bodyParams = {}, queryParams = {}): Promise<T> {
        return super.update<Record>(id, bodyParams, queryParams).then((item) => {
            if (
                typeof this.client.authStore.model?.collectionId !== 'undefined' && // is record auth
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
    delete(id: string, queryParams = {}): Promise<boolean> {
        return super.delete(id, queryParams).then((success) => {
            if (
                success &&
                typeof this.client.authStore.model?.collectionId !== 'undefined' && // is record auth
                this.client.authStore.model?.id === id
            ) {
                this.client.authStore.clear();
            }

            return success;
        });
    }

    // ---------------------------------------------------------------
    // Auth collection handlers
    // ---------------------------------------------------------------

    /**
     * Prepare successful collection authorization response.
     */
    protected authResponse<T = Record>(responseData: any): RecordAuthResponse<T> {
        const record = this.decode(responseData?.record || {});

        this.client.authStore.save(responseData?.token, record);

        return Object.assign({}, responseData, {
            // normalize common fields
            'token':  responseData?.token || '',
            'record': record as any as T,
        });
    }

    /**
     * Returns all available collection auth methods.
     */
    listAuthMethods(queryParams = {}): Promise<AuthMethodsList> {
        return this.client.send(this.baseCollectionPath + '/auth-methods', {
            'method': 'GET',
            'params': queryParams,
        }).then((responseData: any) => {
            return Object.assign({}, responseData, {
                // normalize common fields
                'usernamePassword': !!responseData?.usernamePassword,
                'emailPassword':    !!responseData?.emailPassword,
                'authProviders':    Array.isArray(responseData?.authProviders) ? responseData?.authProviders : [],
            });
        });
    }

    /**
     * Authenticate a single auth collection record via its username/email and password.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - the authentication token
     * - the authenticated record model
     */
    authWithPassword<T = Record>(
        usernameOrEmail: string,
        password: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<RecordAuthResponse<T>> {
        bodyParams = Object.assign({
            'identity': usernameOrEmail,
            'password': password,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/auth-with-password', {
            'method':  'POST',
            'params':  queryParams,
            'body':    bodyParams,
            'headers': {
                'Authorization': '',
            },
        }).then((data) => this.authResponse<T>(data));
    }

    /**
     * Authenticate a single auth collection record with OAuth2.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - the authentication token
     * - the authenticated record model
     * - the OAuth2 account data (eg. name, email, avatar, etc.)
     */
    authWithOAuth2<T = Record>(
        provider: string,
        code: string,
        codeVerifier: string,
        redirectUrl: string,
        createData = {},
        bodyParams = {},
        queryParams = {},
    ): Promise<RecordAuthResponse<T>> {
        bodyParams = Object.assign({
            'provider':     provider,
            'code':         code,
            'codeVerifier': codeVerifier,
            'redirectUrl':  redirectUrl,
            'createData':  createData,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/auth-with-oauth2', {
            'method':  'POST',
            'params':  queryParams,
            'body':    bodyParams,
        }).then((data) => this.authResponse<T>(data));
    }

    /**
     * Refreshes the current authenticated record instance and
     * returns a new token and record data.
     *
     * On success this method also automatically updates the client's AuthStore.
     */
    authRefresh<T = Record>(bodyParams = {}, queryParams = {}): Promise<RecordAuthResponse<T>> {
        return this.client.send(this.baseCollectionPath + '/auth-refresh', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then((data) => this.authResponse<T>(data));
    }

    /**
     * Sends auth record password reset request.
     */
    requestPasswordReset(
        email: string,
        bodyParams  = {},
        queryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'email': email,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/request-password-reset', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }

    /**
     * Confirms auth record password reset request.
     */
    confirmPasswordReset<T = Record>(
        passwordResetToken: string,
        password: string,
        passwordConfirm: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<RecordAuthResponse<T>> {
        bodyParams = Object.assign({
            'token':           passwordResetToken,
            'password':        password,
            'passwordConfirm': passwordConfirm,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/confirm-password-reset', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then((data) => this.authResponse<T>(data));
    }

    /**
     * Sends auth record verification email request.
     */
    requestVerification(
        email: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'email': email,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/request-verification', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }

    /**
     * Confirms auth record email verification request.
     */
    confirmVerification<T = Record>(
        verificationToken: string,
        bodyParams  = {},
        queryParams = {},
    ): Promise<RecordAuthResponse<T>> {
        bodyParams = Object.assign({
            'token': verificationToken,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/confirm-verification', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then((data) => this.authResponse<T>(data));
    }

    /**
     * Sends an email change request to the authenticated record model.
     */
    requestEmailChange(
        newEmail: string,
        bodyParams = {},
        queryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'newEmail': newEmail,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/request-email-change', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }

    /**
     * Confirms auth record's new email address.
     */
    confirmEmailChange<T = Record>(
        emailChangeToken: string,
        password: string,
        bodyParams  = {},
        queryParams = {},
    ): Promise<RecordAuthResponse<T>> {
        bodyParams = Object.assign({
            'token': emailChangeToken,
            'password': password,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/confirm-email-change', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then((data) => this.authResponse<T>(data));
    }

    /**
     * Lists all linked external auth providers for the specified auth record.
     */
    listExternalAuths(
        recordId: string,
        queryParams = {}
    ): Promise<Array<ExternalAuth>> {
        return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(recordId) + '/external-auths', {
            'method': 'GET',
            'params': queryParams,
        }).then((responseData) => {
            const items: Array<ExternalAuth> = [];

            if (Array.isArray(responseData)) {
                for (const item of responseData) {
                    items.push(new ExternalAuth(item));
                }
            }

            return items;
        });
    }

    /**
     * Unlink a single external auth provider from the specified auth record.
     */
    unlinkExternalAuth(
        recordId: string,
        provider: string,
        queryParams = {}
    ): Promise<boolean> {
        return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(recordId) + '/external-auths/' + encodeURIComponent(provider), {
            'method': 'DELETE',
            'params': queryParams,
        }).then(() => true);
    }
}
