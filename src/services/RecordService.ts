import Client from "@/Client";
import { getTokenPayload } from "@/stores/utils/jwt";
import { CrudService } from "@/services/utils/CrudService";
import { RealtimeService, UnsubscribeFunc } from "@/services/RealtimeService";
import { ClientResponseError } from "@/ClientResponseError";
import { ListResult, RecordModel, ExternalAuthModel } from "@/services/utils/dtos";
import {
    SendOptions,
    CommonOptions,
    RecordOptions,
    RecordListOptions,
    RecordFullListOptions,
} from "@/services/utils/options";
import { normalizeLegacyOptionsArgs } from "@/services/utils/legacy";

export interface RecordAuthResponse<T = RecordModel> {
    /**
     * The signed PocketBase auth record.
     */
    record: T;

    /**
     * The PocketBase record auth token.
     *
     * If you are looking for the OAuth2 access and refresh tokens
     * they are available under the `meta.accessToken` and `meta.refreshToken` props.
     */
    token: string;

    /**
     * Auth meta data usually filled when OAuth2 is used.
     */
    meta?: { [key: string]: any };
}

export interface AuthProviderInfo {
    name: string;
    displayName: string;
    state: string;
    authUrl: string;
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: string;
}

export interface AuthMethodsList {
    usernamePassword: boolean;
    emailPassword: boolean;
    onlyVerified: boolean;
    authProviders: Array<AuthProviderInfo>;
}

export interface RecordSubscription<T = RecordModel> {
    action: string; // eg. create, update, delete
    record: T;
}

export type OAuth2UrlCallback = (url: string) => void | Promise<void>;

export interface OAuth2AuthConfig extends SendOptions {
    // the name of the OAuth2 provider (eg. "google")
    provider: string;

    // custom scopes to overwrite the default ones
    scopes?: Array<string>;

    // optional record create data
    createData?: { [key: string]: any };

    // optional callback that is triggered after the OAuth2 sign-in/sign-up url generation
    urlCallback?: OAuth2UrlCallback;

    // optional query params to send with the PocketBase auth request (eg. fields, expand, etc.)
    query?: RecordOptions;
}

export class RecordService<M = RecordModel> extends CrudService<M> {
    readonly collectionIdOrName: string;

    constructor(client: Client, collectionIdOrName: string) {
        super(client);

        this.collectionIdOrName = collectionIdOrName;
    }

    /**
     * @inheritdoc
     */
    get baseCrudPath(): string {
        return this.baseCollectionPath + "/records";
    }

    /**
     * Returns the current collection service base path.
     */
    get baseCollectionPath(): string {
        return "/api/collections/" + encodeURIComponent(this.collectionIdOrName);
    }

    // ---------------------------------------------------------------
    // Realtime handlers
    // ---------------------------------------------------------------

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
    async subscribe<T = M>(
        topic: string,
        callback: (data: RecordSubscription<T>) => void,
        options?: SendOptions,
    ): Promise<UnsubscribeFunc> {
        if (!topic) {
            throw new Error("Missing topic.");
        }

        if (!callback) {
            throw new Error("Missing subscription callback.");
        }

        return this.client.realtime.subscribe(
            this.collectionIdOrName + "/" + topic,
            callback,
            options,
        );
    }

