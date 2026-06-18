import { CrudService } from "@/services/CrudService";
import type { CommonOptions } from "@/tools/options";
import type { CollectionModel, ConfigurableOAuth2Provider } from "@/tools/dtos";

export class CollectionService extends CrudService<CollectionModel> {
    /**
     * @inheritdoc
     */
    get baseCrudPath(): string {
        return "/api/collections";
    }

    /**
     * Imports the provided collections.
     *
     * If `deleteMissing` is `true`, all local collections and their fields,
     * that are not present in the imported configuration, WILL BE DELETED
     * (including their related records data)!
     *
     * @throws {ClientResponseError}
     */
    async import(
        collections: Array<CollectionModel>,
        deleteMissing: boolean = false,
        options?: CommonOptions,
    ): Promise<true> {
        options = Object.assign(
            {
                method: "PUT",
                body: {
                    collections: collections,
                    deleteMissing: deleteMissing,
                },
            },
            options,
        );

        return this.client.send(this.baseCrudPath + "/import", options).then(() => true);
    }

    /**
     * Deletes all records associated with the specified collection.
     *
     * @throws {ClientResponseError}
     */
    async truncate(collectionIdOrName: string, options?: CommonOptions): Promise<true> {
        options = Object.assign(
            {
                method: "DELETE",
            },
            options,
        );

        return this.client
            .send(
                this.baseCrudPath +
                    "/" +
                    encodeURIComponent(collectionIdOrName) +
                    "/truncate",
                options,
            )
            .then(() => true);
    }

    /**
     * Returns type indexed map with scaffolded collection models
     * populated with their default field values.
     *
     * @throws {ClientResponseError}
     */
    async getScaffolds(
        options?: CommonOptions,
    ): Promise<{ [key: string]: CollectionModel }> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send(this.baseCrudPath + "/meta/scaffolds", options);
    }

    /**
     * Returns a list with all configurable OAuth2 providers.
     *
     * @throws {ClientResponseError}
     */
    async getAllOAuth2Providers(
        options?: CommonOptions,
    ): Promise<Array<ConfigurableOAuth2Provider>> {
        options = Object.assign(
            {
                method: "GET",
            },
            options,
        );

        return this.client.send(this.baseCrudPath + "/meta/oauth2-providers", options);
    }

    /**
     * Executes the specified view query and returns a sample of the resulting records.
     *
     * @throws {ClientResponseError}
     */
    async dryRunViewQuery(
        query: string,
        options?: CommonOptions,
    ): Promise<Array<{ [key: string]: any }>> {
        options = Object.assign(
            {
                method: "POST",
                body: { query },
            },
            options,
        );

        return this.client.send(this.baseCrudPath + "/meta/dry-run-view", options);
    }
}
