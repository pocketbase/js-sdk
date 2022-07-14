/**
 * ClientResponseError is a custom Error class that is intended to wrap
 * and normalize any error thrown by `Client.send()`.
 */
export default class ClientResponseError extends Error {
    url: string                = '';
    status: number             = 0;
    data: {[key: string]: any} = {};
    isAbort:  boolean          = false;
    originalError: any         = null;

    constructor(errData?: any) {
        super("ClientResponseError");

        if (errData instanceof Error && !(errData instanceof this.constructor)) {
            this.originalError = errData;
        }

        if (errData !== null && typeof errData === 'object') {
            this.url    = typeof errData.url === 'string' ? errData.url : '';
            this.status = typeof errData.status === 'number' ? errData.status : 0;
            this.data   = errData.data !== null && typeof errData.data === 'object' ? errData.data : {};
        }

        if (typeof DOMException !== 'undefined' && errData instanceof DOMException) {
            this.isAbort = true;
        }

        this.name = "ClientResponseError " + this.status;
        this.message = this.data?.message || 'Something went wrong while processing your request.'
    }

    // Make a POJO's copy of the current error class instance.
    // @see https://github.com/vuex-orm/vuex-orm/issues/255
    toJSON () {
        return { ...this };
    }
}
