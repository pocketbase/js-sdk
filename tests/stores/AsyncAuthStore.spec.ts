import { describe, assert, expect, test } from "vitest";
import { AsyncAuthStore } from "@/stores/AsyncAuthStore";

describe("AsyncAuthStore", function () {
    describe("construct()", function () {
        test("load empty initial", async function () {
            let calls: any = [];

            const store = new AsyncAuthStore({
                save: async (payload) => {
                    calls.push(payload);
                },
            });

            assert.equal(store.token, "");
            assert.equal(store.model, null);

            const callsPromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(calls), 0);
            });
            await expect(callsPromise).resolves.toStrictEqual([]);
        });

        test("load initial from string", async function () {
            let calls: any = [];

            const store = new AsyncAuthStore({
                save: async (payload) => {
                    calls.push(payload);
                },
                initial: `{"token": "test", "model": {"id": "id1"}}`,
            });

            const callsPromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(calls), 0);
            });
            await expect(callsPromise).resolves.toStrictEqual([
                `{"token":"test","model":{"id":"id1"}}`,
            ]);

            assert.equal(store.token, "test");
            assert.deepEqual(store.model, { id: "id1" } as any);
        });

        test("load initial from Promise<string>", async function () {
            let calls: any = [];

            const store = new AsyncAuthStore({
                save: async (payload) => {
                    calls.push(payload);
                },
                initial: Promise.resolve(`{"token": "test", "model": {"id": "id1"}}`),
            });

            const callsPromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(calls), 0);
            });
            await expect(callsPromise).resolves.toStrictEqual([
                `{"token":"test","model":{"id":"id1"}}`,
            ]);

            assert.equal(store.token, "test");
            assert.deepEqual(store.model, { id: "id1" } as any);
        });

        test("load initial from Promise<object>", async function () {
            let calls: any = [];

            const store = new AsyncAuthStore({
                save: async (payload) => {
                    calls.push(payload);
                },
                initial: Promise.resolve({ token: "test", model: { id: "id1" } }),
            });

            const callsPromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(calls), 0);
            });
            await expect(callsPromise).resolves.toStrictEqual([
                `{"token":"test","model":{"id":"id1"}}`,
            ]);

            assert.equal(store.token, "test");
            assert.deepEqual(store.model, { id: "id1" } as any);
        });
    });

    describe("save()", function () {
        test("trigger saveFunc", async function () {
            let calls: any = [];

            const store = new AsyncAuthStore({
                save: async (payload) => {
                    calls.push(payload);
                },
            });

            store.save("test1", { id: "id1" } as any);
            assert.equal(store.token, "test1");
            assert.deepEqual(store.model, { id: "id1" } as any);

            // update
            store.save("test2", { id: "id2" } as any);
            assert.equal(store.token, "test2");
            assert.deepEqual(store.model, { id: "id2" } as any);

            const callsPromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(calls), 0);
            });
            await expect(callsPromise).resolves.toStrictEqual([
                `{"token":"test1","model":{"id":"id1"}}`,
                `{"token":"test2","model":{"id":"id2"}}`,
            ]);
        });
    });

    describe("clear()", function () {
        test("no explicit clearFunc", async function () {
            let calls: any = [];

            const store = new AsyncAuthStore({
                save: async (payload) => {
                    calls.push(payload);
                },
            });

            store.save("test", { id: "id1" } as any);
            assert.equal(store.token, "test");
            assert.deepEqual(store.model, { id: "id1" } as any);

            store.clear();
            assert.equal(store.token, "");
            assert.deepEqual(store.model, null);

            const callsPromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(calls), 0);
            });
            await expect(callsPromise).resolves.toStrictEqual([
                `{"token":"test","model":{"id":"id1"}}`,
                "",
            ]);
        });

        test("with explicit clearFunc", async function () {
            let saveCalls: any = [];
            let clearCalls: any = [];

            const store = new AsyncAuthStore({
                save: async (payload) => {
                    saveCalls.push(payload);
                },
                clear: async () => {
                    clearCalls.push("clear_test");
                },
            });

            store.save("test", { id: "id1" } as any);
            assert.equal(store.token, "test");
            assert.deepEqual(store.model, { id: "id1" } as any);

            store.clear();
            assert.equal(store.token, "");
            assert.deepEqual(store.model, null);

            const savePromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(saveCalls), 0);
            });
            await expect(savePromise).resolves.toStrictEqual([
                `{"token":"test","model":{"id":"id1"}}`,
            ]);

            const clearPromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(clearCalls), 0);
            });
            await expect(clearPromise).resolves.toStrictEqual(["clear_test"]);
        });
    });
});
