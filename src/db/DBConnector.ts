// @ts-check
import {
  Container,
  CosmosClient,
  Database,
  ItemDefinition,
  SqlQuerySpec,
} from "@azure/cosmos";

import IDatabase from "./IDatabase";

export default class DBConnector<T extends ItemDefinition>
  implements IDatabase<T>
{
  private client: CosmosClient;
  private databaseId: string;
  private collectionId: string;
  private database: Database | null;
  private container: Container | null;

  /**
   * Manages reading, adding, and updating Tasks in Cosmos DB
   * @param {CosmosClient} cosmosClient
   * @param {string} databaseId
   * @param {string} containerId
   */
  constructor(
    cosmosClient: CosmosClient,
    databaseId: string,
    containerId: string
  ) {
    this.client = cosmosClient;
    this.databaseId = databaseId;
    this.collectionId = containerId;

    this.database = null;
    this.container = null;
  }

  async init() {
    const dbResponse = await this.client.databases.createIfNotExists({
      id: this.databaseId,
    });
    this.database = dbResponse.database;
    const coResponse = await this.database.containers.createIfNotExists({
      id: this.collectionId,
    });
    this.container = coResponse.container;
  }

  async find(querySpec: string | SqlQuerySpec) {
    if (!this.container) {
      throw new Error("Collection is not initialized.");
    }
    const { resources } = await this.container.items
      .query<T>(querySpec)
      .fetchAll();
    return resources;
  }

  async addItem(item: T) {
    if (!this.container) {
      throw new Error("Collection is not initialized.");
    }
    const { resource } = await this.container.items.create<T>(item);

    if (!resource) {
      throw new Error("Failed to add item to database collection.");
    }

    return resource;
  }

  async getItem(itemId: string) {
    if (!this.container) {
      throw new Error("Collection is not initialized.");
    }
    const { resource } = await this.container.item(itemId).read<T>();
    return resource;
  }

  async deleteItem(itemId: string) {
    if (!this.container) {
      throw new Error("Collection is not initialized.");
    }
    const { resource } = await this.container.item(itemId).delete<T>();
    return resource;
  }

  async getLastItem() {
    const items = await this.find({
      // query last incident by cosmos timestamp descending
      query: "SELECT TOP 1 * from c ORDER BY c._ts DESC",
    });

    return items?.[0];
  }
}
