import { describe, assert, expect, test, beforeAll, afterAll, afterEach } from "vitest";
import Client from "@/Client";
import { LocalAuthStore } from "@/stores/LocalAuthStore";
import { RecordService } from "@/services/RecordService";
import { FetchMock } from "./mocks";

describe("Client", function () {
    const fetchMock = new FetchMock();

    beforeAll(function () {
        fetchMock.init();
    });

    afterAll(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();

        // restore all window mocks
        global.window = undefined as any;
    });

    describe("constructor()", function () {
        test("Should create a properly configured http client instance", function () {
            const client = new Client("test_base_url", null, "test_language");

            assert.equal(client.baseURL, "test_base_url");
            assert.instanceOf(client.authStore, LocalAuthStore);
            assert.equal(client.lang, "test_language");
        });

        test("Should load all api resources", async function () {
            const client = new Client("test_base_url");

            const baseServices = [
                "admins",
                "collections",
                "logs",
                "settings",
                "realtime",
            ];

            for (const service of baseServices) {
                assert.isNotEmpty((client as any)[service]);
            }
        });
    });

    describe("collection()", function () {
        test("Should initialize the related collection record service", function () {
            const client = new Client("test_base_url");

            const service1 = client.collection("test1");
            const service2 = client.collection("test2");
            const service3 = client.collection("test1"); // same as service1

            assert.instanceOf(service1, RecordService);
            assert.instanceOf(service2, RecordService);
            assert.instanceOf(service3, RecordService);
            assert.equal(service1, service3);
            assert.notEqual(service1, service2);
            assert.equal(service1.baseCrudPath, "/api/collections/test1/records");
            assert.equal(service2.baseCrudPath, "/api/collections/test2/records");
            assert.equal(service3.baseCrudPath, "/api/collections/test1/records");
        });
    });

    describe("buildURL()", function () {
        test("Should properly concatenate path to baseURL", function () {
            // with trailing slash
            const client1 = new Client("test_base_url/");
            assert.equal(client1.buildURL("test123"), "test_base_url/test123");
            assert.equal(client1.buildURL("/test123"), "test_base_url/test123");

            // no trailing slash
            const client2 = new Client("test_base_url");
            assert.equal(client2.buildURL("test123"), "test_base_url/test123");
            assert.equal(client2.buildURL("/test123"), "test_base_url/test123");
        });

        test("Should construct an absolute url if window.location is defined", function () {
            global.window = {
                location: {
                    origin: "https://example.com/",
                    pathname: "/sub",
                },
            } as any;

            // with empty base url
            {
                const client = new Client("");
                assert.equal(
                    client.buildURL("test123"),
                    "https://example.com/sub/test123",
                );
                assert.equal(
                    client.buildURL("/test123"),
                    "https://example.com/sub/test123",
                );
            }

            // relative base url with starting slash
            {
                const client = new Client("/a/b/");
                assert.equal(
                    client.buildURL("test123"),
                    "https://example.com/a/b/test123",
                );
                assert.equal(
                    client.buildURL("/test123"),
                    "https://example.com/a/b/test123",
                );
            }

            // relative base url with parent path traversal
            {
                const client = new Client("../a/b/");
                assert.equal(
                    client.buildURL("test123"),
                    "https://example.com/sub/../a/b/test123",
                );
                assert.equal(
                    client.buildURL("/test123"),
                    "https://example.com/sub/../a/b/test123",
                );
            }

            // relative base url without starting slash
            {
                const client = new Client("a/b/");
                assert.equal(
                    client.buildURL("test123"),
                    "https://example.com/sub/a/b/test123",
                );
                assert.equal(
                    client.buildURL("/test123"),
                    "https://example.com/sub/a/b/test123",
                );
            }

            // with explicit HTTP absolute base url
            {
                const client = new Client("http://example2.com");
                assert.equal(client.buildURL("test123"), "http://example2.com/test123");
                assert.equal(client.buildURL("/test123"), "http://example2.com/test123");
            }

            // with explicit HTTPS absolute base url and trailing slash
            {
                const client = new Client("https://example2.com/");
                assert.equal(client.buildURL("test123"), "https://example2.com/test123");
                assert.equal(client.buildURL("/test123"), "https://example2.com/test123");
            }
        });
    });

    describe("getFileUrl()", function () {
        const client = new Client("test_base_url");

        test("Should return a formatted url", async function () {
            const record = { id: "456", collectionId: "123", collectionName: "789" };
            const result = client.getFileUrl(record, "demo.png");

            assert.deepEqual(result, "test_base_url/api/files/123/456/demo.png");
        });

        test("Should return a formatted url + query params", async function () {
            const record = { id: "456", collectionId: "123", collectionName: "789" };
            const result = client.getFileUrl(record, "demo=", { test: "abc" });

            assert.deepEqual(result, "test_base_url/api/files/123/456/demo%3D?test=abc");
        });
    });

    describe("filter()", function () {
        test("filter expression without params", function () {
            const client = new Client("test_base_url", null, "test_language_A");
            const raw = "a > {:test1} && b = {:test2} || c = {:test2}";

            assert.equal(client.filter(raw), raw);
        });

        test("filter expression with params that does not match the placeholders", function () {
            const client = new Client("test_base_url", null, "test_language_A");
            const result = client.filter("a > {:test1} && b = {:test2} || c = {:test2}", {
                test2: "hello",
            });

            assert.equal(result, "a > {:test1} && b = 'hello' || c = 'hello'");
        });

        test("filter expression with all placeholder types", function () {
            const client = new Client("test_base_url", null, "test_language_A");

            const params = {
                test1: "a'b'c'",
                test2: null,
                test3: true,
                test4: false,
                test5: 123,
                test6: -123.45,
                test7: 123.45,
                test8: new Date("2023-10-18 10:11:12"),
                test9: [1, 2, 3, "test'123"],
                test10: { a: "test'123" },
            };

            let raw = "";
            for (let key in params) {
                if (raw) {
                    raw += " || ";
                }
                raw += `${key}={:${key}}`;
            }

            assert.equal(
                client.filter(raw, params),
                `test1='a\\'b\\'c\\'' || test2=null || test3=true || test4=false || test5=123 || test6=-123.45 || test7=123.45 || test8='2023-10-18 07:11:12.000Z' || test9='[1,2,3,"test\\'123"]' || test10='{"a":"test\\'123"}'`,
            );
        });
    });

    describe("send()", function () {
        test("Should build and send http request", async function () {
            const client = new Client("test_base_url", null, "test_language_A");

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123?queryA=456",
                replyCode: 200,
                replyBody: "successGet",
            });

            fetchMock.on({
                method: "POST",
                url: "test_base_url/123?queryA=456",
                replyCode: 200,
                replyBody: "successPost",
            });

            fetchMock.on({
                method: "PUT",
                url: "test_base_url/123?queryA=456",
                replyCode: 200,
                replyBody: "successPut",
            });

            fetchMock.on({
                method: "PATCH",
                url: "test_base_url/123?queryA=456",
                replyCode: 200,
                replyBody: "successPatch",
            });

            fetchMock.on({
                method: "DELETE",
                url: "test_base_url/123?queryA=456",
                replyCode: 200,
                replyBody: "successDelete",
            });

            fetchMock.on({
                method: "GET",
                url: "test_base_url/multipart?queryA=456",
                additionalMatcher: (_, config: any): boolean => {
                    // multipart/form-data requests shouldn't have explicitly set Content-Type
                    return !config?.headers?.["Content-Type"];
                },
                replyCode: 200,
                replyBody: "successMultipart",
            });

            fetchMock.on({
                method: "GET",
                url: "test_base_url/multipartAuto?queryA=456",
                additionalMatcher: (_, config: any): boolean => {
                    if (
                        // multipart/form-data requests shouldn't have explicitly set Content-Type
                        config?.headers?.["Content-Type"] ||
                        // the body should have been converted to FormData
                        !(config.body instanceof FormData)
                    ) {
                        return false;
                    }

                    // check FormData transformation
                    assert.deepEqual(config.body.getAll("title"), ["test"]);
                    assert.deepEqual(config.body.getAll("@jsonPayload"), [
                        '{"roles":["a","b"]}',
                        '{"json":null}',
                    ]);
                    assert.equal(config.body.getAll("files").length, 2);
                    assert.equal(config.body.getAll("files")[0].size, 2);
                    assert.equal(config.body.getAll("files")[1].size, 1);
                    assert.equal(config.body.has("skip"), false);

                    return true;
                },
                replyCode: 200,
                replyBody: "successMultipartAuto",
            });

            const testQueryParams = { queryA: 456, queryB: null, queryC: undefined };

            const testCases = [
                [
                    client.send(
                        "/123",
                        Object.assign({ method: "GET" }, testQueryParams),
                    ),
                    "successGet",
                ],
                [
                    client.send(
                        "/123",
                        Object.assign({ method: "POST" }, testQueryParams),
                    ),
                    "successPost",
                ],
                [
                    client.send(
                        "/123",
                        Object.assign({ method: "PUT" }, testQueryParams),
                    ),
                    "successPut",
                ],
                [
                    client.send(
                        "/123",
                        Object.assign({ method: "PATCH" }, testQueryParams),
                    ),
                    "successPatch",
                ],
                [
                    client.send(
                        "/123",
                        Object.assign({ method: "DELETE" }, testQueryParams),
                    ),
                    "successDelete",
                ],
                [
                    client.send(
                        "/multipart",
                        Object.assign(
                            { method: "GET", body: new FormData() },
                            testQueryParams,
                        ),
                    ),
                    "successMultipart",
                ],
                [
                    client.send(
                        "/multipartAuto",
                        Object.assign(
                            {
                                method: "GET",
                                body: {
                                    title: "test",
                                    roles: ["a", "b"],
                                    json: null,
                                    files: [new Blob(["11"]), new Blob(["2"])],
                                    skip: undefined,
                                },
                            },
                            testQueryParams,
                        ),
                    ),
                    "successMultipartAuto",
                ],
            ];
            for (let testCase of testCases) {
                const responseData = await testCase[0];
                assert.equal(responseData, testCase[1]);
            }
        });

        test("Should auto add authorization header if missing", async function () {
            const client = new Client("test_base_url", null, "test_language_A");

            // none
            fetchMock.on({
                method: "GET",
                url: "test_base_url/none",
                additionalMatcher: (_, config: any): boolean => {
                    return !config?.headers?.Authorization;
                },
                replyCode: 200,
            });
            await client.send("/none", { method: "GET" });

            // admin token
            fetchMock.on({
                method: "GET",
                url: "test_base_url/admin",
                additionalMatcher: (_, config: any): boolean => {
                    return config?.headers?.Authorization === "token123";
                },
                replyCode: 200,
            });
            const admin = { id: "test-admin" } as any;
            client.authStore.save("token123", admin);
            await client.send("/admin", { method: "GET" });

            // user token
            fetchMock.on({
                method: "GET",
                url: "test_base_url/user",
                additionalMatcher: (_, config: any): boolean => {
                    return config?.headers?.Authorization === "token123";
                },
                replyCode: 200,
            });
            const user = { id: "test-user", collectionId: "test-user" } as any;
            client.authStore.save("token123", user);
            await client.send("/user", { method: "GET" });
        });

        test("Should use a custom fetch function", async function () {
            const client = new Client("test_base_url");

            let called = 0;

            await client.send("/old?q1=123", {
                q1: 123,
                method: "GET",
                fetch: async (): Promise<Response> => {
                    called++;
                    return {} as any;
                },
            });

            assert.equal(called, 1);
        });

        test("Should trigger the before hook", async function () {
            const client = new Client("test_base_url");
            const newUrl = "test_base_url/new";

            client.beforeSend = function (_, options) {
                options.headers = Object.assign({}, options.headers, {
                    "X-Custom-Header": "456",
                });

                return { url: newUrl, options };
            };

            fetchMock.on({
                method: "GET",
                url: newUrl,
                replyCode: 200,
                replyBody: "123",
                additionalMatcher: function (url, config) {
                    return (
                        url == newUrl &&
                        (config?.headers as any)?.["X-Custom-Header"] == "456"
                    );
                },
            });

            const response = await client.send("/old", { method: "GET" });
            assert.equal(response, "123");
        });

        test("Should trigger the async before hook", async function () {
            const client = new Client("test_base_url");
            const newUrl = "test_base_url/new";

            client.beforeSend = function (_, options) {
                options.headers = Object.assign({}, options.headers, {
                    "X-Custom-Header": "456",
                });

                return new Promise((resolve) => {
                    setTimeout(() => resolve({ url: newUrl, options }), 10);
                });
            };

            fetchMock.on({
                method: "GET",
                url: newUrl,
                replyCode: 200,
                replyBody: "123",
                additionalMatcher: function (url, config) {
                    return (
                        url == newUrl &&
                        (config?.headers as any)?.["X-Custom-Header"] == "456"
                    );
                },
            });

            const response = await client.send("/old", { method: "GET" });
            assert.equal(response, "123");
        });

        test("Should trigger the after hook", async function () {
            const client = new Client("test_base_url");

            client.afterSend = function (response, _) {
                if (response.url === "test_base_url/failure") {
                    throw new Error("test_error");
                }

                return "789";
            };

            fetchMock.on({
                method: "GET",
                url: "test_base_url/success",
                replyCode: 200,
                replyBody: "123",
            });

            fetchMock.on({
                method: "GET",
                url: "test_base_url/failure",
                replyCode: 200,
                replyBody: "456",
            });

            // will be replaced with /new
            const responseSuccess = await client.send("/success", { method: "GET" });
            assert.equal(responseSuccess, "789");

            const responseFailure = client.send("/failure", { method: "GET" });
            await expect(responseFailure).rejects.toThrow();
        });

        test("Should trigger the async after hook", async function () {
            const client = new Client("test_base_url");

            client.afterSend = async function () {
                await new Promise((_, reject) => {
                    // use reject to test whether the timeout is awaited
                    setTimeout(() => reject({ data: { message: "after_err" } }), 10);
                });

                return "123";
            };

            fetchMock.on({
                method: "GET",
                url: "test_base_url/async_after",
                replyCode: 200,
                replyBody: "123",
            });

            const response = client.send("/async_after", { method: "GET" });
            await expect(response).rejects.toThrow("after_err");
        });
    });

    describe("cancelRequest()", function () {
        test("Should cancel pending request", async function () {
            const client = new Client("test_base_url");

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123",
                delay: 5,
                replyCode: 200,
            });

            const response = client.send("/123", {
                method: "GET",
                params: { $cancelKey: "testKey" },
            });

            client.cancelRequest("testKey");

            await expect(response).rejects.toThrow();
        });
    });

    describe("cancelAllRequests()", function () {
        test("Should cancel all pending requests", async function () {
            const client = new Client("test_base_url");

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123",
                delay: 5,
                replyCode: 200,
            });

            fetchMock.on({
                method: "GET",
                url: "test_base_url/456",
                delay: 5,
                replyCode: 200,
            });

            const requestA = client.send("/123", { method: "GET" });
            const requestB = client.send("/456", { method: "GET" });

            client.cancelAllRequests();

            await expect(requestA).rejects.toThrow();
            await expect(requestB).rejects.toThrow();
        });
    });

    describe("auto cancellation", function () {
        test("Should disable auto cancellation", async function () {
            const client = new Client("test_base_url");

            client.autoCancellation(false);

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123",
                delay: 5,
                replyCode: 200,
            });

            const requestA = client.send("/123", { method: "GET" });
            const requestB = client.send("/123", { method: "GET" });

            await expect(requestA).resolves.toBeDefined();
            await expect(requestB).resolves.toBeDefined();
        });

        test("Should auto cancel duplicated requests with default key", async function () {
            const client = new Client("test_base_url");

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123",
                delay: 5,
                replyCode: 200,
            });

            const requestA = client.send("/123", { method: "GET" });
            const requestB = client.send("/123", { method: "GET" });
            const requestC = client.send("/123", { method: "GET" });

            await expect(requestA).rejects.toThrow();
            await expect(requestB).rejects.toThrow();
            await expect(requestC).resolves.toBeDefined();
        });

        test("(legacy) Should auto cancel duplicated requests with custom key", async function () {
            const client = new Client("test_base_url");

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123",
                delay: 5,
                replyCode: 200,
            });

            const requestA = client.send("/123", {
                method: "GET",
                params: { $cancelKey: "customKey" },
            });
            const requestB = client.send("/123", { method: "GET" });

            await expect(requestA).resolves.toBeDefined();
            await expect(requestB).resolves.toBeDefined();
        });

        test("Should auto cancel duplicated requests with custom key", async function () {
            const client = new Client("test_base_url");

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123",
                delay: 5,
                replyCode: 200,
            });

            const requestA = client.send("/123", {
                method: "GET",
                requestKey: "customKey",
            });
            const requestB = client.send("/123", {
                method: "GET",
                requestKey: "customKey",
            });
            const requestC = client.send("/123", { method: "GET" });

            await expect(requestA).rejects.toThrow();
            await expect(requestB).resolves.toBeDefined();
            await expect(requestC).resolves.toBeDefined();
        });

        test("(legacy) Should skip auto cancellation", async function () {
            const client = new Client("test_base_url");

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123",
                delay: 5,
                replyCode: 200,
            });

            const requestA = client.send("/123", {
                method: "GET",
                params: { $autoCancel: false },
            });
            const requestB = client.send("/123", {
                method: "GET",
                params: { $autoCancel: false },
            });
            const requestC = client.send("/123", {
                method: "GET",
                params: { $autoCancel: false },
            });

            await expect(requestA).resolves.toBeDefined();
            await expect(requestB).resolves.toBeDefined();
            await expect(requestC).resolves.toBeDefined();
        });

        test("Should skip auto cancellation", async function () {
            const client = new Client("test_base_url");

            fetchMock.on({
                method: "GET",
                url: "test_base_url/123",
                delay: 5,
                replyCode: 200,
            });

            const requestA = client.send("/123", { method: "GET", requestKey: null });
            const requestB = client.send("/123", { method: "GET", requestKey: null });
            const requestC = client.send("/123", { method: "GET", requestKey: null });

            await expect(requestA).resolves.toBeDefined();
            await expect(requestB).resolves.toBeDefined();
            await expect(requestC).resolves.toBeDefined();
        });
    });
});
