import BaseCrudService     from '@/services/utils/BaseCrudService';
import { CollectionModel } from '@/services/utils/dtos';
import { CommonOptions } from '@/services/utils/options';

export default class CollectionService extends BaseCrudService<CollectionModel> {
    /**
     * @inheritdoc
     */
    get baseCrudPath(): string {
        return '/api/collections';
    }

    /**
     * Imports the provided collections.
     *
     * If `deleteMissing` is `true`, all local collections and schema fields,
     * that are not present in the imported configuration, WILL BE DELETED
     * (including their related records data)!
     */
    async import(
        collections: Array<CollectionModel>,
        deleteMissing: boolean = false,
        options?: CommonOptions,
    ): Promise<true> {
        options = Object.assign({
            'method': 'PUT',
            'body': {
                'collections':   collections,
                'deleteMissing': deleteMissing,
            }
        }, options);

        return this.client.send(this.baseCrudPath + '/import', options)
            .then(() => true);
    }
}
