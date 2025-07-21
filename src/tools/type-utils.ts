export type Join<T extends string> = T | `${T},${T}`;

export type Split<T> = T extends `${infer U},${infer V}` ? [U, ...Split<V>] : [T];

export type PickCommaSeparated<T extends Record<string, unknown>, K extends string> = {
    [TKey in Split<K>[number]]: T[TKey];
};
