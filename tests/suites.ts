import { assert }     from 'chai';
import mockAdapter    from 'axios-mock-adapter';
import CrudService    from '@/services/utils/CrudService';
import SubCrudService from '@/services/utils/SubCrudService';
import BaseModel      from '@/models/utils/BaseModel';
import ListResult     from '@/models/utils/ListResult';

export function crudServiceTestsSuite<M extends BaseModel>(
    service: CrudService<M>,
    expectedBasePath: string,
    adapter: mockAdapter
) {
    const id = 'abc=';

    // prepare mock data
    adapter.onGet(service.baseCrudPath(), { params: { page: 1, perPage: 1, 'q1': 'abc' } })
        // getFullList and getList
        .reply(200, {
            'page': 1,
            'perPage': 1,
            'totalItems': 3,
            'items': [{ 'id': 'item1' }, { 'id': 'item2' }],
        })
        .onGet(service.baseCrudPath(), { params: { page: 2, perPage: 1, 'q1': 'abc' } })
        .reply(200, {
            'page': 2,
            'perPage': 1,
            'totalItems': 3,
            'items': [{ 'id': 'item3' }],
        })
        // getOne
        .onGet(service.baseCrudPath() + '/' + encodeURIComponent(id), { params: { 'q1': 'abc' } })
        .reply(200, { 'id': 'item-one' })
        // create
        .onPost(service.baseCrudPath(), { 'b1': 123 })
        .reply(200, { 'id': 'item-create' })
        // update
        .onPatch(service.baseCrudPath() + '/' + encodeURIComponent(id), { 'b1': 123 })
        .reply(200, { 'id': 'item-update' })
        // delete
        .onDelete(service.baseCrudPath() + '/' + encodeURIComponent(id), { data: { 'b1': 123 }, params: { 'q1': 456 } })
        .reply(200);

    describe('baseCrudPath()', function() {
        it('Should corectly return the service base crud path', function(done) {
            assert.equal(service.baseCrudPath(), expectedBasePath);
            done();
        });
    });

    describe('getFullList()', function() {
        it('Should correctly return batched request data', async function() {
            const result = await service.getFullList(1, { 'q1': 'abc' });
            const expected = [
                service.decode({ 'id': 'item1' }),
                service.decode({ 'id': 'item2' }),
                service.decode({ 'id': 'item3' }),
            ];

            assert.deepEqual(result, expected);
            for (let i in result) {
                assert.instanceOf(result[i], expected[i].constructor);
            }
        });
    });

    describe('getList()', function() {
        it('Should correctly return paginated list result', async function() {
            const list = await service.getList(2, 1, { 'q1': 'abc' });
            const expected = [service.decode({ 'id': 'item3' })];

            assert.deepEqual(list, new ListResult(2, 1, 3, expected));
            for (let i in list.items) {
                assert.instanceOf(list.items[i], expected[i].constructor);
            }
        });
    });

    describe('getOne()', function() {
        it('Should return single model item', async function() {
            const result = await service.getOne(id, { 'q1': 'abc' });
            const expected = service.decode({ 'id': 'item-one' });

            assert.instanceOf(result, expected.constructor);
            assert.deepEqual(result, expected);
        });
    });

    describe('create()', function() {
        it('Should create new model item', async function() {
            const result = await service.create({ 'b1': 123 }, { 'q1': 456 });
            const expected = service.decode({ 'id': 'item-create' });

            assert.instanceOf(result, expected.constructor);
            assert.deepEqual(result, expected);
        });
    });

    describe('update()', function() {
        it('Should update existing model item', async function() {
            const result = await service.update(id, { 'b1': 123 }, { 'q1': 456 });
            const expected = service.decode({ 'id': 'item-update' });

            assert.instanceOf(result, expected.constructor);
            assert.deepEqual(result, expected);
        });
    });

    describe('delete()', function() {
        it('Should delete single model item', async function() {
            const result = await service.delete(id, { "b1": 123 }, { "q1": 456 });

            assert.isTrue(result);
        });
    });
}

