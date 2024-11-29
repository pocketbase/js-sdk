import { BaseService } from "@/services/BaseService";
import { CommonOptions, FileOptions } from "@/tools/options";

export class FileService extends BaseService {
    /**
     * @deprecated Please replace with `pb.files.getURL()`.
     */
    getUrl(
        record: { [key: string]: any },
        filename: string,
        queryParams: FileOptions = {},
    ): string {
        console.warn("Please replace pb.files.getUrl() with pb.files.getURL()");
        return this.getURL(record, filename, queryParams);
    }

    /**
     * Builds and returns an absolute record file url for the provided filename.
     */
    getURL(
        record: { [key: string]: any },
        filename: string,
        queryParams: FileOptions = {},
    ): string {
        if (
            !filename ||
            !record?.id ||
            !(record?.collectionId || record?.collectionName)
        ) {
            return "";
        }

        const parts = [];
        parts.push("api");
        parts.push("files");
        parts.push(encodeURIComponent(record.collectionId || record.collectionName));
        parts.push(encodeURIComponent(record.id));
        parts.push(encodeURIComponent(filename));

        let result = this.client.buildURL(parts.join("/"));

        if (Object.keys(queryParams).length) {
            // normalize the download query param for consistency with the Dart sdk
            if (queryParams.download === false) {
                delete queryParams.download;
            }

            const params = new URLSearchParams(queryParams);

            result += (result.includes("?") ? "&" : "?") + params;
        }

        return result;
    }

    /**
     * Requests a new private file access token for the current auth model.
     *
     * @throws {ClientResponseError}
     */
    async getToken(options?: CommonOptions): Promise<string> {
        options = Object.assign(
            {
                method: "POST",
            },
            options,
        );

        return this.client
            .send("/api/files/token", options)
            .then((data) => data?.token || "");
    }
}
