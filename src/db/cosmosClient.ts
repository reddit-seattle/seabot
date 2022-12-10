import { CosmosClient } from "@azure/cosmos";
import { Environment } from "../utils/constants";

let cosmosClient: CosmosClient | undefined;
if (Environment.cosmosHost && Environment.cosmosHost !== "") {
  try {
    cosmosClient = new CosmosClient({
      endpoint: Environment.cosmosHost,
      key: Environment.cosmosAuthKey,
    });
  } catch (ex: any) {
    console.log(
      `Error connecting to cosmos instance, proceeding without Cosmos:\n${ex}`
    );
  }
} else {
  console.log(
    "Cosmos environment variables not set. Proceeding without Cosmos."
  );
}

export { cosmosClient };
