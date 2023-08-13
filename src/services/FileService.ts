import BaseService from '@/services/utils/BaseService';
import { CommonOptions, FileOptions } from '@/services/utils/options';

export default class FileService extends BaseService {
    /**
     * Builds and returns an absolute record file url for the provided filename.
     */
    getUrl(
        record: Pick<{[key:string]:any}, "id" | "collectionId" | "collectionName">,
        filename: string,
        queryParams: FileOptions = {}
    ): string {
        const parts = [];
        parts.push("api")
        parts.push("files")
        parts.push(encodeURIComponent(record.collectionId || record.collectionName))
        parts.push(encodeURIComponent(record.id))
        parts.push(encodeURIComponent(filename))

        let result = this.client.buildUrl(parts.join('/'));

        if (Object.keys(queryParams).length) {
            // normalize the download query param for consistency with the Dart sdk
            if (queryParams.download === false) {
                delete(queryParams.download);
            }

            const params = new URLSearchParams(queryParams);

            result += (result.includes("?") ? "&" : "?") + params;
        }

        return result
    }

    /**
     * Requests a new private file access token for the current auth model (admin or record).
     */
    getToken(options?: CommonOptions): Promise<string> {
        options = Object.assign({
            'method': 'POST',
        }, options);

        return this.client.send('/api/files/token', options)
            .then((data) => data?.token || '');
    }
}
