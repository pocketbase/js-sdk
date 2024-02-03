import { SendOptions } from "@/services/utils/options";

export function normalizeLegacyOptionsArgs(
    legacyWarn: string,
    baseOptions: SendOptions,
    bodyOrOptions?: any,
    query?: any,
): SendOptions {
    const hasBodyOrOptions = typeof bodyOrOptions !== "undefined";
    const hasQuery = typeof query !== "undefined";

    if (!hasQuery && !hasBodyOrOptions) {
        return baseOptions;
    }

    if (hasQuery) {
        console.warn(legacyWarn);
        baseOptions.body = Object.assign({}, baseOptions.body, bodyOrOptions);
        baseOptions.query = Object.assign({}, baseOptions.query, query);

        return baseOptions;
    }

    return Object.assign(baseOptions, bodyOrOptions);
}
