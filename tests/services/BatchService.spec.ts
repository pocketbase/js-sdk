import { describe, assert, test, beforeAll, afterAll, afterEach } from "vitest";
import { FetchMock } from "../mocks";
import Client from "@/Client";
import { BatchService } from "@/services/BatchService";

describe("BatchService", function () {
    const client = new Client("test_base_url");
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

    describe("send()", function () {
        test("Should send a create/update/upsert/delete batch request", async function () {
            const service = new BatchService(client);

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/batch") + "?q1=123",
                additionalMatcher: (_, config) => {
                    if (
                        // custom header is missing
                        config?.headers?.["x-test"] != "123" ||
                        // multipart/form-data requests shouldn't have explicitly set Content-Type
                        config?.headers?.["Content-Type"] ||
                        // the body should have been converted to FormData
                        !(config.body instanceof FormData)
                    ) {
                        return false;
                    }

                    assert.equal(Array.from(config.body.keys()).length, 11);

                    assert.deepEqual(
                        JSON.parse(config.body.get("@jsonPayload") as string),
                        {
                            requests: [
                                {
                                    method: "POST",
                                    url: "/api/collections/%40test1/records?fields=1abc",
                                    body: {
                                        create_test: 1,
                                        empty_array: [],
                                        mixed_files: ["file1.1", "file1.2"],
                                        "mixed_file_append+": ["file2.1", "file2.2"],
                                        "+mixed_file_prepend": ["file3.1", "file3.2"],
                                        obj_file: {
                                            type: "image/*",
                                            uri: "...",
                                        },
                                    },
                                },
                                {
                                    method: "PUT",
                                    url: "/api/collections/%40test1/records?fields=2abc",
                                    body: {
                                        upsert_test: 2,
                                    },
                                },
                                {
                                    method: "PATCH",
                                    url: "/api/collections/%40test2/records/%40update?fields=3abc",
                                    body: {
                                        update_test: 3,
                                        plain_array: [1, 2],
                                    },
                                },
                                {
                                    method: "DELETE",
                                    url: "/api/collections/%40test2/records/%40delete?fields=4abc",
                                    body: {},
                                },
                            ],
                        },
                    );
                    assert.equal(config.body.getAll("requests.0.single_file").length, 1);
                    assert.equal(config.body.getAll("requests.0.mixed_files+").length, 3);
                    assert.equal(
                        config.body.getAll("requests.0.mixed_file_append+").length,
                        1,
                    );
                    assert.equal(
                        config.body.getAll("requests.0.+mixed_file_prepend").length,
                        3,
                    );
                    assert.equal(config.body.getAll("requests.2.files").length, 2);

                    return true;
                },
                replyCode: 200,
                replyBody: true,
            });

            service.collection("@test1").create(
                {
                    create_test: 1,
                    empty_array: [],
                    single_file: new Blob(["1"]),
                    "mixed_files+": new Blob(["123"]),
                    mixed_files: [
                        "file1.1",
                        new Blob(["abc"]),
                        new Blob(["abc"]),
                        "file1.2",
                    ],
                    "mixed_file_append+": ["file2.1", new Blob(["abc"]), "file2.2"],
                    "+mixed_file_prepend": [
                        "file3.1",
                        new Blob(["abc"]),
                        new Blob(["abc"]),
                        "file3.2",
                        new Blob(["abc"]),
                    ],
                    // shouldn't be converted to a file since it is not ReactNative
                    obj_file: { type: "image/*", uri: "..." },
                },
                { fields: "1abc" },
            );
            service.collection("@test1").upsert({ upsert_test: 2 }, { fields: "2abc" });
            service.collection("@test2").update(
                "@update",
                {
                    update_test: 3,
                    plain_array: [1, 2],
                    files: [new Blob(["1"]), new Blob(["2"])],
                },
                { fields: "3abc" },
            );
            service.collection("@test2").delete("@delete", { fields: "4abc" });

            const result = await service.send({
                q1: 123,
                headers: {
                    "x-test": "123",
                },
            });

            assert.deepEqual(result as any, true);
        });

        test("Should successfully detect ReactNative file object format", async function () {
            const service = new BatchService(client);

            fetchMock.on({
                method: "POST",
                url: service.client.buildUrl("/api/batch") + "?q1=123",
                additionalMatcher: (_, config) => {
                    if (
                        // custom header is missing
                        config?.headers?.["x-test"] != "123" ||
                        // multipart/form-data requests shouldn't have explicitly set Content-Type
                        config?.headers?.["Content-Type"] ||
                        // the body should have been converted to FormData
                        !(config.body instanceof FormData)
                    ) {
                        return false;
                    }

                    assert.equal(Array.from(config.body.keys()).length, 2);

                    assert.deepEqual(
                        JSON.parse(config.body.get("@jsonPayload") as string),
                        {
                            requests: [
                                {
                                    method: "POST",
                                    url: "/api/collections/%40test1/records?fields=1abc",
                                    body: {
                                        title: "abc",
                                    },
                                },
                            ],
                        },
                    );

                    assert.equal(config.body.getAll("requests.0.file").length, 1);

                    return true;
                },
                replyCode: 200,
                replyBody: true,
            });

            // mock ReactNative env
            globalThis.global = globalThis.global || {};
            (globalThis.global as any).HermesInternal = true;

            service.collection("@test1").create(
                {
                    title: "abc",
                    file: { type: "image/*", uri: "..." },
                },
                { fields: "1abc" },
            );

            const result = await service.send({
                q1: 123,
                headers: {
                    "x-test": "123",
                },
            });

            // restore
            (globalThis.global as any).product = false;

            assert.deepEqual(result as any, true);
        });
    });
});
