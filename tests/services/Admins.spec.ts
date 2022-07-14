import { assert } from 'chai';
import { crudServiceTestsSuite } from '../suites';
import { FetchMock } from 'tests/mocks';
import Client        from '@/Client';
import Admins        from '@/services/Admins';
import Admin         from '@/models/Admin';

describe('Admins', function() {
    const client = new Client('test_base_url');
    const service = new Admins(client);

    // base tests
    crudServiceTestsSuite(service, '/api/admins');

    const fetchMock = new FetchMock();

    beforeEach(function() {
        service.client.AuthStore.clear(); // reset
    });

    before(function () {
        fetchMock.init();
    });

    after(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();
    });

    function authResponseCheck(result: { [key: string]: any }, expectedToken: string, expectedAdmin: Admin) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.instanceOf(result.admin, Admin);
        assert.deepEqual(result.admin, expectedAdmin);
        assert.equal(service.client.AuthStore.token, expectedToken);
        assert.deepEqual(service.client.AuthStore.model, expectedAdmin);
    }

    // more tests:
    // ---------------------------------------------------------------

    describe('authViaEmail()', function() {
        it('Should auth an admin by its email and password', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/admins/auth-via-email') + '?q1=456',
                body: {
                    'email': 'test@example.com',
                    'password': '123456',
                    'b1': 123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_authorize',
                    'admin': { 'id': 'id_authorize' },
                },
            });

            const result = await service.authViaEmail('test@example.com', '123456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_authorize', service.decode({ 'id': 'id_authorize' }));
        });
    });

    describe('refresh()', function() {
        it('Should refresh an authorized admin instance', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/admins/refresh') + '?q1=456',
                body: { 'b1': 123 },
                replyCode: 200,
                replyBody: {
                    'token': 'token_refresh',
                    'admin': { 'id': 'id_refresh' },
                },
            });

            const result = await service.refresh({ 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_refresh', service.decode({ 'id': 'id_refresh' }));
        });
    });

    describe('requestPasswordReset()', function() {
        it('Should send a password reset request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/admins/request-password-reset') + '?q1=456',
                body: {
                    'email': 'test@example.com',
                    'b1': 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestPasswordReset('test@example.com', { 'b1': 123 }, { 'q1': 456 });

            assert.isTrue(result);
        });
    });

    describe('confirmPasswordReset()', function() {
        it('Should confirm a password reset request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/admins/confirm-password-reset') + '?q1=456',
                body: {
                    'token': 'test',
                    'password': '123',
                    'passwordConfirm': '456',
                    'b1': 123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_password_confirm',
                    'admin': { 'id': 'id_password_confirm' },
                },
            });

            const result = await service.confirmPasswordReset('test', '123', '456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_password_confirm', service.decode({ 'id': 'id_password_confirm' }));
        });
    });
});
