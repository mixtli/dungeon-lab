import chalk from 'chalk';

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
  success: (message: string, ...args: any[]) => void;
}

class ConsoleLogger implements Logger {
  private verbose: boolean = false;

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(chalk.red('✖'), message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (this.verbose) {
      console.log(chalk.gray('▸'), message, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green('✔'), message, ...args);
  }
}

export const logger = new ConsoleLogger();