import { assert }                from 'chai';
import { crudServiceTestsSuite } from '../suites';
import { FetchMock }             from 'tests/mocks';
import Client                    from '@/Client';
import RecordService             from '@/services/RecordService';
import Record                    from '@/models/Record';

describe('RecordService', function() {
    const client  = new Client('test_base_url/');
    const service = new RecordService(client, 'sub=');

    crudServiceTestsSuite(service, '/api/collections/sub%3D/records');

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

    describe('AuthStore sync', function() {
        it('Should update the AuthStore record model on matching update id and collection', async function() {
            fetchMock.on({
                method: 'PATCH',
                url: service.client.buildUrl('/api/collections/sub%3D/records/test123'),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", new Record({
                id: "test123",
                collectionName: "sub=",
            }));

            await service.update('test123', {});

            assert.equal(service.client.authStore.model?.email, "new@example.com");
        });

        it('Should not update the AuthStore record model on matching id but mismatched collection', async function() {
            fetchMock.on({
                method: 'PATCH',
                url: service.client.buildUrl('/api/collections/sub%3D/records/test123'),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", new Record({
                id: "test123",
                email: "old@example.com",
                collectionName: "diff",
            }));

            await service.update('test123', {});

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        it('Should not update the AuthStore record model on mismatched update id', async function() {
            fetchMock.on({
                method: 'PATCH',
                url: service.client.buildUrl('/api/collections/sub%3D/records/test123'),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", new Record({
                id: "test456",
                email: "old@example.com",
                collectionName: "sub=",
            }));

            await service.update('test123', {});

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        it('Should delete the AuthStore record model on matching delete id and collection', async function() {
            fetchMock.on({
                method: 'DELETE',
                url: service.client.buildUrl('/api/collections/sub%3D/records/test123'),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", new Record({
                id: "test123",
                collectionName: "sub=",
            }));

            await service.delete('test123');

            assert.isNull(service.client.authStore.model);
        });

        it('Should not delete the AuthStore record model on matching delete id but mismatched collection', async function() {
            fetchMock.on({
                method: 'DELETE',
                url: service.client.buildUrl('/api/collections/sub%3D/records/test123'),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", new Record({
                id: "test123",
                collectionName: "diff",
            }));

            await service.delete('test123');

            assert.isNotNull(service.client.authStore.model);
        });

        it('Should not delete the AuthStore record model on mismatched delete id', async function() {
            fetchMock.on({
                method: 'DELETE',
                url: service.client.buildUrl('/api/collections/sub%3D/records/test123'),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", new Record({
                id: "test456",
                collectionName: "sub=",
            }));

            await service.delete('test123');

            assert.isNotNull(service.client.authStore.model);
        });
    });


    // ---------------------------------------------------------------
    // auth tests
    // ---------------------------------------------------------------

    function authResponseCheck(result: { [key: string]: any }, expectedToken: string, expectedRecord: Record) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.instanceOf(result.record, Record);
        assert.deepEqual(result.record, expectedRecord);
        assert.equal(service.client.authStore.token, expectedToken);
        assert.deepEqual(service.client.authStore.model, expectedRecord);
    }

    describe('listAuthMethods()', function () {
        it('Should fetch all available authorization methods', async function () {
            const expectedBody = {
                'usernamePassword': true,
                'emailPassword': true,
                'authProviders': [{
                    'name':                'test',
                    'state':               '123',
                    'codeVerifier':        'v123',
                    'codeChallenge':       'c123',
                    'codeChallengeMethod': 'm123',
                    'authUrl':             'http://example.com'
                }],
            };

            fetchMock.on({
                method: 'GET',
                url: service.client.buildUrl(service.baseCollectionPath) + '/auth-methods?q1=123',
                replyCode: 200,
                replyBody: expectedBody,
            });

            const result = await service.listAuthMethods({ 'q1': 123 });

            assert.deepEqual(result, expectedBody);
        });
    });

    describe('authWithPassword()', function() {
        it('Should authenticate a record by its username/email and password', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl(service.baseCollectionPath) + '/auth-with-password?q1=456',
                body: {
                    'identity': 'test@example.com',
                    'password': '123456',
                    'b1': 123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_auth',
                    'record': { 'id': 'id_auth' },
                },
            });

            const result = await service.authWithPassword('test@example.com', '123456', { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_auth', new Record({ 'id': 'id_auth' }));
        });
    });

    describe('authWithOAuth2()', function() {
        it('Should authWithOAuth2 a record by an OAuth2 client', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl(service.baseCollectionPath) + '/auth-with-oauth2?q1=456',
                body: {
                    'provider':     'test',
                    'code':         'c123',
                    'codeVerifier': 'v123',
                    'redirectUrl':  'http://example.com',
                    'createData':   {'test': 1},
                    'b1':           123,
                },
                replyCode: 200,
                replyBody: {
                    'token': 'token_auth',
                    'record': { 'id': 'id_auth' },
                },
            });

            const result = await service.authWithOAuth2('test', 'c123', 'v123', 'http://example.com', {'test': 1}, { 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_auth', new Record({ 'id': 'id_auth' }));
        });
    });

    describe('authRefresh()', function() {
        it('Should refresh an authorized record instance', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl(service.baseCollectionPath) + '/auth-refresh?q1=456',
                body: { 'b1': 123 },
                replyCode: 200,
                replyBody: {
                    'token': 'token_refresh',
                    'record': { 'id': 'id_refresh' },
                },
            });

            const result = await service.authRefresh({ 'b1': 123 }, { 'q1': 456 });

            authResponseCheck(result, 'token_refresh', new Record({ 'id': 'id_refresh' }));
        });
    });

    describe('requestPasswordReset()', function() {
        it('Should send a password reset request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl(service.baseCollectionPath) + '/request-password-reset?q1=456',
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
                url: service.client.buildUrl(service.baseCollectionPath) + '/confirm-password-reset?q1=456',
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

    describe('requestVerification()', function() {
        it('Should send a password reset request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl(service.baseCollectionPath) + '/request-verification?q1=456',
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
                url: service.client.buildUrl(service.baseCollectionPath) + '/confirm-verification?q1=456',
                body: {
                    'token': 'test',
                    'b1': 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmVerification('test', { 'b1': 123 }, { 'q1': 456 });

            assert.isTrue(result);
        });
    });

    describe('requestEmailChange()', function() {
        it('Should send an email change request', async function() {
            fetchMock.on({
                method: 'POST',
                url: service.client.buildUrl(service.baseCollectionPath) + '/request-email-change?q1=456',
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
                url: service.client.buildUrl(service.baseCollectionPath) + '/confirm-email-change?q1=456',
                body: {
                    'token': 'test',
                    'password': '1234',
                    'b1': 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmEmailChange('test', '1234', { 'b1': 123 }, { 'q1': 456 });

            assert.isTrue(result);
        });
    });

    describe('listExternalAuths()', function() {
        it('Should send a list external auths request', async function() {
            fetchMock.on({
                method: 'GET',
                url: service.client.buildUrl(service.baseCrudPath) + '/' + encodeURIComponent('@test_id') + '/external-auths?q1=456',
                replyCode: 200,
                replyBody: [
                    { id: '1', provider: 'google' },
                    { id: '2', provider: 'github' },
                ],
            });

            const result = await service.listExternalAuths('@test_id', { 'q1': 456 });

            assert.equal(result.length, 2);
            assert.equal(result[0].provider, 'google');
            assert.equal(result[1].provider, 'github');
        });
    });

    describe('unlinkExternalAuth()', function() {
        it('Should send a unlinkExternalAuth request', async function() {
            fetchMock.on({
                method: 'DELETE',
                url: service.client.buildUrl(service.baseCrudPath) + '/' + encodeURIComponent("@test_id") + "/external-auths/" + encodeURIComponent("@test_provider") + '?q1=456',
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.unlinkExternalAuth('@test_id', '@test_provider', { 'q1': 456 });

            assert.isTrue(result);
        });
    });
});
