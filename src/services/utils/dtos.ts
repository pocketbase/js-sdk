export interface ListResult<T> {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    items: Array<T>;
}

export interface BaseModel {
    [key: string]: any;

    id: string;
    created: string;
    updated: string;
}

export interface AdminModel extends BaseModel {
    avatar: number;
    email: string;
}

export interface SchemaField {
    id: string;
    name: string;
    type: string;
    system: boolean;
    required: boolean;
    presentable: boolean;
    options: { [key: string]: any };
}

export interface CollectionModel extends BaseModel {
    name: string;
    type: string;
    schema: Array<SchemaField>;
    indexes: Array<string>;
    system: boolean;
    listRule?: string;
    viewRule?: string;
    createRule?: string;
    updateRule?: string;
    deleteRule?: string;
    options: { [key: string]: any };
}

export interface ExternalAuthModel extends BaseModel {
    recordId: string;
    collectionId: string;
    provider: string;
    providerId: string;
}

export interface LogModel extends BaseModel {
    level: string;
    message: string;
    data: { [key: string]: any };
}

export interface RecordModel extends BaseModel {
    collectionId: string;
    collectionName: string;
    expand?: { [key: string]: any };
}
