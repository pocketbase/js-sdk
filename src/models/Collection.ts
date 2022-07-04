import BaseModel   from '@/models/utils/BaseModel';
import SchemaField from '@/models/utils/SchemaField';

export default class Collection extends BaseModel {
    name!:       string;
    schema!:     Array<SchemaField>;
    system!:     boolean;
    listRule!:   null|string;
    viewRule!:   null|string;
    createRule!: null|string;
    updateRule!: null|string;
    deleteRule!: null|string;

    /**
     * @inheritdoc
     */
    load(data: { [key: string]: any }) {
        super.load(data);

        this.name   = typeof data.name === 'string' ? data.name : '';
        this.system = !!data.system;

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
}
