import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { CronService } from "@/services/CronService";

describe("CronService", function () {
    const client = new Client("test_base_url");
    const service = new CronService(client);
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

    describe("getFullList()", function () {
        test("Should fetch all cron jobs", async function () {
            const replyBody = [
                { id: "test1", expression: "* * * * *" },
                { id: "test2", expression: "* * * * *" },
            ];

            fetchMock.on({
                method: "GET",
                url: service.client.buildURL("/api/crons") + "?q1=123",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 200,
                replyBody: replyBody,
            });

            const result = await service.getFullList({
                q1: 123,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, replyBody);
        });
    });

    describe("run()", function () {
        test("Should trigger the specified cron job", async function () {
            fetchMock.on({
                method: "POST",
                url: service.client.buildURL("/api/crons") + "/%40test?q1=123",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "123";
                },
                replyCode: 204,
                replyBody: true,
            });

            const result = await service.run("@test", {
                q1: 123,
                headers: { "x-test": "123" },
            });

            assert.deepEqual(result, true);
        });
    });
});
