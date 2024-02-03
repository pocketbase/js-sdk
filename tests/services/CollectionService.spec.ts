import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import { crudServiceTestsSuite } from "../suites";
import Client from "@/Client";
import { CollectionService } from "@/services/CollectionService";
import { CollectionModel } from "@/services/utils/dtos";

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
                url: service.client.buildUrl("/api/collections/import?q1=456"),
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
});
