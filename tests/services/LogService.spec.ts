import { describe, assert, test, beforeAll, afterAll, afterEach } from 'vitest';
import { FetchMock }  from '../mocks';
import Client         from '@/Client';
import { LogService } from '@/services/LogService';

describe('LogService', function () {
    const client = new Client('test_base_url');
    const service = new LogService(client);
    const fetchMock = new FetchMock();

    beforeAll(function () {
        fetchMock.init();
    });

    afterAll(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();
    });

    describe('getRequestsList()', function() {
        test('Should correctly return paginated list result', async function() {
            const replyBody = {
                'page': 2,
                'perPage': 1,
                'totalItems': 3,
                'totalPages': 3,
                'items': [{ 'id': 'test123' }],
            };

            fetchMock.on({
                method: 'GET',
                url: 'test_base_url/api/logs/requests?page=2&perPage=1&q1=abc',
                replyCode: 200,
                replyBody: replyBody,
            });

            const list = await service.getRequestsList(2, 1, { 'q1': 'abc' });

            assert.deepEqual(list, replyBody);
        });
    });

    describe('getRequest()', function() {
        test('Should return single request log', async function() {
            fetchMock.on({
                method: 'GET',
                url: 'test_base_url/api/logs/requests/' + encodeURIComponent('test?123') + '?q1=abc',
                replyCode: 200,
                replyBody: { 'id': 'test123' },
            });

            const result = await service.getRequest('test?123', { 'q1': 'abc' });

            assert.deepEqual(result, { 'id': 'test123' } as any);
        });
    });

    describe('getRequestsStats()', function() {
        test('Should return array with date grouped logs', async function() {
            fetchMock.on({
                method: 'GET',
                url: 'test_base_url/api/logs/requests/stats?q1=abc',
                replyCode: 200,
                replyBody: [{total: 123, date: '2022-01-01 00:00:00'}],
            });

            const result = await service.getRequestsStats({ 'q1': 'abc' });
            const expected = [{total: 123, date: '2022-01-01 00:00:00'}];

            assert.deepEqual(result, expected);
        });
    });
});
