import glob             from 'glob';
import mockAdapter      from 'axios-mock-adapter';
import chai, { assert } from 'chai';
import chaiAsPromised   from 'chai-as-promised';
import Client           from '@/Client';
import LocalAuthStore   from '@/stores/LocalAuthStore';
import Admin            from '@/models/Admin';
import User             from '@/models/User';

chai.use(chaiAsPromised);

describe('Client', function() {
    describe('constructor()', function() {
        it('Should create a properly configured http client instance', function() {
            const client = new Client('test_base_url', 'test_language', null, { 'timeout': 1234 });

            assert.equal(client.http.defaults.timeout, 1234);
            assert.equal(client.http.defaults.baseURL, 'test_base_url');
            assert.equal(client.http.defaults.headers.common['Accept-Language'], 'test_language');
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

    describe('baseUrl setter', function() {
        it('Should update the default http client base url', function() {
            const client = new Client('test_base_url_A', 'test_language');
            assert.equal(client.http.defaults.baseURL, 'test_base_url_A');

            client.baseUrl = 'test_base_url_B';
            assert.equal(client.http.defaults.baseURL, 'test_base_url_B');
        });
    });

    describe('language setter', function() {
        it('Should update the default http client language header', function() {
            const client = new Client('test_base_url_A', 'test_language_A');
            assert.equal(client.http.defaults.headers.common['Accept-Language'], 'test_language_A');

            client.language = 'test_language_B';
            assert.equal(client.http.defaults.headers.common['Accept-Language'], 'test_language_B');
        });

        it('Should remove the default http client language header', function() {
            const client = new Client('test_base_url_A', 'test_language_A');
            assert.equal(client.http.defaults.headers.common['Accept-Language'], 'test_language_A');

            client.language = '';
            assert.isUndefined(client.http.defaults.headers.common['Accept-Language']);
        });
    });

    describe('send()', function() {
        it('Should build and send http request', async function() {
            const client = new Client('test_base_url', 'test_language_A');
            const adapter = new mockAdapter(client.http);
            adapter.onGet('/123').reply(200, 'successGet');
            adapter.onPost('/123').reply(200, 'successPost');
            adapter.onPut('/123').reply(200, 'successPut');
            adapter.onPatch('/123').reply(200, 'successPatch');
            adapter.onDelete('/123').reply(200, 'successDelete');

            const testCases = [
                [client.send({ url: '/123', method: 'get' }), 'successGet'],
                [client.send({ url: '/123', method: 'post' }), 'successPost'],
                [client.send({ url: '/123', method: 'put' }), 'successPut'],
                [client.send({ url: '/123', method: 'patch' }), 'successPatch'],
                [client.send({ url: '/123', method: 'delete' }), 'successDelete'],
            ];
            for (let testCase of testCases) {
                const response = await testCase[0]
                assert.equal(response?.data, testCase[1]);
            }
        });
        it('Should auto add authorization header if missing', async function() {
            const client = new Client('test_base_url', 'test_language_A');
            const adapter = new mockAdapter(client.http);
            adapter.onAny().reply(200);

            const responseA = await client.send({ url: '/123', method: 'get' });
            assert.isUndefined(responseA.config.headers?.Authorization);

            // admin token
            const admin = new Admin({ 'id': 'test-admin' });
            client.AuthStore.save('token123', admin);
            const responseB = await client.send({ url: '/123', method: 'get' });
            assert.equal(responseB.config.headers?.Authorization, "Admin token123");

            // user token
            const user = new User({ 'id': 'test-user', "@collectionId": 'test-user' });
            client.AuthStore.save('token123', user);
            const responseC = await client.send({ url: '/123', method: 'get' });
            assert.equal(responseC.config.headers?.Authorization, "User token123");
        });
    });

    describe('cancelRequest()', function() {
        it('Should cancel pending request', async function() {
            const client = new Client('test_base_url');
            const adapter = new mockAdapter(client.http, { delayResponse: 50 });
            adapter.onGet('/123').reply(200);

            const request = client.send({ url: '/123', method: 'get', params: { '$cancelKey': 'testKey' } });

            setTimeout(() => {
                client.cancelRequest('testKey');
            }, 0);

            await assert.isRejected(request, null);
        });
    });

    describe('cancelAllRequests()', function() {
        it('Should cancel all pending requests', async function() {
            const client = new Client('test_base_url');
            const adapter = new mockAdapter(client.http, { delayResponse: 50 });
            adapter.onGet('/123').reply(200);
            adapter.onGet('/456').reply(200);

            const requestA = client.send({ url: '/123', method: 'get' });
            const requestB = client.send({ url: '/456', method: 'get' });

            setTimeout(() => {
                client.cancelAllRequests();
            }, 0);

            await assert.isRejected(requestA, null);
            await assert.isRejected(requestB, null);
        });
    });

    describe('auto cancellation', function() {
        it('Should auto cancel duplicated requests with default key', async function() {
            const client = new Client('test_base_url');
            const adapter = new mockAdapter(client.http, { delayResponse: 50 });
            adapter.onGet('/123').reply(200);

            const requestA = client.send({ url: '/123', method: 'get' });
            const requestB = client.send({ url: '/123', method: 'get' });
            const requestC = client.send({ url: '/123', method: 'get' });

            await assert.isRejected(requestA, null);
            await assert.isRejected(requestB, null);
            await assert.isFulfilled(requestC);
        });

        it('Should auto cancel duplicated requests with custom key', async function() {
            const client = new Client('test_base_url');
            const adapter = new mockAdapter(client.http, { delayResponse: 50 });
            adapter.onGet('/123').reply(200);

            const requestA = client.send({ url: '/123', method: 'get', params: { $cancelKey: 'customKey' } });
            const requestB = client.send({ url: '/123', method: 'get' });

            await assert.isFulfilled(requestA);
            await assert.isFulfilled(requestB);
        });

        it('Should skip auto cancellation', async function() {
            const client = new Client('test_base_url');
            const adapter = new mockAdapter(client.http, { delayResponse: 50 });
            adapter.onGet('/123').reply(200);

            const requestA = client.send({ url: '/123', method: 'get', params: { $autoCancel: false } });
            const requestB = client.send({ url: '/123', method: 'get', params: { $autoCancel: false } });
            const requestC = client.send({ url: '/123', method: 'get', params: { $autoCancel: false } });

            await assert.isFulfilled(requestA);
            await assert.isFulfilled(requestB);
            await assert.isFulfilled(requestC);
        });
    });
});
