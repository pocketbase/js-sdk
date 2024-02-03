import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { FileService } from "@/services/FileService";

describe("FileService", function () {
    const client = new Client("test_base_url");
    const service = new FileService(client);
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

    describe("getFileUrl()", function () {
        test("Should return empty string (missing record id)", async function () {
            const record = { id: "", collectionId: "123", collectionName: "789" };
            const result = service.getUrl(record, "demo.png");

            assert.deepEqual(result, "");
        });

        test("Should return empty string (missing filename)", async function () {
            const record = { id: "456", collectionId: "123", collectionName: "789" };
            const result = service.getUrl(record, "");

            assert.deepEqual(result, "");
        });

        test("Should return a formatted url", async function () {
            const record = { id: "456", collectionId: "123", collectionName: "789" };
            const result = service.getUrl(record, "demo.png");

            assert.deepEqual(result, "test_base_url/api/files/123/456/demo.png");
        });

        test("Should return a formatted url + query params", async function () {
            const record = { id: "456", collectionId: "123", collectionName: "789" };
            const result = service.getUrl(record, "demo=", { test: "abc" });

            assert.deepEqual(result, "test_base_url/api/files/123/456/demo%3D?test=abc");
        });
    });

    describe("getToken()", function () {
        test("Should send a file token request", async function () {
            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/files/token") + "?q1=123",
                additionalMatcher: (_, config) => {
                    return config?.headers?.["x-test"] === "456";
                },
                replyCode: 200,
                replyBody: { token: "789" },
            });

            const result = await service.getToken({
                q1: 123,
                headers: { "x-test": "456" },
            });

            assert.deepEqual(result, "789");
        });
    });
});
