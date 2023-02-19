/**
 * ClientResponseError is a custom Error class that is intended to wrap
 * and normalize any error thrown by `Client.send()`.
 */
export default class ClientResponseError extends Error {
    url: string                    = '';
    status: number                 = 0;
    response: {[key: string]: any} = {};
    isAbort:  boolean              = false;
    originalError: any             = null;

    constructor(errData?: any) {
        super("ClientResponseError");

        // Set the prototype explicitly.
        // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, ClientResponseError.prototype);

        if (!(errData instanceof ClientResponseError)) {
            this.originalError = errData;
        }

        if (errData !== null && typeof errData === 'object') {
            this.url      = typeof errData.url === 'string' ? errData.url : '';
            this.status   = typeof errData.status === 'number' ? errData.status : 0;
            this.response = errData.data !== null && typeof errData.data === 'object' ? errData.data : {};
            this.isAbort  = !!errData.isAbort;
        }

        if (typeof DOMException !== 'undefined' && errData instanceof DOMException) {
            this.isAbort = true;
        }

        this.name = "ClientResponseError " + this.status;
        this.message = this.response?.message;
        if (!this.message) {
            if (this.isAbort) {
                this.message = 'The request was autocancelled. You can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation.';
            } else if (this.originalError?.cause?.message?.includes("ECONNREFUSED ::1")) {
                this.message = 'Failed to connect to the PocketBase server. Try changing the SDK URL from localhost to 127.0.0.1 (https://github.com/pocketbase/js-sdk/issues/21).';
            } else {
                this.message = 'Something went wrong while processing your request.';
            }
        }
    }

    /**
     * Alias for `this.response` to preserve the backward compatibility.
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
