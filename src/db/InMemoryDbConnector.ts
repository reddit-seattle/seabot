import { ItemDefinition } from "@azure/cosmos";

import IDatabase from "./IDatabase";

export default class InMemoryDbConnector<T extends ItemDefinition>
  implements IDatabase<T>
{
  private _memoryStore: T[] = new Array<T>();

  async init() {}

  async find(querySpec: string) {
    return this._memoryStore.filter((x) => x.id === querySpec);
  }

  async addItem(item: T) {
    this._memoryStore.push(item);
    return item;
  }
  async getItem(itemId: string) {
    return this._memoryStore.find((x) => x.id === itemId);
  }

  async deleteItem(itemId: string) {
    const index = this._memoryStore.findIndex((x) => x.id === itemId);
    if (index === -1) {
      return undefined;
    }

    const item = this._memoryStore[index];
    this._memoryStore.splice(index, 1);
    return item;
  }

  async getLastItem() {
    if (this._memoryStore.length === 0) {
      return undefined;
    }

    return this._memoryStore[this._memoryStore.length - 1];
  }
}
