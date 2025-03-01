import { describe, assert, test } from "vitest";
import { serializeQueryParams } from "@/tools/options";

describe("serializeQueryParams()", function () {
    test("Should return an empty string if no serializable parameters are found", function () {
        assert.equal(serializeQueryParams({}), "");
        assert.equal(serializeQueryParams({"a": null, "b": undefined}), "");
    })

    test("Should properly serialize different type of parameter values", function () {
        const testParams: any = {};

        testParams["@test_null"] = null;
        testParams["@test_undefined"] = undefined;
        testParams["@test_date"] = new Date("2025-01-01T01:02:03.456Z");
        testParams["@test_object"] = {"a": 123, "@b": 456};
        testParams["@test_number"] = 123.456;
        testParams["@test_string"] = "@test_str";
        testParams["@test_bool"] = false;
        testParams["@test_array"] = [123, "@test_arr", {"@c": 789}, new Date("2025-01-02T01:02:03.456Z"), [4, 5, 6]];

        const result = serializeQueryParams(testParams)

        assert.equal(result, "%40test_date=2025-01-01%2001%3A02%3A03.456Z&%40test_object=%7B%22a%22%3A123%2C%22%40b%22%3A456%7D&%40test_number=123.456&%40test_string=%40test_str&%40test_bool=false&%40test_array=123&%40test_array=%40test_arr&%40test_array=%7B%22%40c%22%3A789%7D&%40test_array=2025-01-02%2001%3A02%3A03.456Z&%40test_array=%5B4%2C5%2C6%5D");
    });
});
