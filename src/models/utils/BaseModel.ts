export default abstract class BaseModel {
    id!:      string;
    created!: string;
    updated!: string;

    constructor(data: { [key: string]: any } = {}) {
        this.load(data || {});
    }

    /**
     * Loads `data` into the current model.
     */
    load(data: { [key: string]: any }) {
        this.id = typeof data.id !== 'undefined' ? data.id : '';
        this.created = typeof data.created !== 'undefined' ? data.created : '';
        this.updated = typeof data.updated !== 'undefined' ? data.updated : '';
    }

    /**
     * Returns whether the current loaded data represent a stored db record.
     */
    get isNew(): boolean {
        return (
            // id is not set
            !this.id ||
            // zero uuid value
            this.id === '00000000-0000-0000-0000-000000000000'
        );
    }

    /**
     * Robust deep clone of a model.
     */
    clone(): BaseModel {
        return new (this.constructor as any)(JSON.parse(JSON.stringify(this)));
    }

    /**
     * Exports all model properties as a new plain object.
     */
    export(): { [key: string]: any } {
        return Object.assign({}, this);
    }
}
