import { assert }    from 'chai';
import { crudServiceTestsSuite } from '../suites';
import { FetchMock } from 'tests/mocks';
import Client        from '@/Client';
import Users         from '@/services/Users';
import User          from '@/models/User';

describe('Users', function() {
    const client = new Client('test_base_url');
    const service = new Users(client);

    // base tests
    crudServiceTestsSuite(service, '/api/users');

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

    function authResponseCheck(result: { [key: string]: any }, expectedToken: string, expectedUser: User) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.instanceOf(result.user, User);
        assert.deepEqual(result.user, expectedUser);
        assert.equal(service.client.AuthStore.token, expectedToken);
        assert.deepEqual(service.client.AuthStore.model, expectedUser);
    }

    // more tests:
    // ---------------------------------------------------------------

    describe('listAuthMethods()', function () {
        it('Should fetch all available authorization methods', async function () {
            fetchMock.on({
                method: 'GET',
                url: service.client.buildUrl('/api/users/auth-methods') + '?q1=123',
                replyCode: 200,
                replyBody: {
                    'emailPassword': true,
                    'authProviders': [{
                        'name':                'test',
                        'state':               '123',
                        'codeVerifier':        'v123',
                        'codeChallenge':       'c123',
                        'codeChallengeMethod': 'm123',
                        'authUrl':             'http://example.com'
                    }],
                },
            });

            const result = await service.listAuthMethods({ 'q1': 123 });

            assert.deepEqual(result, { 'emailPassword': true, 'authProviders': [{
                'name':                'test',
                'state':               '123',
                'codeVerifier':        'v123',
                'codeChallenge':       'c123',
                'codeChallengeMethod': 'm123',
                'authUrl':             'http://example.com'
            }]});
        });
    });

    describe('authViaEmail()', function() {
        it('Should authViaEmail a user by its email and password', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/users/auth-via-email') + '?q1=456',
                body: {
                    'email': 'test@example.com',
                    'password': '123456',
                    'b1': 123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_auth',
                    'user': { 'id': 'id_auth' },
                },
            });

            const result = await service.authViaEmail('test@example.com', '123456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_auth', service.decode({ 'id': 'id_auth' }));
        });
    });

    describe('authViaOAuth2()', function() {
        it('Should authViaOAuth2 a user by an oauth2 client', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/users/auth-via-oauth2') + '?q1=456',
                body: {
                    'provider':     'test',
                    'code':         'c123',
                    'codeVerifier': 'v123',
                    'redirectUrl':  'http://example.com',
                    'b1':           123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_auth',
                    'user': { 'id': 'id_auth' },
                },
            });

            const result = await service.authViaOAuth2('test', 'c123', 'v123', 'http://example.com', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_auth', service.decode({ 'id': 'id_auth' }));
        });
    });

    describe('refresh()', function() {
        it('Should refresh an authorized user instance', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/users/refresh') + '?q1=456',
                body: { 'b1': 123 },
                replyCode: 200,
                replyBody: {
                    'token': 'token_refresh',
                    'user': { 'id': 'id_refresh' },
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
                url: service.client.buildUrl('/api/users/request-password-reset') + '?q1=456',
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
                url: service.client.buildUrl('/api/users/confirm-password-reset') + '?q1=456',
                body: {
                    'token': 'test',
                    'password': '123',
                    'passwordConfirm': '456',
                    'b1': 123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_password_confirm',
                    'user': { 'id': 'id_password_confirm' },
                },
            });

            const result = await service.confirmPasswordReset('test', '123', '456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_password_confirm', service.decode({ 'id': 'id_password_confirm' }));
        });
    });

    describe('requestVerification()', function() {
        it('Should send a password reset request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/users/request-verification') + '?q1=456',
                body: {
                    'email': 'test@example.com',
                    'b1': 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestVerification('test@example.com', { 'b1': 123 }, { 'q1': 456 });

            assert.isTrue(result);
        });
    });

    describe('confirmVerification()', function() {
        it('Should confirm a password reset request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/users/confirm-verification') + '?q1=456',
                body: {
                    'token': 'test',
                    'b1': 123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_verification_confirm',
                    'user': { 'id': 'id_verification_confirm' },
                },
            });

            const result = await service.confirmVerification('test', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_verification_confirm', service.decode({ 'id': 'id_verification_confirm' }));
        });
    });

    describe('requestEmailChange()', function() {
        it('Should send an email change request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/users/request-email-change') + '?q1=456',
                body: {
                    'newEmail': 'test@example.com',
                    'b1': 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestEmailChange('test@example.com', { 'b1': 123 }, { 'q1': 456 });
            assert.isTrue(result);
        });
    });

    describe('confirmEmailChange()', function() {
        it('Should confirm an email change request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl('/api/users/confirm-email-change') + '?q1=456',
                body: {
                    'token': 'test',
                    'password': '1234',
                    'b1': 123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_email_change_confirm',
                    'user': { 'id': 'id_email_change_confirm' },
                },
            });


            const result = await service.confirmEmailChange('test', '1234', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_email_change_confirm', service.decode({ 'id': 'id_email_change_confirm' }));
        });
    });
});
