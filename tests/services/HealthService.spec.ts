import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { HealthService } from "@/services/HealthService";

describe("HealthService", function () {
    const client = new Client("test_base_url");
    const service = new HealthService(client);
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

    describe("check()", function () {
        test("Should fetch all app settings", async function () {
            fetchMock.on({
                method: "GET",
                url: service.client.buildUrl("/api/health") + "?q1=123",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "456";
                },
                replyCode: 200,
                replyBody: { code: 200, message: "test", data: {} },
            });

            const result = await service.check({ q1: 123, headers: { "x-test": "456" } });

            assert.deepEqual(result, { code: 200, message: "test", data: {} });
        });
    });
});
