export class Logger {
  constructor(public readonly name: string) {}

  debug(message: string, ...args: any[]) {
    console.debug(`[${this.name}] ${message}`, ...args);
  }

  info(message: string, ...args: any[]) {
    console.info(`[${this.name}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[${this.name}] ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    console.error(`[${this.name}] ${message}`, ...args);
  }
}
