import Client              from '@/Client';
import Record              from '@/models/Record';
import ExternalAuth        from '@/models/ExternalAuth';
import ListResult          from '@/models/utils/ListResult';
import CrudService         from '@/services/utils/CrudService';
import { UnsubscribeFunc } from '@/services/RealtimeService';
import {
    BaseQueryParams,
    RecordQueryParams,
    RecordListQueryParams,
    RecordFullListQueryParams,
} from '@/services/utils/QueryParams';

export interface RecordAuthResponse<T = Record> {
    record: T;
    token:  string;
    meta?:  {[key: string]: any};
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
    usernamePassword: boolean;
    emailPassword:    boolean;
    authProviders:    Array<AuthProviderInfo>;
}

export interface RecordSubscription<T = Record> {
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
     * @deprecated Use subscribe(recordId, callback) instead.
     *
     * Subscribe to the realtime changes of a single record in the collection.
     */
    async subscribeOne<T = Record>(recordId: string, callback: (data: RecordSubscription<T>) => void): Promise<UnsubscribeFunc> {
        console.warn("PocketBase: subscribeOne(recordId, callback) is deprecated. Please replace it with subscribe(recordId, callback).");
        return this.client.realtime.subscribe(this.collectionIdOrName + "/" + recordId, callback);
    }

    /**
     * @deprecated This form of subscribe is deprecated. Please use `subscribe("*", callback)`.
     */
    async subscribe<T = Record>(callback: (data: RecordSubscription<T>) => void): Promise<UnsubscribeFunc>

    /**
     * Subscribe to realtime changes to the specified topic ("*" or record id).
     *
     * If `topic` is the wildcard "*", then this method will subscribe to
     * any record changes in the collection.
     *
     * If `topic` is a record id, then this method will subscribe only
     * to changes of the specified record id.
     *
     * It's OK to subscribe multiple times to the same topic.
     * You can use the returned `UnsubscribeFunc` to remove only a single subscription.
     * Or use `unsubscribe(topic)` if you want to remove all subscriptions attached to the topic.
     */
    async subscribe<T = Record>(topic: string, callback: (data: RecordSubscription<T>) => void): Promise<UnsubscribeFunc>

    async subscribe<T = Record>(
        topicOrCallback: string|((data: RecordSubscription<T>) => void),
        callback?: (data: RecordSubscription<T>) => void
    ): Promise<UnsubscribeFunc> {
        if (typeof topicOrCallback === 'function') {
            console.warn("PocketBase: subscribe(callback) is deprecated. Please replace it with subscribe('*', callback).");
            return this.client.realtime.subscribe(this.collectionIdOrName, topicOrCallback);
        }

        if (!callback) {
            throw new Error("Missing subscription callback.");
        }

        if (topicOrCallback === "") {
            throw new Error("Missing topic.");
        }

        let topic = this.collectionIdOrName;
        if (topicOrCallback !== "*") {
            topic += ('/' + topicOrCallback);
        }

        return this.client.realtime.subscribe(topic, callback)
    }

    /**
     * Unsubscribe from all subscriptions of the specified topic
     * ("*" or record id).
     *
     * If `topic` is not set, then this method will unsubscribe from
     * all subscriptions associated to the current collection.
     */
    async unsubscribe(topic?: string): Promise<void> {
        // unsubscribe wildcard topic
        if (topic === "*") {
            return this.client.realtime.unsubscribe(this.collectionIdOrName);
        }

        // unsubscribe recordId topic
        if (topic) {
            return this.client.realtime.unsubscribe(this.collectionIdOrName + "/" + topic);
        }

        // unsubscribe from everything related to the collection
        return this.client.realtime.unsubscribeByPrefix(this.collectionIdOrName);
    }

    // ---------------------------------------------------------------
    // Crud handers
    // ---------------------------------------------------------------
    /**
     * @inheritdoc
     */
    getFullList<T = Record>(queryParams?: RecordFullListQueryParams): Promise<Array<T>>

    /**
     * @inheritdoc
     */
    getFullList<T = Record>(batch?: number, queryParams?: RecordListQueryParams): Promise<Array<T>>

