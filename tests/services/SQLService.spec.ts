import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { SQLService } from "@/services/SQLService";

describe("SQLService", function () {
    const client = new Client("test_base_url");
    const service = new SQLService(client);
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

    describe("run()", function () {
        test("Should send a SQL query run request", async function () {
            const mockReply = {
                execTime: 1,
                affectedRows: 2,
                columns: [{ name: "col1", type: "", nullable: false }],
                rows: [["a"], [null]],
            };

            fetchMock.on({
                method: "POST",
                url: service.client.buildURL("/api/sql") + "?q1=123",
                body: { query: "test_query" },
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "456";
                },
                replyCode: 200,
                replyBody: Object.assign({}, mockReply),
            });

            const result = await service.run("test_query", {
                q1: 123,
                headers: { "x-test": "456" },
            });

            assert.deepEqual(result, mockReply);
        });
    });
});
