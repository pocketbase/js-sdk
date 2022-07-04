import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    CancelTokenSource
}                     from 'axios';
import qs             from 'qs';
import { AuthStore }  from '@/stores/utils/AuthStore';
import LocalAuthStore from '@/stores/LocalAuthStore';
import Settings       from '@/services/Settings';
import Admins         from '@/services/Admins';
import Users          from '@/services/Users';
import Collections    from '@/services/Collections';
import Records        from '@/services/Records';
import Logs           from '@/services/Logs';
import Realtime       from '@/services/Realtime';

/**
 * PocketBase API Client.
 */
export default class Client {
    AuthStore: AuthStore;

    readonly http:        AxiosInstance;
    readonly Settings:    Settings;
    readonly Admins:      Admins;
    readonly Users:       Users;
    readonly Collections: Collections;
    readonly Records:     Records;
    readonly Logs:        Logs;
    readonly Realtime:    Realtime;

    private cancelSource: { [key: string]: CancelTokenSource } = {}
    private defaultAuthStore = new LocalAuthStore();

    constructor(
        baseUrl = '/',
        lang = 'en-US',
        authStore?: AuthStore | null,
        httpConfig?: AxiosRequestConfig,
    ) {
        // init HTTP client
        this.http = axios.create(Object.assign({
            paramsSerializer: (params: any) => {
                // remove null query params
                let nonEmptyConfig: { [key: string]: any } = {};
                for (let k in params) {
                    if (params[k] === null) {
                        continue;
                    }

                    nonEmptyConfig[k] = params[k];
                }

                return qs.stringify(nonEmptyConfig, {
                    arrayFormat: 'repeat',
                    serializeDate: (d) => d.toISOString(),
                });
            },
        }, (httpConfig || {})));

        // handle auto cancelation for duplicated pending request
        this.http.interceptors.request.use((config) => {
            if (!config.cancelToken && config?.params?.$autoCancel !== false) {
                let cancelKey = config?.params?.$cancelKey || ((config.method || 'get') + config.url);

                this.cancelRequest(cancelKey); // abort previous pending requests
                this.cancelSource[cancelKey] = axios.CancelToken.source();
                config.cancelToken = this.cancelSource[cancelKey].token;
            }

            // remove custom cancellation params from the request data
            delete config?.params?.$autoCancel;
            delete config?.params?.$cancelKey;

            return config;
        });
        this.http.interceptors.response.use((response) => {
            // delete stored cancel source key
            // delete this.cancelSource[response.config.cancelKey];
            return response;
        }, (error) => {
            if (axios.isCancel(error)) {
                // silently reject the cancellation error...
                return Promise.reject(null);
            }
            return Promise.reject(error);
        });

        this.baseUrl     = baseUrl;
        this.language    = lang;
        this.AuthStore   = authStore || this.defaultAuthStore;
        this.Settings    = new Settings(this);
        this.Admins      = new Admins(this);
        this.Users       = new Users(this);
        this.Collections = new Collections(this);
        this.Records     = new Records(this);
        this.Logs        = new Logs(this);
        this.Realtime    = new Realtime(this);
    }

    /**
     * Returns the default http client base url.
     */
    get baseUrl(): string {
        return this.http.defaults.baseURL || '';
    };

    /**
     * Sets the default http client base url.
     */
    set baseUrl(url: string) {
        this.http.defaults.baseURL = url.replace(/\/+$/, '');
    };

    /**
     * Sets (or remove) the default Accept-Language header.
     */
    set language(lang: string) {
        if (lang) {
            this.http.defaults.headers.common['Accept-Language'] = lang;
        } else {
            delete this.http.defaults.headers.common['Accept-Language'];
        }
    }

    /**
     * Cancels single request by its cancellation token key.
     */
    cancelRequest(cancelKey: string): Client {
        if (this.cancelSource[cancelKey]) {
            this.cancelSource[cancelKey].cancel();
            delete this.cancelSource[cancelKey];
        }

        return this;
    }

    /**
     * Cancels all pending requests.
     */
    cancelAllRequests(): Client {
        for (let k in this.cancelSource) {
            this.cancelSource[k].cancel();
        }

        return this;
    }

    /**
     * Sends an api http request.
     */
    send(reqConfig: AxiosRequestConfig): Promise<any> {
        const config = Object.assign({}, reqConfig);

        if (
            // has stored token
            this.AuthStore?.token &&
            // auth header is not explicitly set
            (typeof config?.headers?.Authorization === 'undefined')
        ) {
            let authType = 'Admin';
            if (typeof (this.AuthStore.model as any)?.verified !== 'undefined') {
                authType = 'User'; // admins don't have verified
            }

            config.headers = Object.assign({}, config.headers, {
                'Authorization': (authType + ' ' + this.AuthStore.token),
            });
        }

        return this.http.request(config);
    }
}
