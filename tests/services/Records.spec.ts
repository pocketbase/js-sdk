import { subCrudServiceTestsSuite } from '../suites';
import { assert }  from 'chai';
import Client      from '@/Client';
import Record      from '@/models/Record';
import Records     from '@/services/Records';

describe('Records', function() {
    const client  = new Client('test_base_url///');
    const service = new Records(client);

    subCrudServiceTestsSuite(service, 'sub=', '/api/collections/sub%3D/records');

    describe('getFileUrl()', function () {
        it('Should return a formatted url', async function () {
            const record = new Record({"id": "456", "@collectionId": "123"});
            const result = service.getFileUrl(record, "demo.png")

            assert.deepEqual(result, "test_base_url/api/files/123/456/demo.png");
        });

        it('Should return a formatted url + query params', async function () {
            const record = new Record({"id": "456", "@collectionId": "123"});
            const result = service.getFileUrl(record, "demo.png", {"test": "abc"})

            assert.deepEqual(result, "test_base_url/api/files/123/456/demo.png?test=abc");
        });

        it('Should return a formatted url + properly concatenate additional query parameters', async function () {
            const record = new Record({"id": "456", "@collectionId": "123"});
            const result = service.getFileUrl(record, "demo.png?test=abc", {"thumb": "100x200"})

            assert.deepEqual(result, "test_base_url/api/files/123/456/demo.png?test=abc&thumb=100x200");
        });
    });
});
