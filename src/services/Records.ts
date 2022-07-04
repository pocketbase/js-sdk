import SubCrudService from '@/services/utils/SubCrudService';
import Record         from '@/models/Record';

export default class Records extends SubCrudService<Record> {
    /**
     * @inheritdoc
     */
    decode(data: { [key: string]: any }): Record {
        return new Record(data);
    }

    /**
     * @inheritdoc
     */
    baseCrudPath(collectionIdOrName: string): string {
        return '/api/collections/' + encodeURIComponent(collectionIdOrName) + '/records';
    }

    /**
     * Builds and returns an absolute record file url.
     */
    getFileUrl(record: Record, filename: string, queryParams = {}): string {
        const parts = [];
        parts.push(this.client.baseUrl.replace(/\/+$/gm, ""))
        parts.push("api")
        parts.push("files")
        parts.push(record["@collectionId"])
        parts.push(record.id)
        parts.push(filename)
        let result = parts.join('/');

        if (Object.keys(queryParams).length) {
            const params = new URLSearchParams(queryParams);
            result += (result.includes("?") ? "&" : "?") + params;
        }

        return result
    }
}
