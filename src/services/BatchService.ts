import { BaseService } from "@/services/BaseService";
import { isFile } from "@/tools/formdata";
import {
    SendOptions,
    RecordOptions,
    normalizeUnknownQueryParams,
    serializeQueryParams,
} from "@/tools/options";

export interface BatchRequest {
    method: string;
    url: string;
    json?: { [key: string]: any };
    files?: { [key: string]: Array<any> };
    headers?: { [key: string]: string };
}

export interface BatchRequestResult {
    status: number;
    body: any;
}

export class BatchService extends BaseService {
    private requests: Array<BatchRequest> = [];
    private subs: { [key: string]: SubBatchService } = {};

    /**
     * Starts constructing a batch request entry for the specified collection.
     */
    collection(collectionIdOrName: string): SubBatchService {
        if (!this.subs[collectionIdOrName]) {
            this.subs[collectionIdOrName] = new SubBatchService(
                this.requests,
                collectionIdOrName,
            );
        }

        return this.subs[collectionIdOrName];
    }

    /**
     * Sends the batch requests.
     *
     * Note: FormData as individual request body is not supported at the moment.
     *
     * @throws {ClientResponseError}
     */
    async send(options?: SendOptions): Promise<Array<BatchRequestResult>> {
        const formData = new FormData();

        const jsonData = [];

        for (let i = 0; i < this.requests.length; i++) {
            const req = this.requests[i];

            jsonData.push({
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.json,
            });

            if (req.files) {
                for (let key in req.files) {
                    const files = req.files[key] || [];
                    for (let file of files) {
                        formData.append("requests." + i + "." + key, file);
                    }
                }
            }
        }

        formData.append("@jsonPayload", JSON.stringify({ requests: jsonData }));

        options = Object.assign(
            {
                method: "POST",
                body: formData,
            },
            options,
        );

        return this.client.send("/api/batch", options);
    }
}

export class SubBatchService {
    private requests: Array<BatchRequest> = [];
    private readonly collectionIdOrName: string;

    constructor(requests: Array<BatchRequest>, collectionIdOrName: string) {
        this.requests = requests;
        this.collectionIdOrName = collectionIdOrName;
    }

    /**
     * Registers a record upsert request into the current batch queue.
     *
     * The request will be executed as update if `bodyParams` have a valid existing record `id` value, otherwise - create.
     */
    upsert(bodyParams?: { [key: string]: any }, options?: RecordOptions): void {
        options = Object.assign(
            {
                body: bodyParams || {},
            },
            options,
        );

        const request: BatchRequest = {
            method: "PUT",
            url:
                "/api/collections/" +
                encodeURIComponent(this.collectionIdOrName) +
                "/records",
        };

        this.prepareRequest(request, options);

        this.requests.push(request);
    }

    /**
     * Registers a record create request into the current batch queue.
     */
    create(bodyParams?: { [key: string]: any }, options?: RecordOptions): void {
        options = Object.assign(
            {
                body: bodyParams || {},
            },
            options,
        );

        const request: BatchRequest = {
            method: "POST",
            url:
                "/api/collections/" +
                encodeURIComponent(this.collectionIdOrName) +
                "/records",
        };

        this.prepareRequest(request, options);

        this.requests.push(request);
    }

    /**
     * Registers a record update request into the current batch queue.
     */
    update(
        id: string,
        bodyParams?: { [key: string]: any },
        options?: RecordOptions,
    ): void {
        options = Object.assign(
            {
                body: bodyParams || {},
            },
            options,
        );

        const request: BatchRequest = {
            method: "PATCH",
            url:
                "/api/collections/" +
                encodeURIComponent(this.collectionIdOrName) +
                "/records/" +
                encodeURIComponent(id),
        };

        this.prepareRequest(request, options);

        this.requests.push(request);
    }

    /**
     * Registers a record delete request into the current batch queue.
     */
    delete(id: string, options?: SendOptions): void {
        options = Object.assign({}, options);

        const request: BatchRequest = {
            method: "DELETE",
            url:
                "/api/collections/" +
                encodeURIComponent(this.collectionIdOrName) +
                "/records/" +
                encodeURIComponent(id),
        };

        this.prepareRequest(request, options);

        this.requests.push(request);
    }

    private prepareRequest(request: BatchRequest, options: SendOptions) {
        normalizeUnknownQueryParams(options);

        request.headers = options.headers;
        request.json = {};
        request.files = {};

        // serialize query parameters
        // -----------------------------------------------------------
        if (typeof options.query !== "undefined") {
            const query = serializeQueryParams(options.query);
            if (query) {
                request.url += (request.url.includes("?") ? "&" : "?") + query;
            }
        }

        // extract json and files body data
        // -----------------------------------------------------------
        for (const key in options.body) {
            const val = options.body[key];

            if (isFile(val)) {
                request.files[key] = request.files[key] || [];
                request.files[key].push(val);
            } else if (Array.isArray(val)) {
                const foundFiles = [];
                const foundRegular = [];
                for (const v of val) {
                    if (isFile(v)) {
                        foundFiles.push(v);
                    } else {
                        foundRegular.push(v);
                    }
                }

                if (foundFiles.length > 0 && foundFiles.length == val.length) {
                    // only files
                    // ---
                    request.files[key] = request.files[key] || [];
                    for (let file of foundFiles) {
                        request.files[key].push(file);
                    }
                } else {
                    // empty or mixed array (both regular and File/Blob values)
                    // ---
                    request.json[key] = foundRegular;

                    if (foundFiles.length > 0) {
                        // add "+" to append if not already since otherwise
                        // the existing regular files will be deleted
                        // (the mixed values order is preserved only within their corresponding groups)
                        let fileKey = key;
                        if (!key.startsWith("+") && !key.endsWith("+")) {
                            fileKey += "+";
                        }

                        request.files[fileKey] = request.files[fileKey] || [];
                        for (let file of foundFiles) {
                            request.files[fileKey].push(file);
                        }
                    }
                }
            } else {
                request.json[key] = val;
            }
        }
    }
}
