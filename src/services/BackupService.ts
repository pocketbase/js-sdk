import BaseService         from '@/services/utils/BaseService';
import { BaseQueryParams } from '@/services/utils/QueryParams';

export interface BackupFileInfo {
    key:      string;
    size:     number;
    modified: string;
}

export default class BackupService extends BaseService {
    /**
     * Returns list with all available backup files.
     */
    getFullList(queryParams: BaseQueryParams = {}): Promise<Array<BackupFileInfo>> {
        return this.client.send('/api/backups', {
            'method': 'GET',
            'params': queryParams,
        });
    }

    /**
     * Initializes a new backup.
     */
    create(basename: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        const bodyParams = {
            'name': basename,
        };

        return this.client.send('/api/backups', {
            'method': 'POST',
            'params': queryParams,
            'body':   bodyParams,
        }).then(() => true);
    }

    /**
     * Deletes a single backup file.
     */
    delete(key: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        return this.client.send(`/api/backups/${encodeURIComponent(key)}`, {
            'method': 'DELETE',
            'params': queryParams,
        }).then(() => true);
    }

    /**
     * Initializes an app data restore from an existing backup.
     */
    restore(key: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        return this.client.send(`/api/backups/${encodeURIComponent(key)}/restore`, {
            'method': 'POST',
            'params': queryParams,
        }).then(() => true);
    }

    /**
     * Builds a download url for a single existing backup using an
     * admin file token and the backup file key.
     *
     * The file token can be generated via `pb.files.getToken()`.
     */
    getDownloadUrl(token: string, key: string): string {
        return this.client.buildUrl(`/api/backups/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}`);
    }
}
