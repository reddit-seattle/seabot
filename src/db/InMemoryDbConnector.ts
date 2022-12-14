import { ItemDefinition } from "@azure/cosmos";

import IDatabase from "./IDatabase";

export default class InMemoryDbConnector<T extends ItemDefinition>
  implements IDatabase<T>
{
  private _memoryStore: T[] = new Array<T>();

  async init() {
    console.log("Initialized in-memory database connector");
  }

  async find(querySpec: string) {
    return this._memoryStore.filter((x) => x.id === querySpec);
  }

  async getLastItem() {
    if (this._memoryStore.length === 0) {
      return undefined;
    }
    const item = this._memoryStore[index];
    this._memoryStore.splice(index, 1);
    return item;
  }
}
