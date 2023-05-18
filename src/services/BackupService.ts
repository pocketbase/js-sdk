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
    create(name: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        const bodyParams = {
            'name': name,
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
    delete(name: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        return this.client.send(`/api/backups/${encodeURIComponent(name)}`, {
            'method': 'DELETE',
            'params': queryParams,
        }).then(() => true);
    }

    /**
     * Initializes an app data restore procedure from an existing backup.
     */
    restore(name: string, queryParams: BaseQueryParams = {}): Promise<boolean> {
        return this.client.send(`/api/backups/${encodeURIComponent(name)}/restore`, {
            'method': 'POST',
            'params': queryParams,
        }).then(() => true);
    }

    /**
     * Builds a download url for a single existing backup.
     */
    getDownloadUrl(token: string, name: string): string {
        return this.client.buildUrl(`/api/backups/${encodeURIComponent(name)}?token=${encodeURIComponent(token)}`);
    }
}
