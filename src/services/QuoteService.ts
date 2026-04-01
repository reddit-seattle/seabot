import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { Logger } from "../utils/logger";
import { Environment } from "../utils/constants";

export interface Quote {
  id?: string;
  text: string;
  author?: string;
  server?: string;
  channelId?: string;
  messageId?: string;
}

const CONTAINER_NAME = "quotes";
const BLOB_NAME = "quotes.json";
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

export class QuoteService {
  private static _quotes: Quote[] = [];
  private static _isLoaded = false;
  private static _isLoading = false;

  static get isLoaded(): boolean {
    return this._isLoaded;
  }

  static get quoteCount(): number {
    return this._quotes.length;
  }

  static async initialize(): Promise<boolean> {
    if (this._isLoaded || this._isLoading) {
      return this._isLoaded;
    }

    try {
      this._isLoading = true;
      await this.loadQuotesFromBlob();
      this._isLoaded = true;
      Logger.info(
        `QuoteService initialized with ${this._quotes.length} quotes`,
      );
      return true;
    } catch (error) {
      Logger.error("Failed to initialize QuoteService:", error);
      this._isLoaded = false;
      return false;
    } finally {
      this._isLoading = false;
    }
  }

  private static createBlobServiceClient(): BlobServiceClient {
    const account = Environment.blobStorageAccount;
    if (!account) {
      throw new Error("BLOB_STORAGE_ACCOUNT environment variable not set");
    }

    const accountUrl = `https://${account}.blob.core.windows.net`;

    // Use storage key for local dev if provided, otherwise managed identity
    if (Environment.blobStorageKey) {
      Logger.info("Using storage key auth for blob access");
      const credential = new StorageSharedKeyCredential(
        account,
        Environment.blobStorageKey,
      );
      return new BlobServiceClient(accountUrl, credential);
    }

    Logger.info("Using DefaultAzureCredential (managed identity) for blob access");
    return new BlobServiceClient(accountUrl, new DefaultAzureCredential());
  }

  private static async loadQuotesFromBlob(): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          Logger.warn(`Retrying blob fetch (attempt ${attempt + 1}/${MAX_RETRIES + 1}) after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const blobServiceClient = this.createBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        const blobClient = containerClient.getBlobClient(BLOB_NAME);

        const downloadResponse = await blobClient.download(0);
        const body = await this.streamToString(downloadResponse.readableStreamBody!);
        const data = JSON.parse(body) as unknown;

        this.parseQuoteData(data);

        if (this._quotes.length === 0) {
          throw new Error("No quotes found in blob");
        }

        Logger.info(`Loaded ${this._quotes.length} quotes from blob`);
        return;
      } catch (error) {
        lastError = error as Error;
        Logger.warn(`Blob fetch attempt ${attempt + 1} failed:`, error);
      }
    }

    throw lastError ?? new Error("Failed to load quotes after retries");
  }

  private static async streamToString(
    stream: NodeJS.ReadableStream,
  ): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  private static parseQuoteData(data: unknown): void {
    if (Array.isArray(data)) {
      this._quotes = data.map((item) => {
        if (typeof item === "string") {
          return { text: item };
        }
        return item as Quote;
      });
    } else if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      const quotesArray = (obj.quotes || obj.results || []) as unknown[];
      this._quotes = quotesArray.map((item) => {
        if (typeof item === "string") {
          return { text: item };
        }
        return item as Quote;
      });
    }
  }

  static getRandomQuote(): Quote | null {
    if (!this._isLoaded || this._quotes.length === 0) {
      return null;
    }
    return this._quotes[Math.floor(Math.random() * this._quotes.length)];
  }

  static getQuoteByIndex(index: number): Quote | null {
    if (index < 0 || index >= this._quotes.length) {
      return null;
    }
    return this._quotes[index];
  }

  static getQuoteCount(): number {
    return this._quotes.length;
  }

  static iterateQuotes(callback: (quote: Quote, index: number) => void): void {
    this._quotes.forEach(callback);
  }
}
