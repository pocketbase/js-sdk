import { assert }                from 'chai';
import { FetchMock }             from 'tests/mocks';
import { crudServiceTestsSuite } from '../suites';
import Client                    from '@/Client';
import Collections               from '@/services/Collections';
import Collection                from '@/models/Collection';

describe('Collections', function() {
    const client = new Client('test_base_url');
    const service = new Collections(client);

    crudServiceTestsSuite(service, '/api/collections');

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

    describe('import()', function () {
        it('Should send a bulk import collections request', async function () {
            fetchMock.on({
                method: 'PUT',
                url: service.client.buildUrl('/api/collections/import'),
                body: {
                    'collections': [{'id': 'id1'},{'id': 'id2'}],
                    'deleteMissing': false,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.import([{'id': 'id1'},{'id': 'id2'}] as Array<Collection>, false);

            assert.deepEqual(result, true);
        });
    });
});
