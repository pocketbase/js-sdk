import Client              from '@/Client';
import ClientResponseError from '@/ClientResponseError';
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
    action: string; // eg. create, update, delete
    record: T;
}

export type OAuth2UrlCallback = (url: string) => void|Promise<void>;

export interface OAuth2AuthConfig {
    // the name of the OAuth2 provider (eg. "google")
    provider: string;

    // custom scopes to overwrite the default ones
    scopes?: Array<string>;

    // optional record create data
    createData?: {[key: string]: any};

    // optional callback that is triggered after the OAuth2 sign-in/sign-up url generation
    urlCallback?: OAuth2UrlCallback,
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
     * Authenticate a single auth collection record with OAuth2 code.
     *
     * If you don't have an OAuth2 code you may also want to check `authWithOAuth2` method.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - the authentication token
     * - the authenticated record model
     * - the OAuth2 account data (eg. name, email, avatar, etc.)
     */
    authWithOAuth2Code<T = Record>(
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
     * @deprecated This form of authWithOAuth2 is deprecated.
     *
     * Please use `authWithOAuth2Code()` OR its simplified realtime version
     * as shown in https://pocketbase.io/docs/authentication/#oauth2-integration.
     */
    async authWithOAuth2<T = Record>(
        provider: string,
        code: string,
        codeVerifier: string,
        redirectUrl: string,
        createData?: {[key: string]: any},
        bodyParams?: {[key: string]: any},
        queryParams?: RecordQueryParams,
    ): Promise<RecordAuthResponse<T>>

    /**
     * Authenticate a single auth collection record with OAuth2
     * **without custom redirects, deeplinks or even page reload**.
     *
     * This method initializes a one-off realtime subscription and will
     * open a popup window with the OAuth2 vendor page to authenticate.
     * Once the external OAuth2 sign-in/sign-up flow is completed, the popup
     * window will be automatically closed and the OAuth2 data sent back
     * to the user through the previously established realtime connection.
     *
     * You can specify an optional `urlCallback` prop to customize
     * the default url `window.open` behavior.
     *
     * On success, this method also automatically updates
     * the client's AuthStore data and returns:
     * - the authentication token
     * - the authenticated record model
     * - the OAuth2 account data (eg. name, email, avatar, etc.)
     *
     * Example:
     *
     * ```js
     * const authData = await pb.collection("users").authWithOAuth2({
     *     provider: "google",
     * })
     * ```
     *
     * _Site-note_: when creating the OAuth2 app in the provider dashboard
     * you have to configure `https://yourdomain.com/api/oauth2-redirect`
     * as redirect URL.
     */
    async authWithOAuth2<T = Record>(options: OAuth2AuthConfig): Promise<RecordAuthResponse<T>>

    async authWithOAuth2<T = Record>(...args: any): Promise<RecordAuthResponse<T>> {
        // fallback to legacy format
        if (args.length > 1 || typeof args?.[0] === 'string') {
            console.warn("PocketBase: This form of authWithOAuth2() is deprecated and may get removed in the future. Please replace with authWithOAuth2Code() OR use the authWithOAuth2() realtime form as shown in https://pocketbase.io/docs/authentication/#oauth2-integration.");
            return this.authWithOAuth2Code<T>(
                args?.[0] || '',
                args?.[1] || '',
                args?.[2] || '',
                args?.[3] || '',
                args?.[4] || {},
                args?.[5] || {},
                args?.[6] || {},
            );
        }

        const config = args?.[0] || {};

        const authMethods = await this.listAuthMethods();

        const provider = authMethods.authProviders.find((p) => p.name === config.provider);
        if (!provider) {
            throw new ClientResponseError(new Error(`Missing or invalid provider "${config.provider}".`));
        }

        const redirectUrl = this.client.buildUrl('/api/oauth2-redirect');

        return new Promise(async (resolve, reject) => {
            try {
                // initialize a one-off @oauth2 realtime subscription
                const unsubscribe = await this.client.realtime.subscribe('@oauth2', async (e) => {
                    const oldState = this.client.realtime.clientId;

                    try {
                        unsubscribe();

                        if (!e.state || oldState !== e.state) {
                            throw new Error("State parameters don't match.");
                        }

                        const authData = await this.authWithOAuth2Code<T>(
                            provider.name,
                            e.code,
                            provider.codeVerifier,
                            redirectUrl,
                            config.createData
                        )

                        resolve(authData);
                    } catch (err) {
                        reject(new ClientResponseError(err));
                    }
                });

                const url = new URL(provider.authUrl + redirectUrl);
                url.searchParams.set("state", this.client.realtime.clientId);
                if (config.scopes?.length) {
                    url.searchParams.set("scope", config.scopes.join(" "));
                }

                await (config.urlCallback ? config.urlCallback(url.toString()) : this._defaultUrlCallback(url.toString()));
            } catch (err) {
                reject(new ClientResponseError(err));
            }
        });
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

    // ---------------------------------------------------------------

    private _defaultUrlCallback(url: string) {
        if (typeof window === "undefined" || !window?.open) {
            throw new ClientResponseError(new Error(`Not in a browser context - please pass a custom urlCallback function.`));
        }

        let width  = 1024;
        let height = 768;

        let windowWidth  = window.innerWidth;
        let windowHeight = window.innerHeight;

        // normalize window size
        width  = width > windowWidth ? windowWidth : width;
        height = height > windowHeight ? windowHeight : height;

        let left = (windowWidth / 2) - (width / 2);
        let top  = (windowHeight / 2) - (height / 2);

        window.open(
            url,
            "oauth2-popup",
            'width='+width+',height='+height+',top='+top+',left='+left+',resizable,menubar=no'
        );
    }
}
