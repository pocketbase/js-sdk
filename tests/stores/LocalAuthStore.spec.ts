import { describe, assert, test } from "vitest";
import { LocalAuthStore } from "@/stores/LocalAuthStore";

describe("LocalAuthStore", function () {
    describe("save()", function () {
        test("Should store auth data", function () {
            const store = new LocalAuthStore();

            store.save("test1", { id: "id1" } as any);
            assert.equal(store.token, "test1");
            assert.deepEqual(store.model, { id: "id1" } as any);

            // update
            store.save("test2", { id: "id2" } as any);
            assert.equal(store.token, "test2");
            assert.deepEqual(store.model, { id: "id2" } as any);
        });
    });

    describe("clear()", function () {
        test("Should remove all stored auth data", function () {
            const store = new LocalAuthStore();

            store.save("test", { id: "id1" } as any);
            assert.equal(store.token, "test");
            assert.deepEqual(store.model, { id: "id1" } as any);

            store.clear();
            assert.equal(store.token, "");
            assert.deepEqual(store.model, null);
        });
    });

    describe("get token()", function () {
        test("Should extract the stored token value", function () {
            const store = new LocalAuthStore();

            assert.equal(store.token, "");
            store.save("test", { id: "1" } as any);
            assert.equal(store.token, "test");
        });
    });

    describe("get model()", function () {
        test("Should extract the stored model value", function () {
            const store = new LocalAuthStore();

            assert.deepEqual(store.model, null);
            store.save("test", { id: "1" } as any);
            assert.deepEqual(store.model, { id: "1" } as any);
        });
    });

    describe("get isValid()", function () {
        test("Should validate the stored token value", function () {
            const store = new LocalAuthStore();

            assert.isFalse(store.isValid, "empty token string (initial)");

            store.save("test");
            assert.isFalse(store.isValid, "invalid token string");

            store.save(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTYyNDc4ODAwMH0.WOzXh8TQh6fBXJJlOvHktBuv7D8eSyrYx4_IBj2Deyo",
            );
            assert.isFalse(store.isValid, "expired token");

            store.save(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE",
            );
            assert.isTrue(store.isValid, "valid token");
        });
    });

    describe("get isAdmin()", function () {
        test("Should checks if the stored token is for admin", function () {
            const store = new LocalAuthStore();

            assert.isFalse(store.isAdmin, "empty token (initial)");

            store.save(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWRtaW4iLCJleHAiOjE2MjQ3ODgwMDB9.ZYNR7gqmmeu35h8Gf0uR7-jV-b21WIq8APOBLeevnuw",
            );

            assert.isTrue(store.isAdmin, "admin token");
        });
    });

    describe("get isAuthRecord()", function () {
        test("Should checks if the stored token is for auth record", function () {
            const store = new LocalAuthStore();

            assert.isFalse(store.isAuthRecord, "empty token (initial)");

            store.save(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYXV0aFJlY29yZCIsImV4cCI6MTYyNDc4ODAwMH0.wuEMjDMF0mV_U80bjUEUfnDM6sL2n9yvy0jnU3XZUE8",
            );

            assert.isTrue(store.isAuthRecord, "admin token");
        });
    });

    describe("loadFromCookie()", function () {
        test("Should populate the store with the parsed cookie data", function () {
            const store = new LocalAuthStore();

            const data = {
                token: "test_token",
                model: { id: 123 },
            };

            store.loadFromCookie("pb_auth=" + JSON.stringify(data));

            assert.equal(store.token, data.token);
            assert.deepEqual((store.model as any).id, data.model?.id);
        });
    });

    describe("exportToCookie()", function () {
        test("Should generate a cookie from the store data (with default options)", function () {
            const store = new LocalAuthStore();
            store.save(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE",
                { id: "1" } as any,
            );

            const result = store.exportToCookie();

            assert.equal(
                result,
                "pb_auth=%7B%22token%22%3A%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE%22%2C%22model%22%3A%7B%22id%22%3A%221%22%7D%7D; Path=/; Expires=Thu, 27 Jun 2030 10:00:00 GMT; HttpOnly; Secure; SameSite=Strict",
            );
        });

        test("Should generate a cookie from the store data (with custom options)", function () {
            const store = new LocalAuthStore();
            store.save(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE",
                {
                    id: "1",
                    email: "test@example.com",
                    collectionId: "test_collection_id",
                    verified: true,
                    name: "test",
                } as any,
            );

            const result = store.exportToCookie(
                {
                    path: "/a/b/c",
                    expires: new Date("2022-01-01"),
                    httpOnly: true,
                },
                "custom_key",
            );

            assert.equal(
                result,
                "custom_key=%7B%22token%22%3A%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE%22%2C%22model%22%3A%7B%22id%22%3A%221%22%2C%22email%22%3A%22test%40example.com%22%2C%22collectionId%22%3A%22test_collection_id%22%2C%22verified%22%3Atrue%2C%22name%22%3A%22test%22%7D%7D; Path=/a/b/c; Expires=Sat, 01 Jan 2022 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict",
            );
        });

        test("Should strip the model data in the generated cookie if exceed 4096", function () {
            const store = new LocalAuthStore();
            store.save(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE",
                {
                    id: "1",
                    email: "test@example.com",
                    collectionId: "test_collection_id",
                    verified: true,
                    name: "a".repeat(4000),
                } as any,
            );

            const result = store.exportToCookie({
                path: "/a/b/c",
                expires: new Date("2022-01-01"),
                httpOnly: true,
            });

            assert.equal(
                result,
                "pb_auth=%7B%22token%22%3A%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoxMjMsImV4cCI6MTkwODc4NDgwMH0.vVbRVx-Bs7pusxfU8TTTOEtNcUEYSzmJUboC68PB5iE%22%2C%22model%22%3A%7B%22id%22%3A%221%22%2C%22email%22%3A%22test%40example.com%22%2C%22collectionId%22%3A%22test_collection_id%22%2C%22verified%22%3Atrue%7D%7D; Path=/a/b/c; Expires=Sat, 01 Jan 2022 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict",
            );
        });
    });

    describe("onChange()", function () {
        test("Should trigger the onChange() callbacks", function () {
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
            store.save("test");
            assert.equal(callback1Calls, 2); // +1 because of the immediate invocation
            assert.equal(callback2Calls, 1);

            // trigger clear() change
            store.clear();
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 2);

            // remove the second listener (aka. callback1Calls shouldn't be called anymore)
            removal1();

            store.save("test");
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 3);

            // remove the second listener (aka. callback2Calls shouldn't be called anymore)
            removal2();

            store.save("test");
            assert.equal(callback1Calls, 3);
            assert.equal(callback2Calls, 3);
        });
    });
});
