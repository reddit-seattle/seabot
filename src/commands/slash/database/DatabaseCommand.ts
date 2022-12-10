import { CosmosClient, ItemDefinition } from "@azure/cosmos";

import DBConnector from "../../../db/DBConnector";
import IDatabase from "../../../db/IDatabase";
import InMemoryDbConnector from "../../../db/InMemoryDbConnector";
import SlashCommand, { SlashCommandConfiguration } from "../SlashCommand";

import { Database } from "../../../utils/constants";
import { cosmosClient } from "../../../db/cosmosClient";

type ConnectorType = "Awards" | "Incidents" | "MessageTelemetry";

export class DatabaseCommand<
  ModelType extends ItemDefinition
> extends SlashCommand {
  private static connectorCache = new Map<string, any>();

  public static getConnector<ModelType extends ItemDefinition>(
    connectorType: ConnectorType
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
        connectorType
      );
    }

    connector.init().catch((reason) => {
      console.error(
        `Failed to connect to database container of type ${connectorType}`
      );
      console.error(reason);
    });

    return connector;
  }

  private _connector;

  public get connector() {
    return this._connector;
  }

  constructor(
    connectorType: ConnectorType,
    configuration: SlashCommandConfiguration
  ) {
    super(configuration);
    this._connector = DatabaseCommand.getConnector<ModelType>(connectorType);
  }

  public execute(...args: any[]) {
    super.execute(...args);
  }
}
