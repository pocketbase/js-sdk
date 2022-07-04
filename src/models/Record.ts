import BaseModel from '@/models/utils/BaseModel';

export default class Record extends BaseModel {
    [key: string]: any,

    '@collectionId'!:   string;
    '@collectionName'!: string;
    '@expand'!:         {[key: string]: any};

    /**
     * @inheritdoc
     */
    load(data: { [key: string]: any }) {
        super.load(data);

        for (const [key, value] of Object.entries(data)) {
            this[key] = value;
        }

        // normalize common fields
        this['@collectionId']   = typeof data['@collectionId']   !== 'undefined' ? data['@collectionId']   : '';
        this['@collectionName'] = typeof data['@collectionName'] !== 'undefined' ? data['@collectionName'] : '';
        this['@expand']         = typeof data['@expand']         !== 'undefined' ? data['@expand']         : {};
    }
}
