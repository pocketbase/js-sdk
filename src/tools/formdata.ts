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
        (body.constructor?.name === "FormData" ||
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

        // skip undefined values for consistency with JSON.stringify
        // (see https://github.com/pocketbase/pocketbase/issues/6731#issuecomment-2812382827)
        if (typeof val === "undefined") {
            continue;
        }

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

/**
 * Converts the provided FormData instance into a plain object.
 *
 * For consistency with the server multipart/form-data inferring,
 * the following normalization rules are applied for plain multipart string values:
 *   - "true" is converted to the json "true"
 *   - "false" is converted to the json "false"
 *   - numeric strings are converted to json number ONLY if the resulted
 *     minimal number string representation is the same as the provided raw string
 *     (aka. scientific notations, "Infinity", "0.0", "0001", etc. are kept as string)
 *   - any other string (empty string too) is left as it is
 */
export function convertFormDataToObject(formData: FormData): { [key: string]: any } {
    let result: { [key: string]: any } = {};

    formData.forEach((v, k) => {
        if (k === "@jsonPayload" && typeof v == "string") {
            try {
                let parsed = JSON.parse(v);
                Object.assign(result, parsed);
            } catch (err) {
                console.warn("@jsonPayload error:", err);
            }
        } else {
            if (typeof result[k] !== "undefined") {
                if (!Array.isArray(result[k])) {
                    result[k] = [result[k]];
                }
                result[k].push(inferFormDataValue(v));
            } else {
                result[k] = inferFormDataValue(v);
            }
        }
    });

    return result;
}

const inferNumberCharsRegex = /^[\-\.\d]+$/;

function inferFormDataValue(value: any): any {
    if (typeof value != "string") {
        return value;
    }

    if (value == "true") {
        return true;
    }

    if (value == "false") {
        return false;
    }

    // note: expects the provided raw string to match exactly with the minimal string representation of the parsed number
    if (
        (value[0] === "-" || (value[0] >= "0" && value[0] <= "9")) &&
        inferNumberCharsRegex.test(value)
    ) {
        let num = +value;
        if ("" + num === value) {
            return num;
        }
    }

    return value;
}
