import { assert }                from 'chai';
import { crudServiceTestsSuite } from '../suites';
import Client                    from '@/Client';
import mockAdapter               from 'axios-mock-adapter';
import Users                     from '@/services/Users';
import User                      from '@/models/User';

describe('Users', function() {
    const client = new Client('test_base_url');
    const service = new Users(client);
    const adapter = new mockAdapter(service.client.http);

    beforeEach(function() {
        service.client.AuthStore.clear(); // reset
    });

    adapter
        // list auth methods
        .onGet('/api/users/auth-methods', { 'q1': 123 })
        .reply(200, {
            'emailPassword': true,
            'authProviders': [{
                'name':                'test',
                'state':               '123',
                'codeVerifier':        'v123',
                'codeChallenge':       'c123',
                'codeChallengeMethod': 'm123',
                'authUrl':             'http://example.com'
            }],
        })
        // authenticate via email
        .onPost('/api/users/auth-via-email', {
            'email': 'test@example.com',
            'password': '123456',
            'b1': 123,
        })
        .reply(200, {
            'token': 'token_auth',
            'user': { 'id': 'id_auth' },
        })
        // authenticate via oauth2
        .onPost('/api/users/auth-via-oauth2', {
            'provider':     'test',
            'code':         'c123',
            'codeVerifier': 'v123',
            'redirectUrl':  'http://example.com',
            'b1':           123,
        })
        .reply(200, {
            'token': 'token_auth',
            'user': { 'id': 'id_auth' },
        })
        // refresh
        .onPost('/api/users/refresh', { 'b1': 123 })
        .reply(200, {
            'token': 'token_refresh',
            'user': { 'id': 'id_refresh' },
        })
        // request password reset
        .onPost('/api/users/request-password-reset', {
            'email': 'test@example.com',
            'b1': 123,
        })
        .reply(200)
        // confirm password reset
        .onPost('/api/users/confirm-password-reset', {
            'token': 'test',
            'password': '123',
            'passwordConfirm': '456',
            'b1': 123,
        })
        .reply(200, {
            'token': 'token_password_confirm',
            'user': { 'id': 'id_password_confirm' },
        })
        // request verification
        .onPost('/api/users/request-verification', {
            'email': 'test@example.com',
            'b1': 123,
        })
        .reply(200)
        // confirm verification
        .onPost('/api/users/confirm-verification', {
            'token': 'test',
            'b1': 123,
        })
        .reply(200, {
            'token': 'token_verification_confirm',
            'user': { 'id': 'id_verification_confirm' },
        })
        // request email change
        .onPost('/api/users/request-email-change', {
            'newEmail': 'test@example.com',
            'b1': 123,
        })
        .reply(200)
        // confirm email change
        .onPost('/api/users/confirm-email-change', {
            'token': 'test',
            'password': '1234',
            'b1': 123,
        })
        .reply(200, {
            'token': 'token_email_change_confirm',
            'user': { 'id': 'id_email_change_confirm' },
        })
    ;

    function authResponseCheck(result: { [key: string]: any }, expectedToken: string, expectedUser: User) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.instanceOf(result.user, User);
        assert.deepEqual(result.user, expectedUser);
        assert.equal(service.client.AuthStore.token, expectedToken);
        assert.deepEqual(service.client.AuthStore.model, expectedUser);
    }

    // Tests:
    // ---

    crudServiceTestsSuite(service, '/api/users', adapter);

    describe('listAuthMethods()', function () {
        it('Should fetch all available authorization methods', async function () {
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
            const result = await service.authViaEmail('test@example.com', '123456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_auth', service.decode({ 'id': 'id_auth' }));
        });
    });

    describe('authViaOAuth2()', function() {
        it('Should authViaOAuth2 a user by an oauth2 client', async function() {
            const result = await service.authViaOAuth2('test', 'c123', 'v123', 'http://example.com', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_auth', service.decode({ 'id': 'id_auth' }));
        });
    });

    describe('refresh()', function() {
        it('Should refresh an authorized user instance', async function() {
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

    describe('requestVerification()', function() {
        it('Should send a password reset request', async function() {
            const result = await service.requestVerification('test@example.com', { 'b1': 123 }, { 'q1': 456 });

            assert.isTrue(result);
        });
    });

    describe('confirmVerification()', function() {
        it('Should confirm a password reset request', async function() {
            const result = await service.confirmVerification('test', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_verification_confirm', service.decode({ 'id': 'id_verification_confirm' }));
        });
    });

    describe('requestEmailChange()', function() {
        it('Should send an email change request', async function() {
            const result = await service.requestEmailChange('test@example.com', { 'b1': 123 }, { 'q1': 456 });
            assert.isTrue(result);
        });
    });

    describe('confirmEmailChange()', function() {
        it('Should confirm an email change request', async function() {
            const result = await service.confirmEmailChange('test', '1234', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_email_change_confirm', service.decode({ 'id': 'id_email_change_confirm' }));
        });
    });
});
