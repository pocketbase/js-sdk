import BaseService from '@/services/utils/BaseService';
import Record      from '@/models/Record';
import { BaseQueryParams, FileQueryParams } from '@/services/utils/QueryParams';

export default class FileService extends BaseService {
    /**
     * Builds and returns an absolute record file url for the provided filename.
     */
    getUrl(
        record: Pick<Record, "id" | "collectionId" | "collectionName">,
        filename: string,
        queryParams: FileQueryParams = {}
    ): string {
        const parts = [];
        parts.push("api")
        parts.push("files")
        parts.push(encodeURIComponent(record.collectionId || record.collectionName))
        parts.push(encodeURIComponent(record.id))
        parts.push(encodeURIComponent(filename))

        let result = this.client.buildUrl(parts.join('/'));

        if (Object.keys(queryParams).length) {
            const params = new URLSearchParams(queryParams);
            result += (result.includes("?") ? "&" : "?") + params;
        }

        return result
    }

    /**
     * Requests a new private file access token for the current auth model (admin or record).
     */
    getToken(queryParams: BaseQueryParams = {}): Promise<string> {
        return this.client.send('/api/files/token', {
            'method': 'POST',
            'params': queryParams,
        }).then((data) => data?.token || '');
    }
}
