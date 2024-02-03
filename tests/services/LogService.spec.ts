import { describe, assert, expect, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { LogService } from "@/services/LogService";

describe("LogService", function () {
    const client = new Client("test_base_url");
    const service = new LogService(client);
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

    describe("getList()", function () {
        test("Should correctly return paginated list result", async function () {
            const replyBody = {
                page: 2,
                perPage: 1,
                totalItems: 3,
                totalPages: 3,
                items: [{ id: "test123" }],
            };

            fetchMock.on({
                method: "GET",
                url: "test_base_url/api/logs?page=2&perPage=1&q1=abc",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "456";
                },
                replyCode: 200,
                replyBody: replyBody,
            });

            const list = await service.getList(2, 1, {
                q1: "abc",
                headers: { "x-test": "456" },
            });

            assert.deepEqual(list, replyBody);
        });
    });

    describe("getOne()", function () {
        test("Should return single log", async function () {
            fetchMock.on({
                method: "GET",
                url:
                    "test_base_url/api/logs/" +
                    encodeURIComponent("test?123") +
                    "?q1=abc",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "456";
                },
                replyCode: 200,
                replyBody: { id: "test123" },
            });

            const result = await service.getOne("test?123", {
                q1: "abc",
                headers: { "x-test": "456" },
            });

            assert.deepEqual(result, { id: "test123" } as any);
        });

        test("Should return a 404 error if id is empty", async function () {
            expect(service.getOne("")).rejects.toThrow("Missing required log id.");
            expect(service.getOne(null as any)).rejects.toThrow(
                "Missing required log id.",
            );
            expect(service.getOne(undefined as any)).rejects.toThrow(
                "Missing required log id.",
            );
        });
    });

    describe("getStats()", function () {
        test("Should return array with date grouped logs", async function () {
            fetchMock.on({
                method: "GET",
                url: "test_base_url/api/logs/stats?q1=abc",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "456";
                },
                replyCode: 200,
                replyBody: [{ total: 123, date: "2022-01-01 00:00:00" }],
            });

            const result = await service.getStats({
                q1: "abc",
                headers: { "x-test": "456" },
            });
            const expected = [{ total: 123, date: "2022-01-01 00:00:00" }];

            assert.deepEqual(result, expected);
        });
    });
});