    /**
     * @inheritdoc
     */
    getFullList<T = Record>(batchOrQueryParams?: number|RecordFullListQueryParams, queryParams?: RecordListQueryParams): Promise<Array<T>> {
        if (typeof batchOrQueryParams == "number") {
            return super.getFullList<T>(batchOrQueryParams, queryParams);
        }

        const params = Object.assign({}, batchOrQueryParams, queryParams);

        return super.getFullList<T>(params);
    }

    /**
     * @inheritdoc
     */
    getList<T = Record>(page = 1, perPage = 30, queryParams: RecordListQueryParams = {}): Promise<ListResult<T>> {
        return super.getList<T>(page, perPage, queryParams);
    }

    /**
     * @inheritdoc
     */
    getFirstListItem<T = Record>(filter: string, queryParams: RecordListQueryParams = {}): Promise<T> {
        return super.getFirstListItem<T>(filter, queryParams);
    }

    /**
     * @inheritdoc
     */
    getOne<T = Record>(id: string, queryParams: RecordQueryParams = {}): Promise<T> {
        return super.getOne<T>(id, queryParams);
    }

    /**
     * @inheritdoc
     */
    create<T = Record>(bodyParams = {}, queryParams: RecordQueryParams = {}): Promise<T> {
        return super.create<T>(bodyParams, queryParams);
    }

    /**
     * @inheritdoc
     *
     * If the current `client.authStore.model` matches with the updated id, then
     * on success the `client.authStore.model` will be updated with the result.
     */
    update<T = Record>(id: string, bodyParams = {}, queryParams: RecordQueryParams = {}): Promise<T> {
        return super.update<Record>(id, bodyParams, queryParams).then((item) => {
            if (
                // is record auth
                this.client.authStore.model?.id === item?.id &&
                (
                    this.client.authStore.model?.collectionId === this.collectionIdOrName ||
                    this.client.authStore.model?.collectionName === this.collectionIdOrName
                )
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
            if (
                success &&
                // is record auth
                this.client.authStore.model?.id === id &&
                (
                    this.client.authStore.model?.collectionId === this.collectionIdOrName ||
                    this.client.authStore.model?.collectionName === this.collectionIdOrName
                )
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
    listAuthMethods(queryParams: BaseQueryParams = {}): Promise<AuthMethodsList> {
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
        queryParams: RecordQueryParams = {},
    ): Promise<RecordAuthResponse<T>> {
        bodyParams = Object.assign({
            'identity': usernameOrEmail,
            'password': password,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/auth-with-password', {
            'method':  'POST',
            'params':  queryParams,
            'body':    bodyParams,
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
        queryParams: RecordQueryParams = {},
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
    authRefresh<T = Record>(bodyParams = {}, queryParams: RecordQueryParams = {}): Promise<RecordAuthResponse<T>> {
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
        queryParams: BaseQueryParams = {},
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

        return this.client.send(this.baseCollectionPath + '/confirm-password-reset', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }

    /**
     * Sends auth record verification email request.
     */
    requestVerification(
        email: string,
        bodyParams = {},
        queryParams: BaseQueryParams = {},
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
    confirmVerification(
        verificationToken: string,
        bodyParams  = {},
        queryParams: BaseQueryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'token': verificationToken,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/confirm-verification', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }

    /**
     * Sends an email change request to the authenticated record model.
     */
    requestEmailChange(
        newEmail: string,
        bodyParams = {},
        queryParams: BaseQueryParams = {},
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
    confirmEmailChange(
        emailChangeToken: string,
        password: string,
        bodyParams  = {},
        queryParams: BaseQueryParams = {},
    ): Promise<boolean> {
        bodyParams = Object.assign({
            'token': emailChangeToken,
            'password': password,
        }, bodyParams);

        return this.client.send(this.baseCollectionPath + '/confirm-email-change', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }

    /**
     * Lists all linked external auth providers for the specified auth record.
     */
    listExternalAuths(
        recordId: string,
        queryParams: BaseQueryParams = {}
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
        queryParams: BaseQueryParams = {}
    ): Promise<boolean> {
        return this.client.send(this.baseCrudPath + '/' + encodeURIComponent(recordId) + '/external-auths/' + encodeURIComponent(provider), {
            'method': 'DELETE',
            'params': queryParams,
        }).then(() => true);
    }
}
