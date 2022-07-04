import { assert }  from 'chai';
import mockAdapter from 'axios-mock-adapter';
import Client      from '@/Client';
import Settings    from '@/services/Settings';

describe('Settings', function () {
    const client = new Client('test_base_url');
    const service = new Settings(client);
    const adapter = new mockAdapter(service.client.http);

    // mock setup
    adapter
        // getAll()
        .onGet('/api/settings', { 'q1': 123 }).reply(200, { 'test': 'abc' })
        // update()
        .onPatch('/api/settings', { 'b1': 123 }).reply(200, { 'test': 'abc' })

    describe('getAll()', function () {
        it('Should fetch all app settings', async function () {
            const result = await service.getAll({ 'q1': 123 });

            assert.deepEqual(result, { 'test': 'abc' });
        });
    });

    describe('update()', function () {
        it('Should send bulk app settings update', async function () {
            const result = await service.update({ 'b1': 123 });

            assert.deepEqual(result, { 'test': 'abc' });
        });
    });
});
