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
}
