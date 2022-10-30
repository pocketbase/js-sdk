import { assert }      from 'chai';
import Client          from '@/Client';
import SettingsService from '@/services/SettingsService';
import { FetchMock }   from 'tests/mocks';

describe('SettingsService', function () {
    const client = new Client('test_base_url');
    const service = new SettingsService(client);
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

    describe('testS3()', function () {
        it('Should send S3 connection test request', async function () {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/settings/test/s3')+ '?q1=123',
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.testS3({ 'q1': 123 });

            assert.isTrue(result);
        });
    });

    describe('testEmail()', function () {
        it('Should send a test email request', async function () {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/settings/test/email')+ '?q1=123',
                body: { 'template': "abc", "email": "test@example.com" },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.testEmail("test@example.com", "abc", { "q1": 123 });

            assert.isTrue(result);
        });
    });
});
