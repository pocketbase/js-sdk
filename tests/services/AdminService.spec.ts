import { assert }                from 'chai';
import { crudServiceTestsSuite } from '../suites';
import { FetchMock }             from 'tests/mocks';
import Client                    from '@/Client';
import AdminService              from '@/services/AdminService';
import Admin                     from '@/models/Admin';

describe('AdminService', function() {
    const client = new Client('test_base_url');
    const service = new AdminService(client);

    // base tests
    crudServiceTestsSuite(service, '/api/admins');

    const fetchMock = new FetchMock();

    beforeEach(function() {
        service.client.authStore.clear(); // reset
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
        assert.equal(service.client.authStore.token, expectedToken);
        assert.deepEqual(service.client.authStore.model, expectedAdmin);
    }

    // more tests:
    // ---------------------------------------------------------------

    describe('AuthStore sync', function() {
        it('Should update the AuthStore admin model on matching update id', async function() {
            fetchMock.on({
                method: 'PATCH',
                url: service.client.buildUrl('/api/admins/test123'),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", new Admin({id: "test123", email: "old@example.com"}));

            await service.update('test123', {email:"new@example.com"});

            assert.equal(service.client.authStore.model?.email, "new@example.com");
        });

        it('Should not update the AuthStore admin model on mismatched update id', async function() {
            fetchMock.on({
                method: 'PATCH',
                url: service.client.buildUrl('/api/admins/test123'),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", new Admin({id: "test456", email: "old@example.com"}));

            await service.update('test123', {email:"new@example.com"});

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        it('Should delete the AuthStore admin model on matching delete id', async function() {
            fetchMock.on({
                method: 'DELETE',
                url: service.client.buildUrl('/api/admins/test123'),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", new Admin({id: "test123"}));

            await service.delete('test123');

            assert.isNull(service.client.authStore.model);
        });

        it('Should not delete the AuthStore admin model on mismatched delete id', async function() {
            fetchMock.on({
                method: 'DELETE',
                url: service.client.buildUrl('/api/admins/test123'),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", new Admin({id: "test456"}));

            await service.delete('test123');

            assert.isNotNull(service.client.authStore.model);
        });
    });

    describe('authWithPassword()', function() {
        it('Should auth an admin by its email and password', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/admins/auth-with-password') + '?q1=456',
                body: {
                    'identity': 'test@example.com',
                    'password': '123456',
                    'b1': 123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_authorize',
                    'admin': { 'id': 'id_authorize' },
                },
            });

            const result = await service.authWithPassword('test@example.com', '123456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_authorize', service.decode({ 'id': 'id_authorize' }));
        });
    });

    describe('authRefresh()', function() {
        it('Should refresh an authorized admin instance', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/admins/auth-refresh') + '?q1=456',
                body: { 'b1': 123 },
                replyCode: 200,
                replyBody: {
                    'token': 'token_refresh',
                    'admin': { 'id': 'id_refresh' },
                },
            });

            const result = await service.authRefresh({ 'b1': 123 }, { 'q1': 456 });

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
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmPasswordReset('test', '123', '456', { 'b1': 123 }, { 'q1': 456 });

            assert.isTrue(result);
        });
    });
});
