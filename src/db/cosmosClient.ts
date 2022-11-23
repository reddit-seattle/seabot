import { CosmosClient } from "@azure/cosmos";
import { Environment } from "../utils/constants";

let cosmosClient: CosmosClient | undefined;
if (Environment.cosmosHost && Environment.cosmosHost !== "") {
    cosmosClient = new CosmosClient({
        endpoint: Environment.cosmosHost,
        key: Environment.cosmosAuthKey,
    });
} else {
    console.log("Cosmos environment variables not set. Proceeding without Cosmos.");
}

export { cosmosClient };
