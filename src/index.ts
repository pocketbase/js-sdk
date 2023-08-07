import Client, {
    SendOptions,
    BeforeSendResult,
} from '@/Client';
import ClientResponseError from '@/ClientResponseError';
import BaseCrudService     from '@/services/utils/BaseCrudService';
import AdminService        from '@/services/AdminService';
import CollectionService   from '@/services/CollectionService';
import LogService          from '@/services/LogService';
import RealtimeService     from '@/services/RealtimeService';
import RecordService       from '@/services/RecordService';
import SettingsService     from '@/services/SettingsService';
import LocalAuthStore      from '@/stores/LocalAuthStore';
import {
    getTokenPayload,
    isTokenExpired,
} from '@/stores/utils/jwt';
import BaseAuthStore, {
    OnStoreChangeFunc,
} from '@/stores/BaseAuthStore';
import {
    RecordAuthResponse,
    AuthProviderInfo,
    AuthMethodsList,
    RecordSubscription,
    OAuth2UrlCallback,
    OAuth2AuthConfig,
} from '@/services/RecordService';
import { UnsubscribeFunc } from '@/services/RealtimeService';
import { BackupFileInfo } from '@/services/BackupService';
import { HealthCheckResponse } from '@/services/HealthService';
import {
    BaseQueryParams,
    ListQueryParams,
    RecordQueryParams,
    RecordListQueryParams,
    LogStatsQueryParams,
    FileQueryParams,
    FullListQueryParams,
    RecordFullListQueryParams,
} from '@/services/utils/QueryParams';

// @todo export model types
// import * as models from '@/services/utils/ResponseModels';

export {
    ClientResponseError,
    BaseAuthStore,
    LocalAuthStore,
    getTokenPayload,
    isTokenExpired,

    // services
    BaseCrudService,
    AdminService,
    CollectionService,
    LogService,
    RealtimeService,
    RecordService,
    SettingsService,

    //types
    HealthCheckResponse,
    BackupFileInfo,
    SendOptions,
    BeforeSendResult,
    RecordAuthResponse,
    AuthProviderInfo,
    AuthMethodsList,
    RecordSubscription,
    OAuth2UrlCallback,
    OAuth2AuthConfig,
    OnStoreChangeFunc,
    UnsubscribeFunc,
    BaseQueryParams,
    ListQueryParams,
    RecordQueryParams,
    RecordListQueryParams,
    LogStatsQueryParams,
    FileQueryParams,
    FullListQueryParams,
    RecordFullListQueryParams,
};

export default Client;
