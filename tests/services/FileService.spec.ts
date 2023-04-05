import { assert }    from 'chai';
import Client        from '@/Client';
import FileService   from '@/services/FileService';
import Record        from '@/models/Record';
import { FetchMock } from 'tests/mocks';

describe('FileService', function () {
    const client    = new Client('test_base_url');
    const service   = new FileService(client);
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

    describe('getFileUrl()', function () {
        it('Should return a formatted url', async function () {
            const record = new Record({'id': '456', 'collectionId': '123'});
            const result = service.getUrl(record, 'demo.png')

            assert.deepEqual(result, 'test_base_url/api/files/123/456/demo.png');
        });

        it('Should return a formatted url + query params', async function () {
            const record = new Record({'id': '456', 'collectionId': '123'});
            const result = service.getUrl(record, 'demo=', {'test': 'abc'})

            assert.deepEqual(result, 'test_base_url/api/files/123/456/demo%3D?test=abc');
        });
    });

    describe('getToken()', function () {
        it('Should send a file token request', async function () {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/files/token')+ '?q1=123',
                replyCode: 200,
                replyBody: {token: "456"},
            });

            const result = await service.getToken({ 'q1': 123 });

            assert.deepEqual(result, "456");
        });
    });
});
