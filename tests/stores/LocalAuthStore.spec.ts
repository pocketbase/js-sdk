import { assert }     from 'chai';
import LocalAuthStore from '@/stores/LocalAuthStore';
import Admin          from '@/models/Admin';
import User           from '@/models/User';

describe('LocalAuthStore', function() {
    describe('save()', function() {
        it('Should store auth data', function() {
            const store = new LocalAuthStore();

            store.save('test1', { 'id': 'id1', 'verified': false });
            assert.equal(store.token, 'test1');
            assert.deepEqual(store.model, new User({ 'id': 'id1', 'verified': false }));

            // update
            store.save('test2', { 'id': 'id2' });
            assert.equal(store.token, 'test2');
            assert.deepEqual(store.model, new Admin({ 'id': 'id2' }));
        });
    });

    describe('clear()', function() {
        it('Should remove all stored auth data', function() {
            const store = new LocalAuthStore();

            store.save('test', { 'id': 'id1' });
            assert.equal(store.token, 'test');
            assert.deepEqual(store.model, new Admin({ 'id': 'id1' }));

            store.clear();
            assert.equal(store.token, '');
            assert.deepEqual(store.model, {});
        });
    });

    describe('get token()', function() {
        it('Should extract the stored token value', function() {
            const store = new LocalAuthStore();

            assert.equal(store.token, '');
            store.save('test', { 'id': 1 });
            assert.equal(store.token, 'test');
        });
    });

    describe('get model()', function() {
        it('Should extract the stored token value', function() {
            const store = new LocalAuthStore();

            assert.deepEqual(store.model, {});
            store.save('test', { 'id': 1 });
            assert.deepEqual(store.model, new Admin({ 'id': 1 }));
        });
    });

    describe('get isValid()', function() {
        it('Should validate the stored token value', function() {
            const store = new LocalAuthStore();

            assert.isFalse(store.isValid, 'empty token string (initial)');

            store.save('test', { 'id': 1 });
            assert.isFalse(store.isValid, 'invalid token string');

            store.save('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTYyNDc4ODAwMH0.WOzXh8TQh6fBXJJlOvHktBuv7D8eSyrYx4_IBj2Deyo', { 'id': 1 });
            assert.isFalse(store.isValid, 'expired token');

            store.save('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE', { 'id': 1 });
            assert.isTrue(store.isValid, 'valid token');
        });
    });
});
