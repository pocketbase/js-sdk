export interface ResultList<T> {
    page:       number;
    perPage:    number;
    totalItems: number;
    totalPages: number;
    items:      Array<T>;
}

export interface BaseModel {
    [key: string]: any

    id:      string;
    created: string;
    updated: string;
}

export interface AdminModel extends BaseModel {
    avatar:  number;
    email:   string;
}

export interface SchemaField {
    id:       string;
    name:     string;
    type:     string;
    system:   boolean;
    required: boolean;
    options:  { [key: string]: any };
}

export interface CollectionModel extends BaseModel {
    name:        string;
    type:        string;
    schema:      Array<SchemaField>;
    indexes:     Array<string>;
    system:      boolean;
    listRule?:   string;
    viewRule?:   string;
    createRule?: string;
    updateRule?: string;
    deleteRule?: string;
    options:     { [key: string]: any };
}

export interface ExternalAuthModel extends BaseModel {
    recordId:     string;
    collectionId: string;
    provider:     string;
    providerId:   string;
}

export interface LogRequestModel extends BaseModel {
    url:       string;
    method:    string;
    status:    number;
    auth:      string;
    remoteIp:  string;
    userIp:    string;
    referer:   string;
    userAgent: string;
    meta:      { [key: string]: any };
}

export interface RecordModel extends BaseModel {
    [key: string]: any

    collectionId:   string;
    collectionName: string;
    expand?:        {[key: string]: any};
}

export interface HourlyStats {
    total: number;
    date:  string;
}

export interface HealthCheckResponse {
    code:    number;
    message: string;
    data:    {[key: string]: any};
}

export interface BackupFileInfo {
    key:      string;
    size:     number;
    modified: string;
}
