import { assert }    from 'chai';
import Client        from '@/Client';
import BackupService from '@/services/BackupService';
import { FetchMock } from 'tests/mocks';

describe('BackupService', function () {
    const client    = new Client('test_base_url');
    const service   = new BackupService(client);
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

    describe('getFullList()', function () {
        it('Should fetch all backups', async function () {
            const replyBody = [
                {key: "test1", size: 100, modified: "2023-05-18 10:00:00.123Z"},
                {key: "test2", size: 200, modified: "2023-05-18 11:00:00.123Z"},
            ];

            fetchMock.on({
                method: 'GET',
                url: service.client.buildUrl('/api/backups') + '?q1=123',
                replyCode: 200,
                replyBody: replyBody,
            });

            const result = await service.getFullList({ 'q1': 123 });

            assert.deepEqual(result, replyBody);
        });
    });


    describe('create()', function () {
        it('Should initialize a backup create', async function () {
            fetchMock.on({
                method:    'POST',
                url:       service.client.buildUrl('/api/backups') + '?q1=123',
                body:      { 'name': "@test" },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.create("@test", { 'q1': 123 });

            assert.deepEqual(result, true);
        });
    });

    describe('delete()', function () {
        it('Should delete a single backup', async function () {
            fetchMock.on({
                method:    'DELETE',
                url:       service.client.buildUrl('/api/backups') + '/%40test?q1=123',
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.delete("@test", { 'q1': 123 });

            assert.deepEqual(result, true);
        });
    });

    describe('restore()', function () {
        it('Should initialize a backup restore', async function () {
            fetchMock.on({
                method:    'POST',
                url:       service.client.buildUrl('/api/backups') + '/%40test/restore?q1=123',
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.restore("@test", { 'q1': 123 });

            assert.deepEqual(result, true);
        });
    });

    describe('getDownloadUrl()', function () {
        it('Should initialize a backup getDownloadUrl', function () {
            const result = service.getDownloadUrl("@token", "@test");

            assert.deepEqual(result, service.client.buildUrl('/api/backups') + '/%40test?token=%40token');
        });
    });
});
