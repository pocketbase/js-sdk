import { assert }  from 'chai';
import mockAdapter from 'axios-mock-adapter';
import Client      from '@/Client';
import Request     from '@/models/Request';
import ListResult  from '@/models/utils/ListResult';
import Logs        from '@/services/Logs';

describe('Logs', function () {
    const client = new Client('test_base_url');
    const service = new Logs(client);
    const adapter = new mockAdapter(service.client.http);

    // mock setup
    adapter
        // getRequestsList()
        .onGet('/api/logs/requests', { params: { page: 2, perPage: 1, 'q1': 'abc' } })
        .reply(200, {
            'page': 2,
            'perPage': 1,
            'totalItems': 3,
            'items': [{ 'id': 'test123' }],
        })
        // getRequest()
        .onGet('/api/logs/requests' + encodeURIComponent('test123'), { params: { 'q1': 'abc' } })
        .reply(200, { 'id': 'test123' })
        // getRequestsStats()
        .onGet('/api/logs/requests/stats', { params: { 'q1': 'abc' } })
        .reply(200, [{total: 123, date: '2022-01-01 00:00:00'}])

    describe('getRequestsList()', function() {
        it('Should correctly return paginated list result', async function() {
            const list = await service.getRequestsList(2, 1, { 'q1': 'abc' });
            const expected = [new Request({ 'id': 'test123' })];

            assert.deepEqual(list, new ListResult(2, 1, 3, expected));
            for (const i in list.items) {
                assert.instanceOf(list.items[i], expected[i].constructor);
            }
        });
    });

    describe('getRequest()', function() {
        it('Should return single request log', async function() {
            const result = await service.getRequest('test123', { 'q1': 'abc' });
            const expected = new Request({ 'id': 'test123' });

            assert.instanceOf(result, expected.constructor);
            assert.deepEqual(result, expected);
        });
    });

    describe('getRequestsStats()', function() {
        it('Should return array with date grouped logs', async function() {
            const result = await service.getRequestsStats({ 'q1': 'abc' });
            const expected = [{total: 123, date: '2022-01-01 00:00:00'}];

            assert.instanceOf(result, expected.constructor);
            assert.deepEqual(result, expected);
        });
    });
});
