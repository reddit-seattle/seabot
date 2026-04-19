import { CosmosClient, ItemDefinition } from "@azure/cosmos";

import DBConnector from "../../../db/DBConnector";
import IDatabase from "../../../db/IDatabase";
import InMemoryDbConnector from "../../../db/InMemoryDbConnector";
import SlashCommand, { SlashCommandConfiguration } from "../SlashCommand";

import { cosmosClient } from "../../../db/cosmosClient";
import { Database } from "../../../utils/constants";

type ConnectorType = "Incidents";

export class DatabaseCommand<
  ModelType extends ItemDefinition,
> extends SlashCommand {
  private static connectorCache = new Map<string, any>();
  private static initFailures = new Set<string>();

  public static getConnector<ModelType extends ItemDefinition>(
    connectorType: ConnectorType,
  ) {
    if (DatabaseCommand.connectorCache.has(connectorType)) {
      return DatabaseCommand.connectorCache.get(connectorType);
    }

    let connector: IDatabase<ModelType>;
    if (!cosmosClient) {
      connector = new InMemoryDbConnector<ModelType>();
    } else {
      connector = new DBConnector<ModelType>(
        cosmosClient as CosmosClient,
        Database.DATABASE_ID,
        connectorType,
      );
    }

    connector.init().catch((reason) => {
      console.error(
        `Failed to connect to database container of type ${connectorType}`,
      );
      console.error(reason);
      DatabaseCommand.initFailures.add(connectorType);
    });

    DatabaseCommand.connectorCache.set(connectorType, connector);
    return connector;
  }

  private _connector;
  private _connectorType: ConnectorType;

  public get connector() {
    return this._connector;
  }

  public get isReady() {
    return !DatabaseCommand.initFailures.has(this._connectorType);
  }

  constructor(
    connectorType: ConnectorType,
    configuration: SlashCommandConfiguration,
  ) {
    super(configuration);
    this._connectorType = connectorType;
    this._connector = DatabaseCommand.getConnector<ModelType>(connectorType);
  }

  public execute(...args: any[]) {
    super.execute(...args);
  }
}
