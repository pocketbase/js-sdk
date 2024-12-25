import { BaseService } from "@/services/BaseService";
import { CommonOptions } from "@/tools/options";

export interface CronJob {
    id: string;
    expression: string;
}

export class CronService extends BaseService {
    /**
     * Returns list with all registered cron jobs.
     *
     * @throws {ClientResponseError}
     */
    async getFullList(options?: CommonOptions): Promise<Array<CronJob>> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send("/api/crons", options);
    }

    /**
     * Runs the specified cron job.
     *
     * @throws {ClientResponseError}
     */
    async run(cronId: string, options?: CommonOptions): Promise<boolean> {
        options = Object.assign(
            {
                method: "POST",
            },
            options,
        );

        return this.client
            .send(`/api/crons/${encodeURIComponent(cronId)}`, options)
            .then(() => true);
    }
}
