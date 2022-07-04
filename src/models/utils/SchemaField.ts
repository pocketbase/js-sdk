export default class SchemaField {
    id!:       string;
    name!:     string;
    type!:     string;
    system!:   boolean;
    required!: boolean;
    unique!:   boolean;
    options!:  { [key: string]: any };

    constructor(data: { [key: string]: any } = {}) {
        this.load(data || {});
    }

    /**
     * Loads `data` into the field.
     */
    load(data: { [key: string]: any }) {
        this.id       = typeof data.id !== 'undefined' ? data.id : '';
        this.name     = typeof data.name !== 'undefined' ? data.name : '';
        this.type     = typeof data.type !== 'undefined' ? data.type : 'text';
        this.system   = !!data.system;
        this.required = !!data.required;
        this.unique   = !!data.unique;
        this.options  = typeof data.options === 'object' && data.options !== null ? data.options : {};
    }
}
