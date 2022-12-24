import { assert } from 'chai';
import Record     from '@/models/Record';

describe('Record', function() {
    describe('test Record data load and expand initialization', function () {
        const data = {
            id: "test_id",
            collectionId: "test_collectionId",
            collectionName: "test_collectionName",
            custom: "test_custom",
            expand: {
                one: {
                    id: "one_id",
                    expand: {
                        sub: [{id: "sub.a"}, {id: "sub.b"}]
                    },
                },
                many: [{id: "multi_id"}],
            }
        };

        const model = new Record(data);

        assert.equal(model.id, data.id);
        assert.equal(model.collectionId, data.collectionId);
        assert.equal(model.collectionName, data.collectionName);
        assert.equal(model.custom, data.custom);
        assert.instanceOf(model.expand?.one, Record);
        assert.equal((model.expand.one as any).id, data.expand.one.id);
        assert.equal((model.expand.one as any).expand.sub.length, 2);
        assert.instanceOf((model.expand.one as any).expand.sub[0], Record);
        assert.instanceOf((model.expand.one as any).expand.sub[1], Record);
        assert.equal((model.expand.many as any).length, 1);
        assert.instanceOf((model.expand.many as any)[0], Record);
    });
});
