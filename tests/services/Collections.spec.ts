import { crudServiceTestsSuite } from '../suites';
import Client      from '@/Client';
import Collections from '@/services/Collections';

describe('Collections', function() {
    const client = new Client('test_base_url');
    const service = new Collections(client);

    crudServiceTestsSuite(service, '/api/collections');
});
