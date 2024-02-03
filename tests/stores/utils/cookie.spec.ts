import { describe, assert, test } from "vitest";
import { cookieParse, cookieSerialize } from "@/stores/utils/cookie";

describe("cookie", function () {
    describe("cookieParse()", function () {
        test("Should return an empty object if no cookie string", function () {
            const cookies = cookieParse("");
            assert.deepEqual(cookies, {});
        });

        test("Should successfully parse a valid cookie string", function () {
            const cookies = cookieParse("foo=bar; abc=12@3");
            assert.deepEqual(cookies, { foo: "bar", abc: "12@3" });
        });
    });

    describe("cookieSerialize()", function () {
        test("Should serialize an empty value", function () {
            const result = cookieSerialize("test_cookie", "");
            assert.equal(result, "test_cookie=");
        });

        test("Should serialize a non empty value", function () {
            const result = cookieSerialize("test_cookie", "abc");
            assert.equal(result, "test_cookie=abc");
        });

        test("Should generate a cookie with all available options", function () {
            const result = cookieSerialize("test_cookie", "abc", {
                maxAge: 123,
                domain: "test.com",
                path: "/abc/",
                expires: new Date("2022-01-01"),
                httpOnly: true,
                secure: true,
                priority: "low",
                sameSite: "lax",
                encode: (val) => "encode_" + encodeURIComponent(val),
            });
            assert.equal(
                result,
                "test_cookie=encode_abc; Max-Age=123; Domain=test.com; Path=/abc/; Expires=Sat, 01 Jan 2022 00:00:00 GMT; HttpOnly; Secure; Priority=Low; SameSite=Lax",
            );
        });
    });
});