    /**
     * Unsubscribe from all subscriptions of the specified topic
     * ("*" or record id).
     *
     * If `topic` is not set, then this method will unsubscribe from
     * all subscriptions associated to the current collection.
     */
    async unsubscribe(topic?: string): Promise<void> {
        // unsubscribe from the specified topic
        if (topic) {
            return this.client.realtime.unsubscribe(
                this.collectionIdOrName + "/" + topic,
            );
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
    async getFullList<T = M>(options?: RecordFullListOptions): Promise<Array<T>>;

    /**
     * @inheritdoc
     */
    async getFullList<T = M>(
        batch?: number,
        options?: RecordListOptions,
    ): Promise<Array<T>>;

    /**
     * @inheritdoc
     */
    async getFullList<T = M>(
        batchOrOptions?: number | RecordFullListOptions,
        options?: RecordListOptions,
    ): Promise<Array<T>> {
        if (typeof batchOrOptions == "number") {
            return super.getFullList<T>(batchOrOptions, options);
        }

        const params = Object.assign({}, batchOrOptions, options);

        return super.getFullList<T>(params);
    }

    /**
     * @inheritdoc
     */
    async getList<T = M>(
        page = 1,
        perPage = 30,
        options?: RecordListOptions,
    ): Promise<ListResult<T>> {
        return super.getList<T>(page, perPage, options);
    }

    /**
     * @inheritdoc
     */
    async getFirstListItem<T = M>(
        filter: string,
        options?: RecordListOptions,
    ): Promise<T> {
        return super.getFirstListItem<T>(filter, options);
    }

    /**
     * @inheritdoc
     */
    async getOne<T = M>(id: string, options?: RecordOptions): Promise<T> {
        return super.getOne<T>(id, options);
    }

    /**
     * @inheritdoc
     */
    async create<T = M>(
        bodyParams?: { [key: string]: any } | FormData,
        options?: RecordOptions,
    ): Promise<T> {
        return super.create<T>(bodyParams, options);
    }

    /**
     * @inheritdoc
     *
     * If the current `client.authStore.model` matches with the updated id, then
     * on success the `client.authStore.model` will be updated with the result.
     */
    async update<T = M>(
        id: string,
        bodyParams?: { [key: string]: any } | FormData,
        options?: RecordOptions,
    ): Promise<T> {
        return super.update<RecordModel>(id, bodyParams, options).then((item) => {
            if (
                // is record auth
                this.client.authStore.model?.id === item?.id &&
                (this.client.authStore.model?.collectionId === this.collectionIdOrName ||
                    this.client.authStore.model?.collectionName ===
                        this.collectionIdOrName)
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
    async delete(id: string, options?: CommonOptions): Promise<boolean> {
        return super.delete(id, options).then((success) => {
            if (
                success &&
                // is record auth
                this.client.authStore.model?.id === id &&
                (this.client.authStore.model?.collectionId === this.collectionIdOrName ||
                    this.client.authStore.model?.collectionName ===
                        this.collectionIdOrName)
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
    protected authResponse<T = M>(responseData: any): RecordAuthResponse<T> {
        const record = this.decode(responseData?.record || {});

        this.client.authStore.save(responseData?.token, record as any);

        return Object.assign({}, responseData, {
            // normalize common fields
            token: responseData?.token || "",
            record: record as any as T,
        });
    }

    /**
     * Returns all available collection auth methods.
     *
     * @throws {ClientResponseError}
     */
    async listAuthMethods(options?: CommonOptions): Promise<AuthMethodsList> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client
            .send(this.baseCollectionPath + "/auth-methods", options)
            .then((responseData: any) => {
                return Object.assign({}, responseData, {
                    // normalize common fields
                    usernamePassword: !!responseData?.usernamePassword,
                    emailPassword: !!responseData?.emailPassword,
                    authProviders: Array.isArray(responseData?.authProviders)
                        ? responseData?.authProviders
                        : [],
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
     *
     * @throws {ClientResponseError}
     */
    async authWithPassword<T = M>(
        usernameOrEmail: string,
        password: string,
        options?: RecordOptions,
    ): Promise<RecordAuthResponse<T>>;

    /**
     * @deprecated
     * Consider using authWithPassword(usernameOrEmail, password, options?).
     */
    async authWithPassword<T = M>(
        usernameOrEmail: string,
        password: string,
        body?: any,
        query?: any,
    ): Promise<RecordAuthResponse<T>>;

    async authWithPassword<T = M>(
        usernameOrEmail: string,
        password: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<RecordAuthResponse<T>> {
        let options: any = {
            method: "POST",
            body: {
                identity: usernameOrEmail,
                password: password,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of authWithPassword(usernameOrEmail, pass, body?, query?) is deprecated. Consider replacing it with authWithPassword(usernameOrEmail, pass, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/auth-with-password", options)
            .then((data) => this.authResponse<T>(data));
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
     *
     * @throws {ClientResponseError}
     */
    async authWithOAuth2Code<T = M>(
        provider: string,
        code: string,
        codeVerifier: string,
        redirectUrl: string,
        createData?: { [key: string]: any },
        options?: RecordOptions,
    ): Promise<RecordAuthResponse<T>>;

    /**
     * @deprecated
     * Consider using authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createdData, options?).
     */
    async authWithOAuth2Code<T = M>(
        provider: string,
        code: string,
        codeVerifier: string,
        redirectUrl: string,
        createData?: { [key: string]: any },
        body?: any,
        query?: any,
    ): Promise<RecordAuthResponse<T>>;

    async authWithOAuth2Code<T = M>(
        provider: string,
        code: string,
        codeVerifier: string,
        redirectUrl: string,
        createData?: { [key: string]: any },
        bodyOrOptions?: any,
        query?: any,
    ): Promise<RecordAuthResponse<T>> {
        let options: any = {
            method: "POST",
            body: {
                provider: provider,
                code: code,
                codeVerifier: codeVerifier,
                redirectUrl: redirectUrl,
                createData: createData,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createData?, body?, query?) is deprecated. Consider replacing it with authWithOAuth2Code(provider, code, codeVerifier, redirectUrl, createData?, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/auth-with-oauth2", options)
            .then((data) => this.authResponse<T>(data));
    }

    /**
     * @deprecated This form of authWithOAuth2 is deprecated.
     *
     * Please use `authWithOAuth2Code()` OR its simplified realtime version
     * as shown in https://pocketbase.io/docs/authentication/#oauth2-integration.
     */
    async authWithOAuth2<T = M>(
        provider: string,
        code: string,
        codeVerifier: string,
        redirectUrl: string,
        createData?: { [key: string]: any },
        bodyParams?: { [key: string]: any },
        queryParams?: RecordOptions,
    ): Promise<RecordAuthResponse<T>>;

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
     *
     * @throws {ClientResponseError}
     */
    async authWithOAuth2<T = M>(
        options: OAuth2AuthConfig,
    ): Promise<RecordAuthResponse<T>>;

    async authWithOAuth2<T = M>(...args: any): Promise<RecordAuthResponse<T>> {
        // fallback to legacy format
        if (args.length > 1 || typeof args?.[0] === "string") {
            console.warn(
                "PocketBase: This form of authWithOAuth2() is deprecated and may get removed in the future. Please replace with authWithOAuth2Code() OR use the authWithOAuth2() realtime form as shown in https://pocketbase.io/docs/authentication/#oauth2-integration.",
            );
            return this.authWithOAuth2Code<T>(
                args?.[0] || "",
                args?.[1] || "",
                args?.[2] || "",
                args?.[3] || "",
                args?.[4] || {},
                args?.[5] || {},
                args?.[6] || {},
            );
        }

        const config = args?.[0] || {};

        const authMethods = await this.listAuthMethods();

        const provider = authMethods.authProviders.find(
            (p) => p.name === config.provider,
        );
        if (!provider) {
            throw new ClientResponseError(
                new Error(`Missing or invalid provider "${config.provider}".`),
            );
        }

        const redirectUrl = this.client.buildUrl("/api/oauth2-redirect");

        // initialize a one-off realtime service
        const realtime = new RealtimeService(this.client);

        // open a new popup window in case config.urlCallback is not set
        //
        // note: it is opened before the async call due to Safari restrictions
        // (see https://github.com/pocketbase/pocketbase/discussions/2429#discussioncomment-5943061)
        let eagerDefaultPopup: Window | null = null;
        if (!config.urlCallback) {
            eagerDefaultPopup = openBrowserPopup(undefined);
        }

        function cleanup() {
            eagerDefaultPopup?.close();
            realtime.unsubscribe();
        }

        return new Promise(async (resolve, reject) => {
            try {
                await realtime.subscribe("@oauth2", async (e) => {
                    const oldState = realtime.clientId;

                    try {
                        if (!e.state || oldState !== e.state) {
                            throw new Error("State parameters don't match.");
                        }

                        if (e.error || !e.code) {
                            throw new Error(
                                "OAuth2 redirect error or missing code: " + e.error,
                            );
                        }

                        // clear the non SendOptions props
                        const options = Object.assign({}, config);
                        delete options.provider;
                        delete options.scopes;
                        delete options.createData;
                        delete options.urlCallback;

                        const authData = await this.authWithOAuth2Code<T>(
                            provider.name,
                            e.code,
                            provider.codeVerifier,
                            redirectUrl,
                            config.createData,
                            options,
                        );

                        resolve(authData);
                    } catch (err) {
                        reject(new ClientResponseError(err));
                    }

                    cleanup();
                });

                const replacements: { [key: string]: any } = {
                    state: realtime.clientId,
                };
                if (config.scopes?.length) {
                    replacements["scope"] = config.scopes.join(" ");
                }

                const url = this._replaceQueryParams(
                    provider.authUrl + redirectUrl,
                    replacements,
                );

                let urlCallback =
                    config.urlCallback ||
                    function (url: string) {
                        if (eagerDefaultPopup) {
                            eagerDefaultPopup.location.href = url;
                        } else {
                            // it could have been blocked due to its empty initial url,
                            // try again...
                            eagerDefaultPopup = openBrowserPopup(url);
                        }
                    };

                await urlCallback(url);
            } catch (err) {
                cleanup();
                reject(new ClientResponseError(err));
            }
        });
    }

    /**
     * Refreshes the current authenticated record instance and
     * returns a new token and record data.
     *
     * On success this method also automatically updates the client's AuthStore.
     *
     * @throws {ClientResponseError}
     */
    async authRefresh<T = M>(options?: RecordOptions): Promise<RecordAuthResponse<T>>;

    /**
     * @deprecated
     * Consider using authRefresh(options?).
     */
    async authRefresh<T = M>(body?: any, query?: any): Promise<RecordAuthResponse<T>>;

    async authRefresh<T = M>(
        bodyOrOptions?: any,
        query?: any,
    ): Promise<RecordAuthResponse<T>> {
        let options: any = {
            method: "POST",
        };

        options = normalizeLegacyOptionsArgs(
            "This form of authRefresh(body?, query?) is deprecated. Consider replacing it with authRefresh(options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/auth-refresh", options)
            .then((data) => this.authResponse<T>(data));
    }

    /**
     * Sends auth record password reset request.
     *
     * @throws {ClientResponseError}
     */
    async requestPasswordReset(email: string, options?: CommonOptions): Promise<boolean>;

    /**
     * @deprecated
     * Consider using requestPasswordReset(email, options?).
     */
    async requestPasswordReset(email: string, body?: any, query?: any): Promise<boolean>;

    async requestPasswordReset(
        email: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<boolean> {
        let options: any = {
            method: "POST",
            body: {
                email: email,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of requestPasswordReset(email, body?, query?) is deprecated. Consider replacing it with requestPasswordReset(email, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/request-password-reset", options)
            .then(() => true);
    }

    /**
     * Confirms auth record password reset request.
     *
     * @throws {ClientResponseError}
     */
    async confirmPasswordReset(
        passwordResetToken: string,
        password: string,
        passwordConfirm: string,
        options?: CommonOptions,
    ): Promise<boolean>;

    /**
     * @deprecated
     * Consider using confirmPasswordReset(passwordResetToken, password, passwordConfirm, options?).
     */
    async confirmPasswordReset(
        passwordResetToken: string,
        password: string,
        passwordConfirm: string,
        body?: any,
        query?: any,
    ): Promise<boolean>;

    async confirmPasswordReset(
        passwordResetToken: string,
        password: string,
        passwordConfirm: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<boolean> {
        let options: any = {
            method: "POST",
            body: {
                token: passwordResetToken,
                password: password,
                passwordConfirm: passwordConfirm,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of confirmPasswordReset(token, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(token, password, passwordConfirm, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/confirm-password-reset", options)
            .then(() => true);
    }

    /**
     * Sends auth record verification email request.
     *
     * @throws {ClientResponseError}
     */
    async requestVerification(email: string, options?: CommonOptions): Promise<boolean>;

    /**
     * @deprecated
     * Consider using requestVerification(email, options?).
     */
    async requestVerification(email: string, body?: any, query?: any): Promise<boolean>;

    async requestVerification(
        email: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<boolean> {
        let options: any = {
            method: "POST",
            body: {
                email: email,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of requestVerification(email, body?, query?) is deprecated. Consider replacing it with requestVerification(email, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/request-verification", options)
            .then(() => true);
    }

    /**
     * Confirms auth record email verification request.
     *
     * If the current `client.authStore.model` matches with the auth record from the token,
     * then on success the `client.authStore.model.verified` will be updated to `true`.
     *
     * @throws {ClientResponseError}
     */
    async confirmVerification(
        verificationToken: string,
        options?: CommonOptions,
    ): Promise<boolean>;

    /**
     * @deprecated
     * Consider using confirmVerification(verificationToken, options?).
     */
    async confirmVerification(
        verificationToken: string,
        body?: any,
        query?: any,
    ): Promise<boolean>;

    async confirmVerification(
        verificationToken: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<boolean> {
        let options: any = {
            method: "POST",
            body: {
                token: verificationToken,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of confirmVerification(token, body?, query?) is deprecated. Consider replacing it with confirmVerification(token, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/confirm-verification", options)
            .then(() => {
                // on success manually update the current auth record verified state
                const payload = getTokenPayload(verificationToken);
                const model = this.client.authStore.model;
                if (
                    model &&
                    !model.verified &&
                    model.id === payload.id &&
                    model.collectionId === payload.collectionId
                ) {
                    model.verified = true;
                    this.client.authStore.save(this.client.authStore.token, model);
                }

                return true;
            });
    }

    /**
     * Sends an email change request to the authenticated record model.
     *
     * @throws {ClientResponseError}
     */
    async requestEmailChange(newEmail: string, options?: CommonOptions): Promise<boolean>;

    /**
     * @deprecated
     * Consider using requestEmailChange(newEmail, options?).
     */
    async requestEmailChange(newEmail: string, body?: any, query?: any): Promise<boolean>;

    async requestEmailChange(
        newEmail: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<boolean> {
        let options: any = {
            method: "POST",
            body: {
                newEmail: newEmail,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of requestEmailChange(newEmail, body?, query?) is deprecated. Consider replacing it with requestEmailChange(newEmail, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/request-email-change", options)
            .then(() => true);
    }

    /**
     * Confirms auth record's new email address.
     *
     * If the current `client.authStore.model` matches with the auth record from the token,
     * then on success the `client.authStore` will be cleared.
     *
     * @throws {ClientResponseError}
     */
    async confirmEmailChange(
        emailChangeToken: string,
        password: string,
        options?: CommonOptions,
    ): Promise<boolean>;

    /**
     * @deprecated
     * Consider using confirmEmailChange(emailChangeToken, password, options?).
     */
    async confirmEmailChange(
        emailChangeToken: string,
        password: string,
        body?: any,
        query?: any,
    ): Promise<boolean>;

    async confirmEmailChange(
        emailChangeToken: string,
        password: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<boolean> {
        let options: any = {
            method: "POST",
            body: {
                token: emailChangeToken,
                password: password,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of confirmEmailChange(token, password, body?, query?) is deprecated. Consider replacing it with confirmEmailChange(token, password, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCollectionPath + "/confirm-email-change", options)
            .then(() => {
                const payload = getTokenPayload(emailChangeToken);
                const model = this.client.authStore.model;
                if (
                    model &&
                    model.id === payload.id &&
                    model.collectionId === payload.collectionId
                ) {
                    this.client.authStore.clear();
                }

                return true;
            });
    }

    /**
     * Lists all linked external auth providers for the specified auth record.
     *
     * @throws {ClientResponseError}
     */
    async listExternalAuths(
        recordId: string,
        options?: CommonOptions,
    ): Promise<Array<ExternalAuthModel>> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send(
            this.baseCrudPath + "/" + encodeURIComponent(recordId) + "/external-auths",
            options,
        );
    }

    /**
     * Unlink a single external auth provider from the specified auth record.
     *
     * @throws {ClientResponseError}
     */
    async unlinkExternalAuth(
        recordId: string,
        provider: string,
        options?: CommonOptions,
    ): Promise<boolean> {
        options = Object.assign(
            {
                method: "DELETE",
            },
            options,
        );

        return this.client
            .send(
                this.baseCrudPath +
                    "/" +
                    encodeURIComponent(recordId) +
                    "/external-auths/" +
                    encodeURIComponent(provider),
                options,
            )
            .then(() => true);
    }

    // ---------------------------------------------------------------

    // very rudimentary url query params replacement because at the moment
    // URL (and URLSearchParams) doesn't seem to be fully supported in React Native
    //
    // note: for details behind some of the decode/encode parsing check https://unixpapa.com/js/querystring.html
    private _replaceQueryParams(
        url: string,
        replacements: { [key: string]: any } = {},
    ): string {
        let urlPath = url;
        let query = "";

        const queryIndex = url.indexOf("?");
        if (queryIndex >= 0) {
            urlPath = url.substring(0, url.indexOf("?"));
            query = url.substring(url.indexOf("?") + 1);
        }

        const parsedParams: { [key: string]: string } = {};

        // parse the query parameters
        const rawParams = query.split("&");
        for (const param of rawParams) {
            if (param == "") {
                continue;
            }

            const pair = param.split("=");
            parsedParams[decodeURIComponent(pair[0].replace(/\+/g, " "))] =
                decodeURIComponent((pair[1] || "").replace(/\+/g, " "));
        }

        // apply the replacements
        for (let key in replacements) {
            if (!replacements.hasOwnProperty(key)) {
                continue;
            }

            if (replacements[key] == null) {
                delete parsedParams[key];
            } else {
                parsedParams[key] = replacements[key];
            }
        }

        // construct back the full query string
        query = "";
        for (let key in parsedParams) {
            if (!parsedParams.hasOwnProperty(key)) {
                continue;
            }

            if (query != "") {
                query += "&";
            }

            query +=
                encodeURIComponent(key.replace(/%20/g, "+")) +
                "=" +
                encodeURIComponent(parsedParams[key].replace(/%20/g, "+"));
        }

        return query != "" ? urlPath + "?" + query : urlPath;
    }
}

function openBrowserPopup(url?: string): Window | null {
    if (typeof window === "undefined" || !window?.open) {
        throw new ClientResponseError(
            new Error(
                `Not in a browser context - please pass a custom urlCallback function.`,
            ),
        );
    }

    let width = 1024;
    let height = 768;

    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;

    // normalize window size
    width = width > windowWidth ? windowWidth : width;
    height = height > windowHeight ? windowHeight : height;

    let left = windowWidth / 2 - width / 2;
    let top = windowHeight / 2 - height / 2;

    // note: we don't use the noopener and noreferrer attributes since
    // for some reason browser blocks such windows then url is undefined/blank
    return window.open(
        url,
        "popup_window",
        "width=" +
            width +
            ",height=" +
            height +
            ",top=" +
            top +
            ",left=" +
            left +
            ",resizable,menubar=no",
    );
}
