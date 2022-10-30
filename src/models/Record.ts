import BaseModel from '@/models/utils/BaseModel';

export default class Record extends BaseModel {
    collectionId!:   string;
    collectionName!: string;
    expand!:         {[key: string]: Record|Array<Record>};

    /**
     * @inheritdoc
     */
    load(data: { [key: string]: any }) {
        super.load(data);

        // normalize common fields
        this.collectionId   = typeof data.collectionId   === 'string' ? data.collectionId   : '';
        this.collectionName = typeof data.collectionName === 'string' ? data.collectionName : '';
        this.expand         = typeof data.expand === 'object' && data.expand !== null ? data.expand : {};
    }
}
