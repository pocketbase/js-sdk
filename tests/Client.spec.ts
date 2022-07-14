import glob             from 'glob';
import chai, { assert } from 'chai';
import chaiAsPromised   from 'chai-as-promised';
import Client           from '@/Client';
import LocalAuthStore   from '@/stores/LocalAuthStore';
import { FetchMock }    from './mocks';
import Admin            from '@/models/Admin';
import User             from '@/models/User';

chai.use(chaiAsPromised);

describe('Client', function() {
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

    describe('constructor()', function() {
        it('Should create a properly configured http client instance', function() {
            const client = new Client('test_base_url', 'test_language', null);

            assert.equal(client.baseUrl, 'test_base_url');
            assert.instanceOf(client.AuthStore, LocalAuthStore);
        });

        it('Should load all api resources', async function() {
            const client = new Client('test_base_url');
            const services = glob.sync('src/services/*.ts');

            assert.isNotEmpty(services);

            for (let i = 0; i < services.length; i++) {
                const serviceClass = ((await import('./../' + services[i])).default)
                assert.instanceOf(
                    (client as any)[serviceClass.prototype.constructor.name],
                    serviceClass.prototype.constructor
                );
            }
        });
    });

    describe('buildUrl()', function() {
        it('Should properly concatenate path to baseUrl', function() {
            // with trailing slash
            const client1 = new Client('test_base_url/');
            assert.equal(client1.buildUrl("test123"), 'test_base_url/test123');
            assert.equal(client1.buildUrl("/test123"), 'test_base_url/test123');

            // no trailing slash
            const client2 = new Client('test_base_url');
            assert.equal(client2.buildUrl("test123"), 'test_base_url/test123');
            assert.equal(client2.buildUrl("/test123"), 'test_base_url/test123');
        });
    });

    describe('send()', function() {
        it('Should build and send http request', async function() {
            const client = new Client('test_base_url', 'test_language_A');

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/123',
                replyCode: 200,
                replyBody: 'successGet',
            });

            fetchMock.on({
                method:    'POST',
                url:       'test_base_url/123',
                replyCode: 200,
                replyBody: 'successPost',
            });

            fetchMock.on({
                method:    'PUT',
                url:       'test_base_url/123',
                replyCode: 200,
                replyBody: 'successPut',
            });


            fetchMock.on({
                method:    'PATCH',
                url:       'test_base_url/123',
                replyCode: 200,
                replyBody: 'successPatch',
            });

            fetchMock.on({
                method:    'DELETE',
                url:       'test_base_url/123',
                replyCode: 200,
                replyBody: 'successDelete',
            });

            const testCases = [
                [client.send('/123', { method: 'GET' }), 'successGet'],
                [client.send('/123', { method: 'POST' }), 'successPost'],
                [client.send('/123', { method: 'PUT' }), 'successPut'],
                [client.send('/123', { method: 'PATCH' }), 'successPatch'],
                [client.send('/123', { method: 'DELETE' }), 'successDelete'],
            ];
            for (let testCase of testCases) {
                const responseData = await testCase[0]
                assert.equal(responseData, testCase[1]);
            }
        });
        it('Should auto add authorization header if missing', async function() {
            const client = new Client('test_base_url', 'test_language_A');

            // none
            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/none',
                additionalMatcher: (_, config: any): boolean => {
                    return !config?.headers?.Authorization;
                },
                replyCode: 200,
            });
            await client.send('/none', { method: 'GET' });

            // admin token
            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/admin',
                additionalMatcher: (_, config: any): boolean => {
                    return config?.headers?.Authorization === 'Admin token123';
                },
                replyCode: 200,
            });
            const admin = new Admin({ 'id': 'test-admin' });
            client.AuthStore.save('token123', admin);
            await client.send('/admin', { method: 'GET' });

            // user token
            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/user',
                additionalMatcher: (_, config: any): boolean => {
                    return config?.headers?.Authorization === 'User token123';
                },
                replyCode: 200,
            });
            const user = new User({ 'id': 'test-user', "@collectionId": 'test-user' });
            client.AuthStore.save('token123', user);
            await client.send('/user', { method: 'GET' });
        });
    });

    describe('cancelRequest()', function() {
        it('Should cancel pending request', async function() {
            const client = new Client('test_base_url');

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/123',
                delay:     5,
                replyCode: 200,
            })

            const response = client.send("/123", { method: 'GET', params: { '$cancelKey': 'testKey' } });

            client.cancelRequest('testKey');

            await assert.isRejected(response, null);
        });
    });

    describe('cancelAllRequests()', function() {
        it('Should cancel all pending requests', async function() {
            const client = new Client('test_base_url');

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/123',
                delay:     5,
                replyCode: 200,
            });

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/456',
                delay:     5,
                replyCode: 200,
            })

            const requestA = client.send("/123", { method: 'GET' });
            const requestB = client.send("/456", { method: 'GET' });

            client.cancelAllRequests();

            await assert.isRejected(requestA, null);
            await assert.isRejected(requestB, null);
        });
    });

    describe('auto cancellation', function() {
        it('Should auto cancel duplicated requests with default key', async function() {
            const client = new Client('test_base_url');

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/123',
                delay:     5,
                replyCode: 200,
            })

            const requestA = client.send('/123', { method: 'GET' });
            const requestB = client.send('/123', { method: 'GET' });
            const requestC = client.send('/123', { method: 'GET' });

            await assert.isRejected(requestA, null);
            await assert.isRejected(requestB, null);
            await assert.isFulfilled(requestC);
        });

        it('Should auto cancel duplicated requests with custom key', async function() {
            const client = new Client('test_base_url');

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/123',
                delay:     5,
                replyCode: 200,
            })

            const requestA = client.send('/123', { method: 'GET', params: { $cancelKey: 'customKey' } });
            const requestB = client.send('/123', { method: 'GET' });

            await assert.isFulfilled(requestA);
            await assert.isFulfilled(requestB);
        });

        it('Should skip auto cancellation', async function() {
            const client = new Client('test_base_url');

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/123',
                delay:     5,
                replyCode: 200,
            })

            const requestA = client.send('/123', { method: 'GET', params: { $autoCancel: false } });
            const requestB = client.send('/123', { method: 'GET', params: { $autoCancel: false } });
            const requestC = client.send('/123', { method: 'GET', params: { $autoCancel: false } });

            await assert.isFulfilled(requestA);
            await assert.isFulfilled(requestB);
            await assert.isFulfilled(requestC);
        });
    });
});
