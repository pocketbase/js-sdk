import { assert }     from 'chai';
import CrudService    from '@/services/utils/CrudService';
import BaseModel      from '@/models/utils/BaseModel';
import ListResult     from '@/models/utils/ListResult';
import { FetchMock }  from './mocks';

export function crudServiceTestsSuite<M extends BaseModel>(
    service: CrudService<M>,
    expectedBasePath: string,
) {
    const id = 'abc=';

    describe('CrudServiceTests', function() {
        const fetchMock = new FetchMock();

        before(function () {
            fetchMock.init();
        });

        after(function () {
            fetchMock.restore();
        });

        // Prepare mock data
        // -----------------------------------------------------------

        // getFullList and getList
        fetchMock.on({
            method: 'GET',
            url: service.client.buildUrl(service.baseCrudPath) + '?page=1&perPage=1&q1=abc',
            replyCode: 200,
            replyBody: {
                'page': 1,
                'perPage': 1,
                'totalItems': 3,
                'totalPages': 3,
                'items': [{ 'id': 'item1' }, { 'id': 'item2' }],
            },
        });
        fetchMock.on({
            method: 'GET',
            url: service.client.buildUrl(service.baseCrudPath) + '?page=2&perPage=1&q1=abc',
            replyCode: 200,
            replyBody: {
                'page': 2,
                'perPage': 1,
                'totalItems': 3,
                'totalPages': 3,
                'items': [{ 'id': 'item3' }],
            },
        });

        // getOne
        fetchMock.on({
            method: 'GET',
            url: service.client.buildUrl(service.baseCrudPath) + '/' + encodeURIComponent(id) + '?q1=abc',
            replyCode: 200,
            replyBody: { 'id': 'item-one' },
        });

        // getFirstListItem
        fetchMock.on({
            method: 'GET',
            url: service.client.buildUrl(service.baseCrudPath) + '?page=1&perPage=1&filter=test%3D123&q1=abc',
            replyCode: 200,
            replyBody: {
                'page': 1,
                'perPage': 1,
                'totalItems': 3,
                'totalPages': 3,
                'items': [{ 'id': 'item1' }, { 'id': 'item2' }],
            },
        });

        // create
        fetchMock.on({
            method: 'POST',
            url: service.client.buildUrl(service.baseCrudPath) + '?q1=456',
            body: { 'b1': 123 },
            replyCode: 200,
            replyBody: { 'id': 'item-create' },
        });

        // update
        fetchMock.on({
            method: 'PATCH',
            url: service.client.buildUrl(service.baseCrudPath) + '/' + encodeURIComponent(id) + '?q1=456',
            body: { 'b1': 123 },
            replyCode: 200,
            replyBody: { 'id': 'item-update' },
        });

        // delete
        fetchMock.on({
            method: 'DELETE',
            url: service.client.buildUrl(service.baseCrudPath) + '/' + encodeURIComponent(id) + '?q1=456',
            replyCode: 204,
        });

        // -----------------------------------------------------------

        describe('baseCrudPath()', function() {
            it('Should corectly return the service base crud path', function(done) {
                assert.equal(service.baseCrudPath, expectedBasePath);
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

                assert.deepEqual(list, new ListResult(2, 1, 3, 3, expected));
                for (let i in list.items) {
                    assert.instanceOf(list.items[i], expected[i].constructor);
                }
            });
        });

        describe('getFirstListItem()', function() {
            it('Should return single model item by a filter', async function() {
                const result = await service.getFirstListItem("test=123", { 'q1': 'abc' });
                const expected = service.decode({ 'id': 'item1' });

                assert.instanceOf(result, expected.constructor);
                assert.deepEqual(result, expected);
            });
        });

        describe('getOne()', function() {
            it('Should return single model item by an id', async function() {
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
                const result = await service.delete(id, { "q1": 456 });

                assert.isTrue(result);
            });
        });
    });
}
