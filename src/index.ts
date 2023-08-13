import Client, {
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
    CommonOptions,
    ListOptions,
    RecordOptions,
    RecordListOptions,
    LogStatsOptions,
    FileOptions,
    FullListOptions,
    RecordFullListOptions,
} from '@/services/utils/options';

// @todo export model types
// import * as models from '@/services/utils/dtos';

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
    BeforeSendResult,
    RecordAuthResponse,
    AuthProviderInfo,
    AuthMethodsList,
    RecordSubscription,
    OAuth2UrlCallback,
    OAuth2AuthConfig,
    OnStoreChangeFunc,
    UnsubscribeFunc,
    CommonOptions,
    ListOptions,
    RecordOptions,
    RecordListOptions,
    LogStatsOptions,
    FileOptions,
    FullListOptions,
    RecordFullListOptions,
};

export default Client;
