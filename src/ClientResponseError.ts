/**
 * ClientResponseError is a custom Error class that is intended to wrap
 * and normalize any error thrown by `Client.send()`.
 */
export class ClientResponseError extends Error {
    url: string = "";
    status: number = 0;
    response: { [key: string]: any } = {};
    isAbort: boolean = false;
    originalError: any = null;

    constructor(errData?: any) {
        super("ClientResponseError");

        // Set the prototype explicitly.
        // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, ClientResponseError.prototype);

        if (errData !== null && typeof errData === "object") {
            this.url = typeof errData.url === "string" ? errData.url : "";
            this.status = typeof errData.status === "number" ? errData.status : 0;
            this.isAbort = !!errData.isAbort;
            this.originalError = errData.originalError;

            if (errData.response !== null && typeof errData.response === "object") {
                this.response = errData.response;
            } else if (errData.data !== null && typeof errData.data === "object") {
                this.response = errData.data;
            } else {
                this.response = {};
            }
        }

        if (!this.originalError && !(errData instanceof ClientResponseError)) {
            this.originalError = errData;
        }

        if (
            typeof DOMException !== "undefined" &&
            errData instanceof DOMException &&
            // https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror
            (errData.name == "AbortError" || errData.code == 20)
        ) {
            this.isAbort = true;
        }

        // In React Native, aborting a fetch throws a plain Error with message "Aborted"
        // instead of a DOMException, so we need to detect it by message content.
        if (errData?.message === "Aborted") {
            this.isAbort = true;
        }

        this.name = "ClientResponseError " + this.status;
        this.message = this.response?.message;
        if (!this.message) {
            if (this.isAbort) {
                this.message =
                    "The request was autocancelled. You can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation.";
            } else if (this.originalError?.cause?.message?.includes("ECONNREFUSED ::1")) {
                this.message =
                    "Failed to connect to the PocketBase server. Try changing the SDK URL from localhost to 127.0.0.1 (https://github.com/pocketbase/js-sdk/issues/21).";
            } else {
                this.message = "Something went wrong.";
            }
        }

        // set this.cause so that JS debugging tools can automatically connect
        // the dots between the original error and the wrapped one
        this.cause = this.originalError;
    }

    /**
     * Alias for `this.response` for backward compatibility.
     */
    get data() {
        return this.response;
    }

    /**
     * Make a POJO's copy of the current error class instance.
     * @see https://github.com/vuex-orm/vuex-orm/issues/255
     */
    toJSON() {
        return { ...this };
    }
}
