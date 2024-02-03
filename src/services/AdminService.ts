import { CrudService } from "@/services/utils/CrudService";
import { AdminModel } from "@/services/utils/dtos";
import { AuthOptions, CommonOptions } from "@/services/utils/options";
import { normalizeLegacyOptionsArgs } from "@/services/utils/legacy";
import { registerAutoRefresh, resetAutoRefresh } from "@/services/utils/refresh";

export interface AdminAuthResponse {
    [key: string]: any;

    token: string;
    admin: AdminModel;
}

export class AdminService extends CrudService<AdminModel> {
    /**
     * @inheritdoc
     */
    get baseCrudPath(): string {
        return "/api/admins";
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
    async update<T = AdminModel>(
        id: string,
        bodyParams?: { [key: string]: any } | FormData,
        options?: CommonOptions,
    ): Promise<T> {
        return super.update(id, bodyParams, options).then((item) => {
            // update the store state if the updated item id matches with the stored model
            if (
                this.client.authStore.model?.id === item.id &&
                typeof this.client.authStore.model?.collectionId === "undefined" // is not record auth
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
            // clear the store state if the deleted item id matches with the stored model
            if (
                success &&
                this.client.authStore.model?.id === id &&
                typeof this.client.authStore.model?.collectionId === "undefined" // is not record auth
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
            token: responseData?.token || "",
            admin: admin,
        });
    }

    /**
     * Authenticate an admin account with its email and password
     * and returns a new admin token and data.
     *
     * On success this method automatically updates the client's AuthStore data.
     *
     * @throws {ClientResponseError}
     */
    async authWithPassword(
        email: string,
        password: string,
        options?: AuthOptions,
    ): Promise<AdminAuthResponse>;

    /**
     * @deprecated
     * Consider using authWithPassword(email, password, options?).
     */
    async authWithPassword(
        email: string,
        password: string,
        body?: any,
        query?: any,
    ): Promise<AdminAuthResponse>;

    async authWithPassword(
        email: string,
        password: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<AdminAuthResponse> {
        let options: any = {
            method: "POST",
            body: {
                identity: email,
                password: password,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of authWithPassword(email, pass, body?, query?) is deprecated. Consider replacing it with authWithPassword(email, pass, options?).",
            options,
            bodyOrOptions,
            query,
        );

        const autoRefreshThreshold = options.autoRefreshThreshold;
        delete options.autoRefreshThreshold;

        // not from auto refresh reauthentication
        if (!options.autoRefresh) {
            resetAutoRefresh(this.client);
        }

        let authData = await this.client.send(
            this.baseCrudPath + "/auth-with-password",
            options,
        );

        authData = this.authResponse(authData);

        if (autoRefreshThreshold) {
            registerAutoRefresh(
                this.client,
                autoRefreshThreshold,
                () => this.authRefresh({ autoRefresh: true }),
                () =>
                    this.authWithPassword(
                        email,
                        password,
                        Object.assign({ autoRefresh: true }, options),
                    ),
            );
        }

        return authData;
    }

    /**
     * Refreshes the current admin authenticated instance and
     * returns a new token and admin data.
     *
     * On success this method automatically updates the client's AuthStore data.
     *
     * @throws {ClientResponseError}
     */
    async authRefresh(options?: CommonOptions): Promise<AdminAuthResponse>;

    /**
     * @deprecated
     * Consider using authRefresh(options?).
     */
    async authRefresh(body?: any, query?: any): Promise<AdminAuthResponse>;

    async authRefresh(bodyOrOptions?: any, query?: any): Promise<AdminAuthResponse> {
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
            .send(this.baseCrudPath + "/auth-refresh", options)
            .then(this.authResponse.bind(this));
    }

    /**
     * Sends admin password reset request.
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
            .send(this.baseCrudPath + "/request-password-reset", options)
            .then(() => true);
    }

    /**
     * Confirms admin password reset request.
     *
     * @throws {ClientResponseError}
     */
    async confirmPasswordReset(
        resetToken: string,
        password: string,
        passwordConfirm: string,
        options?: CommonOptions,
    ): Promise<boolean>;

    /**
     * @deprecated
     * Consider using confirmPasswordReset(resetToken, password, passwordConfirm, options?).
     */
    async confirmPasswordReset(
        resetToken: string,
        password: string,
        passwordConfirm: string,
        body?: any,
        query?: any,
    ): Promise<boolean>;

    async confirmPasswordReset(
        resetToken: string,
        password: string,
        passwordConfirm: string,
        bodyOrOptions?: any,
        query?: any,
    ): Promise<boolean> {
        let options: any = {
            method: "POST",
            body: {
                token: resetToken,
                password: password,
                passwordConfirm: passwordConfirm,
            },
        };

        options = normalizeLegacyOptionsArgs(
            "This form of confirmPasswordReset(resetToken, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(resetToken, password, passwordConfirm, options?).",
            options,
            bodyOrOptions,
            query,
        );

        return this.client
            .send(this.baseCrudPath + "/confirm-password-reset", options)
            .then(() => true);
    }
}
