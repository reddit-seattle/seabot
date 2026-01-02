export class Logger {
  static info(message: string, ...args: any[]) {
    if (process.env.seabotDEBUG === "true") {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  static error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]) {
    if (process.env.seabotDEBUG === "true") {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  static dir(obj: any) {
    if (process.env.seabotDEBUG === "true") {
      console.dir(obj);
    }
  }
}
