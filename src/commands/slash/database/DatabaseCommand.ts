import { CosmosClient, ItemDefinition } from "@azure/cosmos";

import DBConnector from "../../../db/DBConnector";
import IDatabase from "../../../db/IDatabase";
import InMemoryDbConnector from "../../../db/InMemoryDbConnector";
import SlashCommand, { SlashCommandConfiguration } from "../SlashCommand";

import { Database } from "../../../utils/constants";
import { cosmosClient } from "../../../db/cosmosClient";

type ConnectorType = "Awards" | "Incidents" | "MessageTelemetry";

export class DatabaseCommand<ModelType extends ItemDefinition> extends SlashCommand {
    private static  connectorCache = new Map<string, IDatabase<unknown>>();

    public static getConnector<ModelType extends ItemDefinition>(connectorType: ConnectorType) : IDatabase<ModelType>  {

        if (DatabaseCommand.connectorCache.has(connectorType) ) {
            const connector = (DatabaseCommand.connectorCache as Map<string, IDatabase<ModelType>>).get(connectorType)
            if (connector) {
                return connector
            }
        }

        let connector: IDatabase<ModelType>;
        if (!cosmosClient) {
            connector = new InMemoryDbConnector<ModelType>();
        } else {
            connector = new DBConnector<ModelType>(cosmosClient as CosmosClient, Database.DATABASE_ID, connectorType);
        }

        connector.init().catch((reason) => {
            console.error(`Failed to connect to database container of type ${connectorType}`);
            console.error(reason);
        });

        return connector;
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
}
