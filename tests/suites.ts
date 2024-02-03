import { describe, assert, expect, test, beforeAll, afterAll } from "vitest";
import { CrudService } from "@/services/utils/CrudService";
import { FetchMock } from "./mocks";

export function crudServiceTestsSuite<M>(
    service: CrudService<M>,
    expectedBasePath: string,
) {
    const id = "abc=";

    describe("CrudServiceTests", function () {
        const fetchMock = new FetchMock();

        beforeAll(function () {
            fetchMock.init();
        });

        afterAll(function () {
            fetchMock.restore();
        });

        // Prepare mock data
        // -----------------------------------------------------------

        // getFullList (extra empty request check)
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "?page=1&perPage=1&skipTotal=1&q1=emptyRequest",
            replyCode: 200,
            replyBody: {
                page: 1,
                perPage: 1,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item1" }],
            },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "?page=2&perPage=1&skipTotal=1&q1=emptyRequest",
            replyCode: 200,
            replyBody: {
                page: 2,
                perPage: 1,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item2" }],
            },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "?page=3&perPage=1&skipTotal=1&q1=emptyRequest",
            replyCode: 200,
            replyBody: {
                page: 3,
                perPage: 1,
                totalItems: -1,
                totalPages: -1,
                items: [],
            },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });

        // getFullList (less than batchSize, aka. no extra request)
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "?page=1&perPage=2&skipTotal=1&q1=noEmptyRequest",
            replyCode: 200,
            replyBody: {
                page: 1,
                perPage: 2,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item1" }, { id: "item2" }],
            },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "?page=2&perPage=2&skipTotal=1&q1=noEmptyRequest",
            replyCode: 200,
            replyBody: {
                page: 2,
                perPage: 2,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item3" }],
            },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });

        // getList
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "?page=1&perPage=1&q1=abc",
            replyCode: 200,
            replyBody: {
                page: 1,
                perPage: 1,
                totalItems: 3,
                totalPages: 3,
                items: [{ id: "item1" }, { id: "item2" }],
            },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "?page=2&perPage=1&q1=abc",
            replyCode: 200,
            replyBody: {
                page: 2,
                perPage: 1,
                totalItems: 3,
                totalPages: 3,
                items: [{ id: "item3" }],
            },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });

        // getOne
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "/" +
                encodeURIComponent(id) +
                "?q1=abc",
            replyCode: 200,
            replyBody: { id: "item-one" },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });

        // getFirstListItem
        fetchMock.on({
            method: "GET",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "?page=1&perPage=1&filter=test%3D123&skipTotal=1&q1=abc",
            replyCode: 200,
            replyBody: {
                page: 1,
                perPage: 1,
                totalItems: -1,
                totalPages: -1,
                items: [{ id: "item1" }],
            },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });

        // create
        fetchMock.on({
            method: "POST",
            url: service.client.buildUrl(service.baseCrudPath) + "?q1=456",
            body: { b1: 123 },
            replyCode: 200,
            replyBody: { id: "item-create" },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });

        // update
        fetchMock.on({
            method: "PATCH",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "/" +
                encodeURIComponent(id) +
                "?q1=456",
            body: { b1: 123 },
            replyCode: 200,
            replyBody: { id: "item-update" },
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });

        // delete
        fetchMock.on({
            method: "DELETE",
            url:
                service.client.buildUrl(service.baseCrudPath) +
                "/" +
                encodeURIComponent(id) +
                "?q1=456",
            replyCode: 204,
            additionalMatcher: (_, config) => {
                return config?.headers?.["x-test"] === "789";
            },
        });

        // -----------------------------------------------------------

        describe("baseCrudPath()", function () {
            test("Should corectly return the service base crud path", function () {
                assert.equal(service.baseCrudPath, expectedBasePath);
            });
        });

        describe("getFullList()", function () {
            test("items.length == batchSize (aka. empty request stop check)", async function () {
                const result = await service.getFullList({
                    batch: 1,
                    q1: "emptyRequest",
                    headers: { "x-test": "789" },
                });
                const expected = [
                    service.decode({ id: "item1" }),
                    service.decode({ id: "item2" }),
                ];

                assert.deepEqual(result, expected);
            });
            test("items.length < batchSize (aka. no empty request stop check)", async function () {
                const result = await service.getFullList({
                    batch: 2,
                    q1: "noEmptyRequest",
                    headers: { "x-test": "789" },
                });
                const expected = [
                    service.decode({ id: "item1" }),
                    service.decode({ id: "item2" }),
                    service.decode({ id: "item3" }),
                ];

                assert.deepEqual(result, expected);
            });
        });

        describe("getList()", function () {
            test("Should correctly return paginated list result", async function () {
                const list = await service.getList(2, 1, {
                    q1: "abc",
                    headers: { "x-test": "789" },
                });
                const expected = [service.decode({ id: "item3" })];

                assert.deepEqual(list, {
                    page: 2,
                    perPage: 1,
                    totalItems: 3,
                    totalPages: 3,
                    items: expected,
                });
            });
        });

        describe("getFirstListItem()", function () {
            test("Should return single model item by a filter", async function () {
                const result = await service.getFirstListItem("test=123", {
                    q1: "abc",
                    headers: { "x-test": "789" },
                });
                const expected = service.decode({ id: "item1" });

                assert.deepEqual(result, expected);
            });
        });

        describe("getOne()", function () {
            test("Should return single model item by an id", async function () {
                const result = await service.getOne(id, {
                    q1: "abc",
                    headers: { "x-test": "789" },
                });
                const expected = service.decode({ id: "item-one" });

                assert.deepEqual(result, expected);
            });

            test("Should return a 404 error if id is empty", async function () {
                const options = { q1: "abc", headers: { "x-test": "789" } };

                expect(service.getOne("", options)).rejects.toThrow(
                    "Missing required record id.",
                );
                expect(service.getOne(null as any, options)).rejects.toThrow(
                    "Missing required record id.",
                );
                expect(service.getOne(undefined as any, options)).rejects.toThrow(
                    "Missing required record id.",
                );
            });
        });

        describe("create()", function () {
            test("Should create new model item", async function () {
                const result = await service.create(
                    { b1: 123 },
                    { q1: 456, headers: { "x-test": "789" } },
                );
                const expected = service.decode({ id: "item-create" });

                assert.deepEqual(result, expected);
            });
        });

        describe("update()", function () {
            test("Should update existing model item", async function () {
                const result = await service.update(
                    id,
                    { b1: 123 },
                    { q1: 456, headers: { "x-test": "789" } },
                );
                const expected = service.decode({ id: "item-update" });

                assert.deepEqual(result, expected);
            });
        });

        describe("delete()", function () {
            test("Should delete single model item", async function () {
                const result = await service.delete(id, {
                    q1: 456,
                    headers: { "x-test": "789" },
                });

                assert.isTrue(result);
            });
        });
    });
}
