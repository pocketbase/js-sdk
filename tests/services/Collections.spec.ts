import { crudServiceTestsSuite } from '../suites';
import Client      from '@/Client';
import Collections from '@/services/Collections';
import mockAdapter from 'axios-mock-adapter';

describe('Collections', function() {
    const client = new Client('test_base_url');
    const service = new Collections(client);
    const adapter = new mockAdapter(service.client.http);

    crudServiceTestsSuite(service, '/api/collections', adapter);
});
