import { assert }    from 'chai';
import Client        from '@/Client';
import HealthService from '@/services/HealthService';
import { FetchMock } from 'tests/mocks';

describe('HealthService', function () {
    const client    = new Client('test_base_url');
    const service   = new HealthService(client);
    const fetchMock = new FetchMock();

    before(function () {
        fetchMock.init();
    });

    after(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();
    });

    describe('getAll()', function () {
        it('Should fetch all app settings', async function () {
            fetchMock.on({
                method: 'GET',
                url: service.client.buildUrl('/api/health') + '?q1=123',
                replyCode: 200,
                replyBody: { code: 200, message: 'test' },
            });

            const result = await service.check({ 'q1': 123 });

            assert.deepEqual(result, { code: 200, message: 'test' });
        });
    });
});
