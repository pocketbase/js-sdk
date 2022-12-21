export default abstract class BaseModel {
    [key: string]: any,

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
        for (const [key, value] of Object.entries(data)) {
            this[key] = value;
        }

        // normalize known fields
        this.id      = typeof data.id      !== 'undefined' ? data.id      : '';
        this.created = typeof data.created !== 'undefined' ? data.created : '';
        this.updated = typeof data.updated !== 'undefined' ? data.updated : '';
    }

    /**
     * Returns whether the current loaded data represent a stored db record.
     */
    get isNew(): boolean {
        return !this.id;
    }

    /**
     * Creates a deep clone of the current model.
     */
    clone(): BaseModel {
        const clone = typeof structuredClone === 'function' ?
            structuredClone(this) : JSON.parse(JSON.stringify(this));

        return new (this.constructor as any)(clone);
    }

    /**
     * Exports all model properties as a new plain object.
     */
    export(): { [key: string]: any } {
        return Object.assign({}, this);
    }
}
