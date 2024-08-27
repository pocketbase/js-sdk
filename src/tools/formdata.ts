/**
 * Checks if the specified value is a file (aka. File, Blob, RN file object).
 */
export function isFile(val: any): boolean {
    return (
        (typeof Blob !== "undefined" && val instanceof Blob) ||
        (typeof File !== "undefined" && val instanceof File) ||
        // check for React Native file object format
        // (see https://github.com/pocketbase/pocketbase/discussions/2002#discussioncomment-5254168)
        (val !== null &&
            typeof val === "object" &&
            val.uri &&
            ((typeof navigator !== "undefined" && navigator.product === "ReactNative") ||
                (typeof global !== "undefined" && (global as any).HermesInternal)))
    );
}

/**
 * Loosely checks if the specified body is a FormData instance.
 */
export function isFormData(body: any): boolean {
    return (
        body &&
        // we are checking the constructor name because FormData
        // is not available natively in some environments and the
        // polyfill(s) may not be globally accessible
        (body.constructor.name === "FormData" ||
            // fallback to global FormData instance check
            // note: this is needed because the constructor.name could be different in case of
            //       custom global FormData implementation, eg. React Native on Android/iOS
            (typeof FormData !== "undefined" && body instanceof FormData))
    );
}

/**
 * Checks if the submitted body object has at least one Blob/File field value.
 */
export function hasFileField(body: { [key: string]: any }): boolean {
    for (const key in body) {
        const values = Array.isArray(body[key]) ? body[key] : [body[key]];
        for (const v of values) {
            if (isFile(v)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Converts analyzes the provided body and converts it to FormData
 * in case a plain object with File/Blob values is used.
 */
export function convertToFormDataIfNeeded(body: any): any {
    if (
        typeof FormData === "undefined" ||
        typeof body === "undefined" ||
        typeof body !== "object" ||
        body === null ||
        isFormData(body) ||
        !hasFileField(body)
    ) {
        return body;
    }

    const form = new FormData();

    for (const key in body) {
        const val = body[key];

        if (typeof val === "object" && !hasFileField({ data: val })) {
            // send json-like values as jsonPayload to avoid the implicit string value normalization
            let payload: { [key: string]: any } = {};
            payload[key] = val;
            form.append("@jsonPayload", JSON.stringify(payload));
        } else {
            // in case of mixed string and file/blob
            const normalizedVal = Array.isArray(val) ? val : [val];
            for (let v of normalizedVal) {
                form.append(key, v);
            }
        }
    }

    return form;
}
