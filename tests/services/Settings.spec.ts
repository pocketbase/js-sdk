import { assert }    from 'chai';
import Client        from '@/Client';
import Settings      from '@/services/Settings';
import { FetchMock } from 'tests/mocks';

describe('Settings', function () {
    const client = new Client('test_base_url');
    const service = new Settings(client);
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
                url: service.client.buildUrl('/api/settings') + '?q1=123',
                replyCode: 200,
                replyBody: { 'test': 'abc' },
            });

            const result = await service.getAll({ 'q1': 123 });

            assert.deepEqual(result, { 'test': 'abc' });
        });
    });

    describe('update()', function () {
        it('Should send bulk app settings update', async function () {
            fetchMock.on({
                method: 'PATCH',
                url: service.client.buildUrl('/api/settings'),
                body: { 'b1': 123 },
                replyCode: 200,
                replyBody: { 'test': 'abc' },
            });

            const result = await service.update({ 'b1': 123 });

            assert.deepEqual(result, { 'test': 'abc' });
        });
    });
});
