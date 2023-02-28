import chai, { assert } from 'chai';
import chaiAsPromised   from 'chai-as-promised';
import Client           from '@/Client';
import LocalAuthStore   from '@/stores/LocalAuthStore';
import { FetchMock }    from './mocks';
import Admin            from '@/models/Admin';
import Record           from '@/models/Record';
import RecordService    from '@/services/RecordService';

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
            const client = new Client('test_base_url', null, 'test_language');

            assert.equal(client.baseUrl, 'test_base_url');
            assert.instanceOf(client.authStore, LocalAuthStore);
            assert.equal(client.lang, 'test_language');
        });

        it('Should load all api resources', async function() {
            const client = new Client('test_base_url');

            const baseServices = [
                'admins',
                'collections',
                'logs',
                'settings',
                'realtime',
            ];

            for (const service of baseServices) {
                assert.isNotEmpty((client as any)[service]);
            }
        });
    });

    describe('collection()', function() {
        it('Should initialize the related collection record service', function() {
            const client = new Client('test_base_url');

            const service1 = client.collection('test1');
            const service2 = client.collection('test2');
            const service3 = client.collection('test1'); // same as service1

            assert.instanceOf(service1, RecordService);
            assert.instanceOf(service2, RecordService);
            assert.instanceOf(service3, RecordService);
            assert.equal(service1, service3);
            assert.notEqual(service1, service2);
            assert.equal(service1.baseCrudPath, '/api/collections/test1/records');
            assert.equal(service2.baseCrudPath, '/api/collections/test2/records');
            assert.equal(service3.baseCrudPath, '/api/collections/test1/records');
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

    describe('getFileUrl()', function () {
        const client = new Client('test_base_url');

        it('Should return a formatted url', async function () {
            const record = new Record({'id': '456', 'collectionId': '123'});
            const result = client.getFileUrl(record, 'demo.png')

            assert.deepEqual(result, 'test_base_url/api/files/123/456/demo.png');
        });

        it('Should return a formatted url + query params', async function () {
            const record = new Record({'id': '456', 'collectionId': '123'});
            const result = client.getFileUrl(record, 'demo=', {'test': 'abc'})

            assert.deepEqual(result, 'test_base_url/api/files/123/456/demo%3D?test=abc');
        });
    });

    describe('send()', function() {
        it('Should build and send http request', async function() {
            const client = new Client('test_base_url', null, 'test_language_A');

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
            const client = new Client('test_base_url', null, 'test_language_A');

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
                    return config?.headers?.Authorization === 'token123';
                },
                replyCode: 200,
            });
            const admin = new Admin({ 'id': 'test-admin' });
            client.authStore.save('token123', admin);
            await client.send('/admin', { method: 'GET' });

            // user token
            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/user',
                additionalMatcher: (_, config: any): boolean => {
                    return config?.headers?.Authorization === 'token123';
                },
                replyCode: 200,
            });
            const user = new Record({ 'id': 'test-user', "collectionId": 'test-user' });
            client.authStore.save('token123', user);
            await client.send('/user', { method: 'GET' });
        });

        it('Should trigger the before hook', async function() {
            const client = new Client('test_base_url');
            const newUrl = "test_base_url/new"

            client.beforeSend = function (_, options) {
                options.headers = Object.assign(options.headers, {
                    'X-Custom-Header': '456',
                });

                return { url: newUrl, options};
            };

            fetchMock.on({
                method:    'GET',
                url:       newUrl,
                replyCode: 200,
                replyBody: '123',
                additionalMatcher: function (url, config) {
                    return url == newUrl && (config?.headers as any)?.['X-Custom-Header'] == '456';
                },
            });

            const responseSuccess = await client.send('/old', { method: 'GET' })
            assert.equal(responseSuccess, '123');
        });

        it('Should trigger the after hook', async function() {
            const client = new Client('test_base_url');

            client.afterSend = function (response, _) {
                if (response.url === 'test_base_url/failure') {
                    throw new Error("test_error");
                }

                return '789';
            };

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/success',
                replyCode: 200,
                replyBody: '123',
            });

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/failure',
                replyCode: 200,
                replyBody: '456',
            });

            // will be replaced with /new
            const responseSuccess = await client.send('/success', { method: 'GET' })
            assert.equal(responseSuccess, '789');

            const responseFailure = client.send('/failure', { method: 'GET' })
            await assert.isRejected(responseFailure, null);
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
        it('Should disable auto cancellation', async function() {
            const client = new Client('test_base_url').autoCancellation(false);

            fetchMock.on({
                method:    'GET',
                url:       'test_base_url/123',
                delay:     5,
                replyCode: 200,
            })

            const requestA = client.send('/123', { method: 'GET' });
            const requestB = client.send('/123', { method: 'GET' });

            await assert.isFulfilled(requestA);
            await assert.isFulfilled(requestB);
        });

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
