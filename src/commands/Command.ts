export interface CommandConfiguration {
  name: string;
  description: string;
  help?: string;
  adminOnly?: boolean;
}

export abstract class Command {
  protected configuration: CommandConfiguration;

  public abstract canExecute(...args: any[]): any;
  public abstract execute(...args: any[]): any;

  public get name() {
    return this.configuration.name;
  }
  public get adminOnly() {
    return this.configuration.adminOnly;
  }
  public get description() {
    return this.configuration.description;
  }
  public get help() {
    return this.configuration.help ?? this.configuration.description;
  }

  constructor(configuration: CommandConfiguration) {
    this.configuration = configuration;
  }
}
