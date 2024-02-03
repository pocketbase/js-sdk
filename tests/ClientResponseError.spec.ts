import { describe, assert, test } from "vitest";
import { ClientResponseError } from "@/ClientResponseError";

describe("ClientResponseError", function () {
    describe("constructor()", function () {
        test("with object-like value", function () {
            const err = new ClientResponseError({
                url: "http://example.com",
                status: 400,
                response: { message: "test message" },
                isAbort: true,
                originalError: "test",
            });

            assert.equal(err.url, "http://example.com");
            assert.equal(err.status, 400);
            assert.deepEqual(err.response, { message: "test message" });
            assert.equal(err.isAbort, true);
            assert.equal(err.originalError, "test");
            assert.equal(err.message, "test message");
        });

        test("with non-object value", function () {
            const err = new ClientResponseError("test");

            assert.equal(err.url, "");
            assert.equal(err.status, 0);
            assert.deepEqual(err.response, {});
            assert.equal(err.isAbort, false);
            assert.equal(err.originalError, "test");
            assert.equal(
                err.message,
                "Something went wrong while processing your request.",
            );
        });

        test("with plain error", function () {
            const plainErr = new Error("test");
            const err = new ClientResponseError(plainErr);

            assert.equal(err.url, "");
            assert.equal(err.status, 0);
            assert.deepEqual(err.response, {});
            assert.equal(err.isAbort, false);
            assert.equal(err.originalError, plainErr);
            assert.equal(
                err.message,
                "Something went wrong while processing your request.",
            );
        });

        test("with ClientResponseError error", function () {
            const err0 = new ClientResponseError({
                url: "http://example.com",
                status: 400,
                response: { message: "test message" },
                isAbort: true,
                originalError: "test",
            });
            const err = new ClientResponseError(err0);

            assert.equal(err.url, "http://example.com");
            assert.equal(err.status, 400);
            assert.deepEqual(err.response, { message: "test message" });
            assert.equal(err.isAbort, true);
            assert.equal(err.originalError, "test");
            assert.equal(err.message, "test message");
        });

        test("with abort error", function () {
            const err0 = new DOMException("test");
            const err = new ClientResponseError(err0);

            assert.equal(err.url, "");
            assert.equal(err.status, 0);
            assert.deepEqual(err.response, {});
            assert.equal(err.isAbort, true);
            assert.equal(err.originalError, err0);
            assert.include(err.message, "request was autocancelled");
        });
    });
});
