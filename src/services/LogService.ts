import { ClientResponseError } from "@/ClientResponseError";
import { BaseService } from "@/services/utils/BaseService";
import { ListResult, LogModel } from "@/services/utils/dtos";
import { CommonOptions, ListOptions, LogStatsOptions } from "@/services/utils/options";

export interface HourlyStats {
    total: number;
    date: string;
}

export class LogService extends BaseService {
    /**
     * Returns paginated logs list.
     *
     * @throws {ClientResponseError}
     */
    async getList(
        page = 1,
        perPage = 30,
        options?: ListOptions,
    ): Promise<ListResult<LogModel>> {
        options = Object.assign({ method: "GET" }, options);

        options.query = Object.assign(
            {
                page: page,
                perPage: perPage,
            },
            options.query,
        );

        return this.client.send("/api/logs", options);
    }

    /**
     * Returns a single log by its id.
     *
     * If `id` is empty it will throw a 404 error.
     *
     * @throws {ClientResponseError}
     */
    async getOne(id: string, options?: CommonOptions): Promise<LogModel> {
        if (!id) {
            throw new ClientResponseError({
                url: this.client.buildUrl("/api/logs/"),
                status: 404,
                response: {
                    code: 404,
                    message: "Missing required log id.",
                    data: {},
                },
            });
        }

        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send("/api/logs/" + encodeURIComponent(id), options);
    }

    /**
     * Returns logs statistics.
     *
     * @throws {ClientResponseError}
     */
    async getStats(options?: LogStatsOptions): Promise<Array<HourlyStats>> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send("/api/logs/stats", options);
    }
}
