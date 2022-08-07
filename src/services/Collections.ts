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
    async import(collections: Array<Collection>, deleteOthers: boolean = true, queryParams = {}): Promise<true> {
        return this.client.send(this.baseCrudPath() + '/import', {
            'method': 'PUT',
            'params': queryParams,
            'body': {
                'collections':  collections,
                'deleteOthers': deleteOthers,
            }
        }).then(() => true);
    }
}
