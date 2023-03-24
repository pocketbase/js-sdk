import BaseModel   from '@/models/utils/BaseModel';
import SchemaField from '@/models/utils/SchemaField';

export default class Collection extends BaseModel {
    name!:       string;
    type!:       string;
    schema!:     Array<SchemaField>;
    indexes!:    Array<string>;
    system!:     boolean;
    listRule!:   null|string;
    viewRule!:   null|string;
    createRule!: null|string;
    updateRule!: null|string;
    deleteRule!: null|string;
    options!:    {[key:string]: any};

    /**
     * @inheritdoc
     */
    $load(data: { [key: string]: any }) {
        super.$load(data);

        this.system  = !!data.system;
        this.name    = typeof data.name === 'string' ? data.name : '';
        this.type    = typeof data.type === 'string' ? data.type : 'base';
        this.options = typeof data.options !== 'undefined' && data.options !== null ? data.options : {};
        this.indexes = Array.isArray(data.indexes) ? data.indexes : [];

        // rules
        this.listRule   = typeof data.listRule   === 'string' ? data.listRule   : null;
        this.viewRule   = typeof data.viewRule   === 'string' ? data.viewRule   : null;
        this.createRule = typeof data.createRule === 'string' ? data.createRule : null;
        this.updateRule = typeof data.updateRule === 'string' ? data.updateRule : null;
        this.deleteRule = typeof data.deleteRule === 'string' ? data.deleteRule : null;

        // schema
        data.schema = Array.isArray(data.schema) ? data.schema : [];
        this.schema = [];
        for (let field of data.schema) {
            this.schema.push(new SchemaField(field));
        }
    }

    /**
     * @deprecated Please use $isBase instead.
     */
    get isBase(): boolean {
        return this.$isBase;
    }

    /**
     * Checks if the current model is "base" collection.
     */
    get $isBase(): boolean {
        return this.type === 'base';
    }

    /**
     * @deprecated Please use $isAuth instead.
     */
    get isAuth(): boolean {
        return this.$isAuth;
    }

    /**
     * Checks if the current model is "auth" collection.
     */
    get $isAuth(): boolean {
        return this.type === 'auth';
    }

    /**
     * @deprecated Please use $isView instead.
     */
    get isView(): boolean {
        return this.$isView;
    }

    /**
     * Checks if the current model is "view" collection.
     */
    get $isView(): boolean {
        return this.type === 'view';
    }
}
