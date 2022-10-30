import { assert }     from 'chai';
import LocalAuthStore from '@/stores/LocalAuthStore';
import Admin          from '@/models/Admin';
import Record         from '@/models/Record';

describe('LocalAuthStore', function() {
    describe('save()', function() {
        it('Should store auth data', function() {
            const store = new LocalAuthStore();

            store.save('test1', new Record({ 'id': 'id1' }));
            assert.equal(store.token, 'test1');
            assert.deepEqual(store.model, new Record({ 'id': 'id1' }));

            // update
            store.save('test2', new Admin({ 'id': 'id2' }));
            assert.equal(store.token, 'test2');
            assert.deepEqual(store.model, new Admin({ 'id': 'id2' }));
        });
    });

    describe('clear()', function() {
        it('Should remove all stored auth data', function() {
            const store = new LocalAuthStore();

            store.save('test', new Admin({ 'id': 'id1' }));
            assert.equal(store.token, 'test');
            assert.deepEqual(store.model, new Admin({ 'id': 'id1' }));

            store.clear();
            assert.equal(store.token, '');
            assert.deepEqual(store.model, null);
        });
    });

    describe('get token()', function() {
        it('Should extract the stored token value', function() {
            const store = new LocalAuthStore();

            assert.equal(store.token, '');
            store.save('test', new Record({ 'id': "1" }));
            assert.equal(store.token, 'test');
        });
    });

    describe('get model()', function() {
        it('Should extract the stored model value', function() {
            const store = new LocalAuthStore();

            assert.deepEqual(store.model, null);
            store.save('test', new Record({ 'id': "1" }));
            assert.deepEqual(store.model, new Record({ 'id': "1" }));
        });
    });

    describe('get isValid()', function() {
        it('Should validate the stored token value', function() {
            const store = new LocalAuthStore();

            assert.isFalse(store.isValid, 'empty token string (initial)');

            store.save('test', new Record({ 'id': "1" }));
            assert.isFalse(store.isValid, 'invalid token string');

            store.save('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTYyNDc4ODAwMH0.WOzXh8TQh6fBXJJlOvHktBuv7D8eSyrYx4_IBj2Deyo', new Record({ 'id': "1" }));
            assert.isFalse(store.isValid, 'expired token');

            store.save('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE', new Record({ 'id': "1" }));
            assert.isTrue(store.isValid, 'valid token');
        });
    });

    describe('loadFromCookie()', function() {
        it('Should populate the store with the parsed cookie data', function() {
            const store = new LocalAuthStore();

            const data = {
                token: "test_token",
                model: {"id": 123},
            };

            store.loadFromCookie("pb_auth=" + JSON.stringify(data));

            assert.equal(store.token, data.token);
            assert.deepEqual((store.model as any).id, data.model?.id);
        });
    });

    describe('exportToCookie()', function() {
        it('Should generate a cookie from the store data (with default options)', function() {
            const store = new LocalAuthStore();
            store.save(
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE',
                new Record({ 'id': "1" }),
            );

            const result = store.exportToCookie();

            assert.equal(result, "pb_auth=%7B%22token%22%3A%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE%22%2C%22model%22%3A%7B%22id%22%3A%221%22%2C%22created%22%3A%22%22%2C%22updated%22%3A%22%22%2C%22collectionId%22%3A%22%22%2C%22collectionName%22%3A%22%22%2C%22expand%22%3A%7B%7D%7D%7D; Path=/; Expires=Thu, 27 Jun 2030 10:00:00 GMT; HttpOnly; Secure; SameSite=Strict");
        });

        it('Should generate a cookie from the store data (with custom options)', function() {
            const store = new LocalAuthStore();
            store.save(
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE',
                new Record({
                    id:       '1',
                    email:    'test@example.com',
                    verified: true,
                    name:     'test',
                }),
            );

            const result = store.exportToCookie({
                path:     '/a/b/c',
                expires:  new Date('2022-01-01'),
                httpOnly: true,
            }, 'custom_key');

            assert.equal(result, 'custom_key=%7B%22token%22%3A%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE%22%2C%22model%22%3A%7B%22id%22%3A%221%22%2C%22email%22%3A%22test%40example.com%22%2C%22verified%22%3Atrue%2C%22name%22%3A%22test%22%2C%22created%22%3A%22%22%2C%22updated%22%3A%22%22%2C%22collectionId%22%3A%22%22%2C%22collectionName%22%3A%22%22%2C%22expand%22%3A%7B%7D%7D%7D; Path=/a/b/c; Expires=Sat, 01 Jan 2022 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict');
        });

        it('Should strip the model data in the generated cookie if exceed 4096', function() {
            const store = new LocalAuthStore();
            store.save(
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE',
                new Record({
                    id:       '1',
                    email:    'test@example.com',
                    verified: true,
                    name:     'a'.repeat(4000),
                }),
            );

            const result = store.exportToCookie({
                path:     '/a/b/c',
                expires:  new Date('2022-01-01'),
                httpOnly: true,
            });

            assert.equal(result, 'pb_auth=%7B%22token%22%3A%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE%22%2C%22model%22%3A%7B%22id%22%3A%221%22%2C%22email%22%3A%22test%40example.com%22%2C%22verified%22%3Atrue%2C%22collectionId%22%3A%22%22%7D%7D; Path=/a/b/c; Expires=Sat, 01 Jan 2022 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict');
        });
    });

    describe('onChange()', function() {
        it('Should trigger the onChange() callbacks', function() {
            const store = new LocalAuthStore();

            let callback1Calls = 0;
            let callback2Calls = 0;

            const removal1 = store.onChange(() => {
                callback1Calls++;
            }, true);

            const removal2 = store.onChange(() => {
                callback2Calls++;
            });

            // trigger save() change
            store.save('test', new Record({ 'id': '1' }));
            assert.equal(callback1Calls, 2); // +1 because of the immediate invocation
            assert.equal(callback2Calls, 1);

            // trigger clear() change
            store.clear();
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 2);

            // remove the second listener (aka. callback1Calls shouldn't be called anymore)
            removal1();

            store.save('test', new Record({ 'id': '1' }));
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 3);

            // remove the second listener (aka. callback2Calls shouldn't be called anymore)
            removal2();

            store.save('test', new Record({ 'id': '1' }));
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 3);
        });
    });
});
