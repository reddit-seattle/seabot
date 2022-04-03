// @ts-check
import { Container, CosmosClient, Database, Resource, SqlQuerySpec } from "@azure/cosmos"

export default class DBConnector<T> {

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
  constructor(cosmosClient: CosmosClient, databaseId: string, containerId: string) {
    this.client = cosmosClient
    this.databaseId = databaseId
    this.collectionId = containerId

    this.database = null
    this.container = null
  }

  async init() {
    const dbResponse = await this.client.databases.createIfNotExists({
      id: this.databaseId
    });
    this.database = dbResponse.database;
    const coResponse = await this.database.containers.createIfNotExists({
      id: this.collectionId
    })
    this.container = coResponse.container;
  }

  async find(querySpec: string | SqlQuerySpec) {
    if (!this.container) {
      throw new Error('Collection is not initialized.')
    }
    const { resources } = await this.container.items.query<T>(querySpec).fetchAll()
    return resources
  }

  async addItem(item: T) {
    if (!this.container) {
      throw new Error('Collection is not initialized.')
    }
    const { resource } = await this.container.items.create<T>(item)
    return resource;
  }

  async getItem(itemId: string) {
    if (!this.container) {
      throw new Error('Collection is not initialized.')
    }
    const { resource } = await this.container.item(itemId).read<T>()
    return resource
  }
  
  async deleteItem(itemId: string) {
    if (!this.container) {
      throw new Error('Collection is not initialized.')
    }
    const { resource } = await this.container.item(itemId).delete<T>();
    return resource;
  }
}
