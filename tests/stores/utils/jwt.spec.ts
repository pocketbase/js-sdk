import { assert } from 'chai';
import { getTokenPayload, isTokenExpired } from '@/stores/utils/jwt';

describe('jwt', function () {
    describe('getTokenPayload()', function () {
        it('Should extract JWT payload without validation', function () {
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjN9.da77dJt5jjPU43vaaCr6WeHEXrxzB37b0edfjwyD-2M'

            const payload = getTokenPayload(token);

            assert.deepEqual(payload, { 'test': 123 });
        });

        it('Should fallback to empty object on invalid JWT string', function () {
            const testCases = ['', 'abc', 'a.b.c'];
            for (let i in testCases) {
                const test = testCases[i];
                const payload = getTokenPayload(test);
                assert.deepEqual(payload, {}, 'scenario ' + i);
            }
        });
    });

    describe('isTokenExpired()', function () {
        it('Should successfully verify that a JWT token is expired or not', function () {
            const testCases = [
                // invalid JWT string
                [true, ''],
                // token with empty payload is also considered invalid JWT string
                [true, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.Et9HFtf9R3GEMA0IICOfFMVXY7kkTX1wr4qCyhIf58U'],
                // token without exp param
                [false, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjN9.da77dJt5jjPU43vaaCr6WeHEXrxzB37b0edfjwyD-2M'],
                // token with exp param in the past
                [true, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTYyNDc4ODAwMH0.WOzXh8TQh6fBXJJlOvHktBuv7D8eSyrYx4_IBj2Deyo'],
                // token with exp param in the future
                [false, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE'],
            ];
            for (let i in testCases) {
                const test = testCases[i];
                assert.equal(isTokenExpired(test[1] as string), test[0], 'scenario ' + i);
            }
        });
    });
});
