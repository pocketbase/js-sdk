import { assert } from 'chai';
import { crudServiceTestsSuite } from '../suites';
import Client      from '@/Client';
import Admins      from '@/services/Admins';
import mockAdapter from 'axios-mock-adapter';
import Admin       from '@/models/Admin';

describe('Admins', function() {
    const client = new Client('test_base_url');
    const service = new Admins(client);
    const adapter = new mockAdapter(service.client.http);

    beforeEach(function() {
        service.client.AuthStore.clear(); // reset
    });

    adapter
        // auth
        .onPost('/api/admins/auth-via-email', {
            'email': 'test@example.com',
            'password': '123456',
            'b1': 123,
        })
        .reply(200, {
            'token': 'token_authorize',
            'admin': { 'id': 'id_authorize' },
        })
        // refresh
        .onPost('/api/admins/refresh', { 'b1': 123 })
        .reply(200, {
            'token': 'token_refresh',
            'admin': { 'id': 'id_refresh' },
        })
        // request password reset
        .onPost('/api/admins/request-password-reset', {
            'email': 'test@example.com',
            'b1': 123,
        })
        .reply(200)
        // confirm password reset
        .onPost('/api/admins/confirm-password-reset', {
            'token': 'test',
            'password': '123',
            'passwordConfirm': '456',
            'b1': 123,
        })
        .reply(200, {
            'token': 'token_password_confirm',
            'admin': { 'id': 'id_password_confirm' },
        });

    function authResponseCheck(result: { [key: string]: any }, expectedToken: string, expectedAdmin: Admin) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.instanceOf(result.admin, Admin);
        assert.deepEqual(result.admin, expectedAdmin);
        assert.equal(service.client.AuthStore.token, expectedToken);
        assert.deepEqual(service.client.AuthStore.model, expectedAdmin);
    }

    // Tests:
    // ---

    crudServiceTestsSuite(service, '/api/admins', adapter);

    describe('authViaEmail()', function() {
        it('Should auth an admin by its email and password', async function() {
            const result = await service.authViaEmail('test@example.com', '123456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_authorize', service.decode({ 'id': 'id_authorize' }));
        });
    });

    describe('refresh()', function() {
        it('Should refresh an authorized admin instance', async function() {
            const result = await service.refresh({ 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_refresh', service.decode({ 'id': 'id_refresh' }));
        });
    });

    describe('requestPasswordReset()', function() {
        it('Should send a password reset request', async function() {
            const result = await service.requestPasswordReset('test@example.com', { 'b1': 123 }, { 'q1': 456 });

            assert.isTrue(result);
        });
    });

    describe('confirmPasswordReset()', function() {
        it('Should confirm a password reset request', async function() {
            const result = await service.confirmPasswordReset('test', '123', '456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_password_confirm', service.decode({ 'id': 'id_password_confirm' }));
        });
    });
});
