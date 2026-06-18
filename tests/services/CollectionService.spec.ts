import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import { crudServiceTestsSuite } from "../suites";
import Client from "@/Client";
import { CollectionService } from "@/services/CollectionService";
import type { CollectionModel } from "@/tools/dtos";

describe("CollectionService", function () {
    const client = new Client("test_base_url");
    const service = new CollectionService(client);

    crudServiceTestsSuite(service, "/api/collections");

    const fetchMock = new FetchMock();

    beforeAll(function () {
        fetchMock.init();
    });

    afterAll(function () {
        fetchMock.restore();
    });

    afterEach(function () {
        fetchMock.clearMocks();
    });

    describe("import()", function () {
        test("Should send a bulk import collections request", async function () {
            fetchMock.on({
                method: "PUT",
                url: service.client.buildURL("/api/collections/import?q1=456"),
                body: {
                    collections: [{ id: "id1" }, { id: "id2" }],
                    deleteMissing: true,
                },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.import(
                [{ id: "id1" }, { id: "id2" }] as Array<CollectionModel>,
                true,
                {
                    q1: 456,
                    headers: { "x-test": "123" },
                },
            );

            assert.deepEqual(result, true);
        });
    });

    describe("truncate()", function () {
        test("Should send truncate collection request", async function () {
            fetchMock.on({
                method: "DELETE",
                url: service.client.buildURL("/api/collections/test%3D/truncate?q1=456"),
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.truncate("test=", {
                q1: 456,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, true);
        });
    });

    describe("getScaffolds()", function () {
        test("Should send collection scaffolds request", async function () {
            fetchMock.on({
                method: "GET",
                url: service.client.buildURL("/api/collections/meta/scaffolds?q1=456"),
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.getScaffolds({
                q1: 456,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result as any, true);
        });
    });

    describe("getAllOAuth2Providers()", function () {
        test("Should send OAuth2 providers list request", async function () {
            const mockReply = [{ name: "test_name", displayName: "", logo: "" }];

            fetchMock.on({
                method: "GET",
                url: service.client.buildURL(
                    "/api/collections/meta/oauth2-providers?q1=456",
                ),
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 200,
                replyBody: mockReply,
            });

            const result = await service.getAllOAuth2Providers({
                q1: 456,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, mockReply);
        });
    });

    describe("dryRunViewQuery()", function () {
        test("Should send a dry run view query request", async function () {
            const mockReply = [{ id: 1 }];

            fetchMock.on({
                method: "POST",
                url: service.client.buildURL("/api/collections/meta/dry-run-view?q1=456"),
                body: { query: "test_query" },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 200,
                replyBody: mockReply,
            });

            const result = await service.dryRunViewQuery("test_query", {
                q1: 456,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, mockReply);
        });
    });
});
