import { CrudService } from "@/services/CrudService";
import { CollectionModel } from "@/tools/dtos";
import { CommonOptions } from "@/tools/options";

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
}