export function subCrudServiceTestsSuite<M extends BaseModel>(
    service: SubCrudService<M>,
    sub: string,
    expectedBasePath: string,
    adapter: mockAdapter
) {
    const id = 'abc=';

    // prepare mock data
    adapter.onGet(service.baseCrudPath(sub), { params: { page: 1, perPage: 1, 'q1': 'abc' } })
        // getFullList and getList
        .reply(200, {
            'page': 1,
            'perPage': 1,
            'totalItems': 3,
            'items': [{ 'id': 'item1' }, { 'id': 'item2' }],
        })
        .onGet(service.baseCrudPath(sub), { params: { page: 2, perPage: 1, 'q1': 'abc' } })
        .reply(200, {
            'page': 2,
            'perPage': 1,
            'totalItems': 3,
            'items': [{ 'id': 'item3' }],
        })
        // getOne
        .onGet(service.baseCrudPath(sub) + '/' + encodeURIComponent(id), { params: { 'q1': 'abc' } })
        .reply(200, { 'id': 'item-one' })
        // create
        .onPost(service.baseCrudPath(sub), { 'b1': 123 })
        .reply(200, { 'id': 'item-create' })
        // update
        .onPatch(service.baseCrudPath(sub) + '/' + encodeURIComponent(id), { 'b1': 123 })
        .reply(200, { 'id': 'item-update' })
        // delete
        .onDelete(service.baseCrudPath(sub) + '/' + encodeURIComponent(id), { data: { 'b1': 123 }, params: { 'q1': 456 } })
        .reply(200);

    describe('baseCrudPath()', function() {
        it('Should corectly return the service base crud path', function(done) {
            assert.equal(service.baseCrudPath(sub), expectedBasePath);
            done();
        });
    });

    describe('getFullList()', function() {
        it('Should correctly return batched request data', async function() {
            const result = await service.getFullList(sub, 1, { 'q1': 'abc' });
            const expected = [
                service.decode({ 'id': 'item1' }),
                service.decode({ 'id': 'item2' }),
                service.decode({ 'id': 'item3' }),
            ];

            assert.deepEqual(result, expected);
            for (let i in result) {
                assert.instanceOf(result[i], expected[i].constructor);
            }
        });
    });

    describe('getList()', function() {
        it('Should correctly return paginated list result', async function() {
            const list = await service.getList(sub, 2, 1, { 'q1': 'abc' });
            const expected = [service.decode({ 'id': 'item3' })];

            assert.deepEqual(list, new ListResult(2, 1, 3, expected));
            for (let i in list.items) {
                assert.instanceOf(list.items[i], expected[i].constructor);
            }
        });
    });

    describe('getOne()', function() {
        it('Should return single model item', async function() {
            const result = await service.getOne(sub, id, { 'q1': 'abc' });
            const expected = service.decode({ 'id': 'item-one' });

            assert.instanceOf(result, expected.constructor);
            assert.deepEqual(result, expected);
        });
    });

    describe('create()', function() {
        it('Should create new model item', async function() {
            const result = await service.create(sub, { 'b1': 123 }, { 'q1': 456 });
            const expected = service.decode({ 'id': 'item-create' });

            assert.instanceOf(result, expected.constructor);
            assert.deepEqual(result, expected);
        });
    });

    describe('update()', function() {
        it('Should update existing model item', async function() {
            const result = await service.update(sub, id, { 'b1': 123 }, { 'q1': 456 });
            const expected = service.decode({ 'id': 'item-update' });

            assert.instanceOf(result, expected.constructor);
            assert.deepEqual(result, expected);
        });
    });

    describe('delete()', function() {
        it('Should delete single model item', async function() {
            const result = await service.delete(sub, id, { "b1": 123 }, { "q1": 456 });

            assert.isTrue(result);
        });
    });
}
