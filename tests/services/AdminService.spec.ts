import {
    describe,
    assert,
    test,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
} from "vitest";
import { crudServiceTestsSuite } from "../suites";
import { FetchMock, dummyJWT } from "../mocks";
import Client from "@/Client";
import { AdminService } from "@/services/AdminService";
import { AdminModel } from "@/services/utils/dtos";

describe("AdminService", function () {
    let client!: Client;
    let service!: AdminService;

    function initService() {
        client = new Client("test_base_url");
        service = new AdminService(client);
    }

    initService();

    // base tests
    crudServiceTestsSuite(service, "/api/admins");

    const fetchMock = new FetchMock();

    beforeEach(function () {
        initService();
        service.client.authStore.clear(); // reset
    });

    beforeAll(function () {
        fetchMock.init();
    });

    afterAll(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();
    });

    function authResponseCheck(
        result: { [key: string]: any },
        expectedToken: string,
        expectedAdmin: AdminModel,
    ) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.deepEqual(result.admin, expectedAdmin);
        assert.equal(service.client.authStore.token, expectedToken);
        assert.deepEqual(service.client.authStore.model, expectedAdmin);
    }

    // more tests:
    // ---------------------------------------------------------------

    describe("AuthStore sync", function () {
        test("Should update the AuthStore admin model on matching update id", async function () {
            fetchMock.on({
                method: "PATCH",
                url: service.client.buildUrl("/api/admins/test123"),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", {
                id: "test123",
                email: "old@example.com",
            } as any);

            await service.update("test123", { email: "new@example.com" });

            assert.equal(service.client.authStore.model?.email, "new@example.com");
        });

        test("Should not update the AuthStore admin model on mismatched update id", async function () {
            fetchMock.on({
                method: "PATCH",
                url: service.client.buildUrl("/api/admins/test123"),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", {
                id: "test456",
                email: "old@example.com",
            } as any);

            await service.update("test123", { email: "new@example.com" });

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        test("Should delete the AuthStore admin model on matching delete id", async function () {
            fetchMock.on({
                method: "DELETE",
                url: service.client.buildUrl("/api/admins/test123"),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", { id: "test123" } as any);

            await service.delete("test123");

            assert.isNull(service.client.authStore.model);
        });

        test("Should not delete the AuthStore admin model on mismatched delete id", async function () {
            fetchMock.on({
                method: "DELETE",
                url: service.client.buildUrl("/api/admins/test123"),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", { id: "test456" } as any);

            await service.delete("test123");

            assert.isNotNull(service.client.authStore.model);
        });
    });

    describe("authWithPassword()", function () {
        test("(legacy) Should auth an admin by its email and password", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl("/api/admins/auth-with-password") + "?q1=456",
                body: {
                    identity: "test@example.com",
                    password: "123456",
                    b1: 123,
                },
                replyCode: 200,
                replyBody: {
                    token: "token_authorize",
                    admin: { id: "id_authorize" },
                },
            });

            const result = await service.authWithPassword(
                "test@example.com",
                "123456",
                { b1: 123 },
                { q1: 456 },
            );

            authResponseCheck(
                result,
                "token_authorize",
                service.decode({ id: "id_authorize" }),
            );
        });

        test("Should auth an admin by its email and password", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl("/api/admins/auth-with-password") + "?q1=456",
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 200,
                replyBody: {
                    token: "token_authorize",
                    admin: { id: "id_authorize" },
                },
            });

            const result = await service.authWithPassword("test@example.com", "123456", {
                q1: 456,
                headers: { "x-test": "123" },
            });

            authResponseCheck(
                result,
                "token_authorize",
                service.decode({ id: "id_authorize" }),
            );
        });
    });

    describe("authRefresh()", function () {
        test("(legacy) Should refresh an authorized admin instance", async function () {
            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-refresh") + "?q1=456",
                body: { b1: 123 },
                replyCode: 200,
                replyBody: {
                    token: "token_refresh",
                    admin: { id: "id_refresh" },
                },
            });

            const result = await service.authRefresh({ b1: 123 }, { q1: 456 });

            authResponseCheck(
                result,
                "token_refresh",
                service.decode({ id: "id_refresh" }),
            );
        });

        test("Should refresh an authorized admin instance", async function () {
            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-refresh") + "?q1=456",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 200,
                replyBody: {
                    token: "token_refresh",
                    admin: { id: "id_refresh" },
                },
            });

            const result = await service.authRefresh({
                q1: 456,
                headers: { "x-test": "123" },
            });

            authResponseCheck(
                result,
                "token_refresh",
                service.decode({ id: "id_refresh" }),
            );
        });
    });

    describe("requestPasswordReset()", function () {
        test("(legacy) Should send a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl("/api/admins/request-password-reset") +
                    "?q1=456",
                body: {
                    email: "test@example.com",
                    b1: 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestPasswordReset(
                "test@example.com",
                { b1: 123 },
                { q1: 456 },
            );

            assert.isTrue(result);
        });

        test("Should send a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl("/api/admins/request-password-reset") +
                    "?q1=456",
                body: {
                    email: "test@example.com",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestPasswordReset("test@example.com", {
                q1: 456,
                headers: { "x-test": "123" },
            });

            assert.isTrue(result);
        });
    });

    describe("confirmPasswordReset()", function () {
        test("(legacy) Should confirm a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl("/api/admins/confirm-password-reset") +
                    "?q1=456",
                body: {
                    token: "test",
                    password: "123",
                    passwordConfirm: "456",
                    b1: 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmPasswordReset(
                "test",
                "123",
                "456",
                { b1: 123 },
                { q1: 456 },
            );

            assert.isTrue(result);
        });

        test("Should confirm a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl("/api/admins/confirm-password-reset") +
                    "?q1=456",
                body: {
                    token: "test",
                    password: "123",
                    passwordConfirm: "456",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmPasswordReset("test", "123", "456", {
                q1: 456,
                headers: { "x-test": "123" },
            });

            assert.isTrue(result);
        });
    });

    describe("auto refresh", function () {
        test("no threshold - should do nothing in addition if the token has expired", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() - 1 * 60000).getTime() / 1000) << 0,
            });

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-with-password?a=1"),
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                replyCode: 200,
                replyBody: {
                    token: token,
                    admin: { id: "test_id" },
                },
            });

            fetchMock.on({
                method: "GET",
                url: service.client.buildUrl("/custom"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], token); // same old token
                    return true;
                },
                replyCode: 204,
                replyBody: null,
            });

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 0,
                    query: { a: 1 },
                },
            );

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));

            await service.client.send("/custom", {});
        });

        test("new auth - should reset the auto refresh handling", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() - 1 * 60000).getTime() / 1000) << 0,
            });

            const invokes: Array<String> = [];

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-with-password?a=1"),
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                additionalMatcher: () => {
                    invokes.push("auth-with-password");
                    return true;
                },
                replyCode: 200,
                replyBody: {
                    token: token,
                    admin: { id: "test_id" },
                },
            });

            fetchMock.on({
                method: "GET",
                url: service.client.buildUrl("/custom"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], token); // same old token
                    invokes.push("custom");
                    return true;
                },
                replyCode: 204,
                replyBody: null,
            });

            const authResult1 = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );
            authResponseCheck(authResult1, token, service.decode({ id: "test_id" }));

            // manually reauthenticate without the auto refresh threshold
            const authResult2 = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    query: { a: 1 },
                },
            );
            authResponseCheck(authResult2, token, service.decode({ id: "test_id" }));

            await service.client.send("/custom", {});
            await service.client.send("/custom", {});

            assert.deepEqual(invokes, [
                "auth-with-password",
                "auth-with-password",
                "custom",
                "custom",
            ]);
        });

        test("should do nothing if the token is still valid", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() + 31 * 60000).getTime() / 1000) << 0,
            });

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-with-password?a=1"),
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                replyCode: 200,
                replyBody: {
                    token: token,
                    admin: { id: "test_id" },
                },
            });

            fetchMock.on({
                method: "GET",
                url: service.client.buildUrl("/custom"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], token);
                    return true;
                },
                replyCode: 204,
                replyBody: null,
            });

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );

            await service.client.send("/custom", {});

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));
        });

        test("should call authRefresh if the token is going to expire", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() + 29 * 60000).getTime() / 1000) << 0,
            });

            const newToken = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() + 31 * 60000).getTime() / 1000) << 0,
            });

            const invokes: Array<String> = [];

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-with-password?a=1"),
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                additionalMatcher: () => {
                    invokes.push("auth-with-password");
                    return true;
                },
                replyCode: 200,
                replyBody: {
                    token: token,
                    admin: { id: "test_id" },
                },
            });

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-refresh?autoRefresh=true"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], token);
                    invokes.push("auto-auth-refresh");
                    return true;
                },
                replyCode: 200,
                replyBody: {
                    token: newToken,
                    admin: { id: "test_id" },
                },
            });

            fetchMock.on({
                method: "GET",
                url: service.client.buildUrl("/custom"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], newToken);
                    invokes.push("custom");
                    return true;
                },
                replyCode: 204,
                replyBody: null,
            });

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));

            await service.client.send("/custom", {});
            await service.client.send("/custom", {});

            assert.equal(service.client.authStore.token, newToken);
            assert.deepEqual(invokes, [
                "auth-with-password",
                "auto-auth-refresh",
                "custom",
                "custom",
            ]);
        });

        test("should reauthenticate if the token is going to expire and the auto authRefresh fails", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() + 29 * 60000).getTime() / 1000) << 0,
            });

            const newToken = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() + 31 * 60000).getTime() / 1000) << 0,
            });

            const invokes: Array<String> = [];

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-with-password?a=1"),
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                additionalMatcher: () => {
                    invokes.push("auth-with-password");
                    return true;
                },
                replyCode: 200,
                replyBody: {
                    token: token,
                    admin: { id: "test_id" },
                },
            });

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-refresh?autoRefresh=true"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], token);
                    invokes.push("auto-auth-refresh");
                    return true;
                },
                replyCode: 400,
                replyBody: {},
            });

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl(
                    "/api/admins/auth-with-password?a=1&autoRefresh=true",
                ),
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                additionalMatcher: () => {
                    invokes.push("auto-auth-with-password");
                    return true;
                },
                replyCode: 200,
                replyBody: {
                    token: newToken,
                    admin: { id: "test_id" },
                },
            });

            fetchMock.on({
                method: "GET",
                url: service.client.buildUrl("/custom"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], newToken);
                    invokes.push("custom");
                    return true;
                },
                replyCode: 204,
                replyBody: null,
            });

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));

            await service.client.send("/custom", {});
            await service.client.send("/custom", {});

            assert.equal(service.client.authStore.token, newToken);
            assert.deepEqual(invokes, [
                "auth-with-password",
                "auto-auth-refresh",
                "auto-auth-with-password",
                "custom",
                "custom",
            ]);
        });

        test("should reauthenticate if the token is expired", async function () {
            const token = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() - 1).getTime() / 1000) << 0,
            });

            const newToken = dummyJWT({
                id: "test_id",
                type: "admin",
                exp: (new Date(Date.now() + 31 * 60000).getTime() / 1000) << 0,
            });

            const invokes: Array<String> = [];

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-with-password?a=1"),
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                additionalMatcher: () => {
                    invokes.push("auth-with-password");
                    return true;
                },
                replyCode: 200,
                replyBody: {
                    token: token,
                    admin: { id: "test_id" },
                },
            });

            // shouldn't be invoked!
            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/admins/auth-refresh?autoRefresh=true"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], token);
                    invokes.push("auto-auth-refresh");
                    return true;
                },
                replyCode: 400,
                replyBody: {},
            });

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl(
                    "/api/admins/auth-with-password?a=1&autoRefresh=true",
                ),
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                additionalMatcher: () => {
                    invokes.push("auto-auth-with-password");
                    return true;
                },
                replyCode: 200,
                replyBody: {
                    token: newToken,
                    admin: { id: "test_id" },
                },
            });

            fetchMock.on({
                method: "GET",
                url: service.client.buildUrl("/custom"),
                additionalMatcher: (_, config) => {
                    assert.equal(config?.headers?.["Authorization"], newToken);
                    invokes.push("custom");
                    return true;
                },
                replyCode: 204,
                replyBody: null,
            });

            const authResult = await service.authWithPassword(
                "test@example.com",
                "123456",
                {
                    autoRefreshThreshold: 30 * 60,
                    query: { a: 1 },
                },
            );

            authResponseCheck(authResult, token, service.decode({ id: "test_id" }));

            await service.client.send("/custom", {});
            await service.client.send("/custom", {});

            assert.equal(service.client.authStore.token, newToken);
            assert.deepEqual(invokes, [
                "auth-with-password",
                "auto-auth-with-password",
                "custom",
                "custom",
            ]);
        });
    });
});
