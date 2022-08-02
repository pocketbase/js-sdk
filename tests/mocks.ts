import ClientResponseError from "@/ClientResponseError";

export type RequestMock = {
    method?:    string,
    url?:       string,
    body?:      { [key:string]: any },
    additionalMatcher?: (url: RequestInfo |URL, config: RequestInit | undefined) => boolean,
    delay?:     number,
    replyCode?: number,
    replyBody?: any,
}

export class FetchMock {
    private originalFetch?: Function
    private mocks: Array<RequestMock> = [];

    on(request: RequestMock) {
        this.mocks.push(request);
    }

    /**
     * Initializes the mock by temporary overwriting `global.fetch`.
     */
    init() {
        this.originalFetch = global?.fetch;

        global.fetch = (url: RequestInfo | URL, config: RequestInit | undefined) => {
            for (let mock of this.mocks) {
                // match url and method
                if (
                    mock.url !== url ||
                    config?.method !== mock.method
                ) {
                    continue;
                }

                // match body params
                if (mock.body) {
                    let configBody: { [key:string]: any } = {};

                    // deserialize
                    if (typeof config?.body === 'string') {
                        configBody = JSON.parse(config?.body) as { [key:string]: any };
                    }

                    let hasMissingBodyParam = false;
                    for (const key in mock.body) {
                        if (typeof configBody[key] === 'undefined') {
                            hasMissingBodyParam = true;
                            break;;
                        }
                    }
                    if (hasMissingBodyParam) {
                        continue;
                    }
                }

                if (mock.additionalMatcher && !mock.additionalMatcher(url, config)) {
                    continue
                }

                const response = ({
                    url: url,
                    status: mock.replyCode,
                    statusText: 'test',
                    json: async () => (mock.replyBody || {}),
                } as Response);

                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        if (!!config?.signal?.aborted) {
                            reject(new ClientResponseError());
                        }
                        resolve(response);
                    }, mock.delay || 0);
                });
            }

            throw new Error('Request not mocked: ' + url);
        }
    }

    /**
     * Restore the original node fetch function.
     */
    restore() {
        (global.fetch as any) = this.originalFetch;
    }

    /**
     * Clears all registered mocks.
     */
    clearMocks() {
        this.mocks = [];
    }
}
