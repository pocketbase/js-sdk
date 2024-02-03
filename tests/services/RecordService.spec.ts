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
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { RecordService } from "@/services/RecordService";
import { RecordModel } from "@/services/utils/dtos";

describe("RecordService", function () {
    const client = new Client("test_base_url/");
    const service = new RecordService(client, "sub=");

    crudServiceTestsSuite(service, "/api/collections/sub%3D/records");

    const fetchMock = new FetchMock();

    beforeEach(function () {
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

    describe("AuthStore sync", function () {
        test("Should update the AuthStore record model on matching update id and collection", async function () {
            fetchMock.on({
                method: "PATCH",
                url: service.client.buildUrl("/api/collections/sub%3D/records/test123"),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", {
                id: "test123",
                collectionName: "sub=",
            } as any);

            await service.update("test123", {});

            assert.equal(service.client.authStore.model?.email, "new@example.com");
        });

        test("Should not update the AuthStore record model on matching id but mismatched collection", async function () {
            fetchMock.on({
                method: "PATCH",
                url: service.client.buildUrl("/api/collections/sub%3D/records/test123"),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", {
                id: "test123",
                email: "old@example.com",
                collectionName: "diff",
            } as any);

            await service.update("test123", {});

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        test("Should not update the AuthStore record model on mismatched update id", async function () {
            fetchMock.on({
                method: "PATCH",
                url: service.client.buildUrl("/api/collections/sub%3D/records/test123"),
                replyCode: 200,
                replyBody: {
                    id: "test123",
                    email: "new@example.com",
                },
            });

            service.client.authStore.save("test_token", {
                id: "test456",
                email: "old@example.com",
                collectionName: "sub=",
            } as any);

            await service.update("test123", {});

            assert.equal(service.client.authStore.model?.email, "old@example.com");
        });

        test("Should delete the AuthStore record model on matching delete id and collection", async function () {
            fetchMock.on({
                method: "DELETE",
                url: service.client.buildUrl("/api/collections/sub%3D/records/test123"),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", {
                id: "test123",
                collectionName: "sub=",
            } as any);

            await service.delete("test123");

            assert.isNull(service.client.authStore.model);
        });

        test("Should not delete the AuthStore record model on matching delete id but mismatched collection", async function () {
            fetchMock.on({
                method: "DELETE",
                url: service.client.buildUrl("/api/collections/sub%3D/records/test123"),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", {
                id: "test123",
                collectionName: "diff",
            } as any);

            await service.delete("test123");

            assert.isNotNull(service.client.authStore.model);
        });

        test("Should not delete the AuthStore record model on mismatched delete id", async function () {
            fetchMock.on({
                method: "DELETE",
                url: service.client.buildUrl("/api/collections/sub%3D/records/test123"),
                replyCode: 204,
            });

            service.client.authStore.save("test_token", {
                id: "test456",
                collectionName: "sub=",
            } as any);

            await service.delete("test123");

            assert.isNotNull(service.client.authStore.model);
        });

        test("Should update the AuthStore record model verified state on matching token data", async function () {
            const token =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInR5cGUiOiJhdXRoUmVjb3JkIiwiY29sbGVjdGlvbklkIjoiNDU2In0.c9ZkXkC8rSqkKlpyx3kXt9ID3qYsIoy1Vz3a2m3ly0c";

            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-verification",
                body: { token: token },
                replyCode: 204,
                replyBody: true,
            });

            service.client.authStore.save("auth_token", {
                id: "123",
                collectionId: "456",
                verified: false,
            } as any);

            const result = await service.confirmVerification(token);

            assert.isTrue(result);
            assert.isTrue(service.client.authStore.model?.verified);
        });

        test("Should not update the AuthStore record model verified state on mismatched token data", async function () {
            const token =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInR5cGUiOiJhdXRoUmVjb3JkIiwiY29sbGVjdGlvbklkIjoiNDU2In0.c9ZkXkC8rSqkKlpyx3kXt9ID3qYsIoy1Vz3a2m3ly0c";

            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-verification",
                body: { token: token },
                replyCode: 204,
                replyBody: true,
            });

            service.client.authStore.save("auth_token", {
                id: "123",
                collectionId: "789",
                verified: false,
            } as any);

            const result = await service.confirmVerification(token);

            assert.isTrue(result);
            assert.isFalse(service.client.authStore.model?.verified);
        });

        test("Should delete the AuthStore record model matching the token data", async function () {
            const token =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInR5cGUiOiJhdXRoUmVjb3JkIiwiY29sbGVjdGlvbklkIjoiNDU2In0.c9ZkXkC8rSqkKlpyx3kXt9ID3qYsIoy1Vz3a2m3ly0c";

            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-email-change",
                body: {
                    token: token,
                    password: "1234",
                },
                replyCode: 204,
                replyBody: true,
            });

            service.client.authStore.save("auth_token", {
                id: "123",
                collectionId: "456",
            } as any);

            const result = await service.confirmEmailChange(token, "1234");

            assert.isTrue(result);
            assert.isEmpty(service.client.authStore.token);
        });

        test("Should not delete the AuthStore record model on mismatched token data", async function () {
            const token =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInR5cGUiOiJhdXRoUmVjb3JkIiwiY29sbGVjdGlvbklkIjoiNDU2In0.c9ZkXkC8rSqkKlpyx3kXt9ID3qYsIoy1Vz3a2m3ly0c";

            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-email-change",
                body: {
                    token: token,
                    password: "1234",
                },
                replyCode: 204,
                replyBody: true,
            });

            service.client.authStore.save("auth_token", {
                id: "123",
                collectionId: "789",
            } as any);

            const result = await service.confirmEmailChange(token, "1234");

            assert.isTrue(result);
            assert.isNotEmpty(service.client.authStore.token);
        });
    });

    // ---------------------------------------------------------------
    // auth tests
    // ---------------------------------------------------------------

    function authResponseCheck(
        result: { [key: string]: any },
        expectedToken: string,
        expectedRecord: RecordModel,
    ) {
        assert.isNotEmpty(result);
        assert.equal(result.token, expectedToken);
        assert.deepEqual(result.record, expectedRecord);
        assert.equal(service.client.authStore.token, expectedToken);
        assert.deepEqual(service.client.authStore.model, expectedRecord);
    }

    describe("listAuthMethods()", function () {
        test("Should fetch all available authorization methods", async function () {
            const expectedBody = {
                usernamePassword: true,
                emailPassword: true,
                authProviders: [
                    {
                        name: "test",
                        state: "123",
                        codeVerifier: "v123",
                        codeChallenge: "c123",
                        codeChallengeMethod: "m123",
                        authUrl: "http://example.com",
                    },
                ],
            };

            fetchMock.on({
                method: "GET",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/auth-methods?q1=123",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "456";
                },
                replyCode: 200,
                replyBody: expectedBody,
            });

            const result = await service.listAuthMethods({
                q1: 123,
                headers: { "x-test": "456" },
            });

            assert.deepEqual(result, expectedBody);
        });
    });

    describe("authWithPassword()", function () {
        test("(legacy) Should authenticate a record by its username/email and password", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/auth-with-password?q1=456",
                body: {
                    identity: "test@example.com",
                    password: "123456",
                    b1: 123,
                },
                replyCode: 200,
                replyBody: {
                    token: "token_auth",
                    record: { id: "id_auth" },
                },
            });

            const result = await service.authWithPassword(
                "test@example.com",
                "123456",
                { b1: 123 },
                { q1: 456 },
            );

            authResponseCheck(result, "token_auth", { id: "id_auth" } as any);
        });

        test("Should authenticate a record by its username/email and password", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/auth-with-password?q1=456",
                body: {
                    identity: "test@example.com",
                    password: "123456",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 200,
                replyBody: {
                    token: "token_auth",
                    record: { id: "id_auth" },
                },
            });

            const result = await service.authWithPassword("test@example.com", "123456", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            authResponseCheck(result, "token_auth", { id: "id_auth" } as any);
        });
    });

    describe("authWithOAuth2Code()", function () {
        test("(legacy) Should authenticate with OAuth2 a record by an OAuth2 code", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/auth-with-oauth2?q1=456",
                body: {
                    provider: "test",
                    code: "c123",
                    codeVerifier: "v123",
                    redirectUrl: "http://example.com",
                    createData: { test: 1 },
                    b1: 123,
                },
                replyCode: 200,
                replyBody: {
                    token: "token_auth",
                    record: { id: "id_auth" },
                },
            });

            const result = await service.authWithOAuth2Code(
                "test",
                "c123",
                "v123",
                "http://example.com",
                { test: 1 },
                { b1: 123 },
                { q1: 456 },
            );

            authResponseCheck(result, "token_auth", { id: "id_auth" } as any);
        });

        test("Should authenticate with OAuth2 a record by an OAuth2 code", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/auth-with-oauth2?q1=456",
                body: {
                    provider: "test",
                    code: "c123",
                    codeVerifier: "v123",
                    redirectUrl: "http://example.com",
                    createData: { test: 1 },
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 200,
                replyBody: {
                    token: "token_auth",
                    record: { id: "id_auth" },
                },
            });

            const result = await service.authWithOAuth2Code(
                "test",
                "c123",
                "v123",
                "http://example.com",
                { test: 1 },
                {
                    q1: 456,
                    headers: { "x-test": "789" },
                },
            );

            authResponseCheck(result, "token_auth", { id: "id_auth" } as any);
        });
    });

    describe("authWithOAuth2()", function () {
        test("(legacy) Should authenticate with OAuth2 a record using the legacy function overload", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/auth-with-oauth2?q1=456",
                body: {
                    provider: "test",
                    code: "c123",
                    codeVerifier: "v123",
                    redirectUrl: "http://example.com",
                    createData: { test: 1 },
                    b1: 123,
                },
                replyCode: 200,
                replyBody: {
                    token: "token_auth",
                    record: { id: "id_auth" },
                },
            });

            const result = await service.authWithOAuth2(
                "test",
                "c123",
                "v123",
                "http://example.com",
                { test: 1 },
                { b1: 123 },
                { q1: 456 },
            );

            authResponseCheck(result, "token_auth", { id: "id_auth" } as any);
        });

        // @todo consider adding a test for the realtime version when refactoring the realtime service
    });

    describe("authRefresh()", function () {
        test("(legacy) Should refresh an authorized record instance", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/auth-refresh?q1=456",
                body: { b1: 123 },
                replyCode: 200,
                replyBody: {
                    token: "token_refresh",
                    record: { id: "id_refresh" },
                },
            });

            const result = await service.authRefresh({ b1: 123 }, { q1: 456 });

            authResponseCheck(result, "token_refresh", { id: "id_refresh" } as any);
        });

        test("Should refresh an authorized record instance", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/auth-refresh?q1=456",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 200,
                replyBody: {
                    token: "token_refresh",
                    record: { id: "id_refresh" },
                },
            });

            const result = await service.authRefresh({
                q1: 456,
                headers: { "x-test": "789" },
            });

            authResponseCheck(result, "token_refresh", { id: "id_refresh" } as any);
        });
    });

    describe("requestPasswordReset()", function () {
        test("(legacy) Should send a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/request-password-reset?q1=456",
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
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/request-password-reset?q1=456",
                body: {
                    email: "test@example.com",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestPasswordReset("test@example.com", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("confirmPasswordReset()", function () {
        test("(legacy) Should confirm a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-password-reset?q1=456",
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
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-password-reset?q1=456",
                body: {
                    token: "test",
                    password: "123",
                    passwordConfirm: "456",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmPasswordReset("test", "123", "456", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("requestVerification()", function () {
        test("(legacy) Should send a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/request-verification?q1=456",
                body: {
                    email: "test@example.com",
                    b1: 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestVerification(
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
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/request-verification?q1=456",
                body: {
                    email: "test@example.com",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestVerification("test@example.com", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("confirmVerification()", function () {
        test("(legacy) Should confirm a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-verification?q1=456",
                body: {
                    token: "test",
                    b1: 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmVerification(
                "test",
                { b1: 123 },
                { q1: 456 },
            );

            assert.isTrue(result);
        });

        test("Should confirm a password reset request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-verification?q1=456",
                body: {
                    token: "test",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmVerification("test", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("requestEmailChange()", function () {
        test("(legacy) Should send an email change request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/request-email-change?q1=456",
                body: {
                    newEmail: "test@example.com",
                    b1: 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestEmailChange(
                "test@example.com",
                { b1: 123 },
                { q1: 456 },
            );

            assert.isTrue(result);
        });

        test("Should send an email change request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/request-email-change?q1=456",
                body: {
                    newEmail: "test@example.com",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.requestEmailChange("test@example.com", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("confirmEmailChange()", function () {
        test("(legacy) Should confirm an email change request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-email-change?q1=456",
                body: {
                    token: "test",
                    password: "1234",
                    b1: 123,
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmEmailChange(
                "test",
                "1234",
                { b1: 123 },
                { q1: 456 },
            );

            assert.isTrue(result);
        });

        test("Should confirm an email change request", async function () {
            fetchMock.on({
                method: "POST",
                url:
                    service.client.buildUrl(service.baseCollectionPath) +
                    "/confirm-email-change?q1=456",
                body: {
                    token: "test",
                    password: "1234",
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.confirmEmailChange("test", "1234", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.isTrue(result);
        });
    });

    describe("listExternalAuths()", function () {
        test("Should send a list external auths request", async function () {
            fetchMock.on({
                method: "GET",
                url:
                    service.client.buildUrl(service.baseCrudPath) +
                    "/" +
                    encodeURIComponent("@test_id") +
                    "/external-auths?q1=456",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 200,
                replyBody: [
                    { id: "1", provider: "google" },
                    { id: "2", provider: "github" },
                ],
            });

            const result = await service.listExternalAuths("@test_id", {
                q1: 456,
                headers: { "x-test": "789" },
            });

            assert.equal(result.length, 2);
            assert.equal(result[0].provider, "google");
            assert.equal(result[1].provider, "github");
        });
    });

    describe("unlinkExternalAuth()", function () {
        test("Should send a unlinkExternalAuth request", async function () {
            fetchMock.on({
                method: "DELETE",
                url:
                    service.client.buildUrl(service.baseCrudPath) +
                    "/" +
                    encodeURIComponent("@test_id") +
                    "/external-auths/" +
                    encodeURIComponent("@test_provider") +
                    "?q1=456",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "789";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.unlinkExternalAuth(
                "@test_id",
                "@test_provider",
                {
                    q1: 456,
                    headers: { "x-test": "789" },
                },
            );

            assert.isTrue(result);
        });
    });
});
