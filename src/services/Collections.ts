import CrudService from '@/services/utils/CrudService';
import Collection  from '@/models/Collection';

export default class Collections extends CrudService<Collection> {
    /**
     * @inheritdoc
     */
    decode(data: { [key: string]: any }): Collection {
        return new Collection(data);
    }

    /**
     * @inheritdoc
     */
    baseCrudPath(): string {
        return '/api/collections';
    }

    /**
     * Imports the provided collections.
     */
    async import(collections: Array<Collection>, deleteMissing: boolean = false, queryParams = {}): Promise<true> {
        return this.client.send(this.baseCrudPath() + '/import', {
            'method': 'PUT',
            'params': queryParams,
            'body': {
                'collections':  collections,
                'deleteMissing': deleteMissing,
            }
        }).then(() => true);
    }
}
