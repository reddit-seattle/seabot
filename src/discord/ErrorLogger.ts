import IDatabase from "../db/IDatabase";
import { Logger } from "../utils/logger";

export default class ErrorLogger {
  private _connector: IDatabase<Error>;
  private _sessionErrors = new Array<Error>();
  public get sessionErrors() {
    return [...this._sessionErrors];
  }

  constructor(connector: IDatabase<Error>) {
    this._connector = connector;
    this._connector.init();
  }

  public async logError(error: Error): Promise<void> {
    Logger.error("Logging error to database", error.message);
    await this._connector.addItem(error);
    this._sessionErrors.push(error);
  }
}
