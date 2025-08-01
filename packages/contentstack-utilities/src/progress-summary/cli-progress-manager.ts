import chalk from 'chalk';
import ora, { Ora } from 'ora';
import ProgressBar from 'cli-progress';
import SummaryManager from './summary-manager';
import { ProcessProgress, ProgressManagerOptions, Failure } from '../interfaces';
import { configHandler } from '..';

interface ProgressCallback {
  onModuleStart?: (moduleName: string) => void;
  onModuleComplete?: (moduleName: string, success: boolean, error?: string) => void;
  onProgress?: (moduleName: string, success: boolean, itemName: string, error?: string) => void;
}

export default class CLIProgressManager {
  private static globalSummary: SummaryManager | null = null;

  private showConsoleLogs: boolean;
  private total: number;
  private moduleName: string;
  private enableNestedProgress: boolean;
  private successCount: number;
  private failureCount: number;
  private failures: Failure[];

  // Single progress tracking
  private spinner: Ora | null;
  private progressBar: ProgressBar.SingleBar | null;

  // Multi-process tracking
  private processes: Map<string, ProcessProgress>;
  private multiBar: ProgressBar.MultiBar | null;
  private currentProcess: string | null;

  // Callbacks for external integration
  private callbacks: ProgressCallback;
  private branchName: string;

  constructor({
    showConsoleLogs = false,
    total = 0,
    moduleName = 'Module',
    enableNestedProgress = false,
  }: ProgressManagerOptions = {}) {
    this.showConsoleLogs = showConsoleLogs;
    this.total = total;
    this.moduleName = moduleName;
    this.enableNestedProgress = enableNestedProgress;

    this.successCount = 0;
    this.failureCount = 0;
    this.failures = [];

    this.spinner = null;
    this.progressBar = null;
    this.processes = new Map();
    this.multiBar = null;
    this.currentProcess = null;
    this.callbacks = {};
    this.branchName = ''; // Default branch name

    this.initializeProgress();
    this.setupGlobalSummaryIntegration();
  }

  /**
   * Initialize global summary manager for the entire operation
   */
  static initializeGlobalSummary(operationName: string, branchName: string): SummaryManager {
    CLIProgressManager.globalSummary = new SummaryManager({ operationName, context: { branchName } });

    // Only show header if console logs are disabled (progress UI mode)
    if (!configHandler.get('log')?.showConsoleLogs) {
      CLIProgressManager.displayOperationHeader(operationName, branchName);
    }

    return CLIProgressManager.globalSummary;
  }

  /**
   * Display operation header with branch information
   */
  static displayOperationHeader(operationName: string, branchName: string): void {
    const branchInfo = branchName ? `EXPORTING "${branchName.toUpperCase()}" BRANCH CONTENT` : '';
    console.log('\n' + chalk.bold('='.repeat(80)));
    console.log(chalk.bold.cyan(`                   ${operationName.toUpperCase()}`));
    if (branchInfo) {
      console.log(chalk.bold.white(`                   ${branchInfo}`));
    }
    console.log(chalk.bold('='.repeat(80)) + '\n');
  }

  /**
   * Print the final summary for all modules
   */
  static printGlobalSummary(): void {
    CLIProgressManager.globalSummary?.printFinalSummary();
  }

  /**
   * Clear global summary (for cleanup)
   */
  static clearGlobalSummary(): void {
    CLIProgressManager.globalSummary = null;
  }

  /**
   * Create a simple progress manager (no nested processes)
   */
  static createSimple(moduleName: string, total?: number, showConsoleLogs = false): CLIProgressManager {
    return new CLIProgressManager({
      moduleName: moduleName.toUpperCase(),
      total: total || 0,
      showConsoleLogs,
      enableNestedProgress: false,
    });
  }

  /**
   * Create a nested progress manager (with sub-processes)
   */
  static createNested(moduleName: string, showConsoleLogs = false): CLIProgressManager {
    return new CLIProgressManager({
      moduleName: moduleName.toUpperCase(),
      total: 0,
      showConsoleLogs,
      enableNestedProgress: true,
    });
  }

  /**
   * Show a loading spinner before initializing progress
   */
  static async withLoadingSpinner<T>(message: string, asyncOperation: () => Promise<T>): Promise<T> {
    const spinner = ora(message).start();
    try {
      const result = await asyncOperation();
      spinner.stop();
      return result;
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  private setupGlobalSummaryIntegration(): void {
    // Auto-register with global summary if it exists
    if (CLIProgressManager.globalSummary) {
      this.setCallbacks({
        onModuleStart: (name) => {
          CLIProgressManager.globalSummary?.registerModule(name, this.total);
          CLIProgressManager.globalSummary?.startModule(name);
        },
        onModuleComplete: (name, success, error) => {
          CLIProgressManager.globalSummary?.completeModule(name, success, error);
        },
        onProgress: (name, success, itemName, error) => {
          CLIProgressManager.globalSummary?.updateModuleProgress(name, success, itemName, error);
        },
      });

      // Trigger module start
      this.callbacks.onModuleStart?.(this.moduleName);
    }
  }

  /**
   * Set callbacks for external integration
   */
  setCallbacks(callbacks: ProgressCallback): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private initializeProgress(): void {
    if (this.showConsoleLogs) {
      return;
    }

    if (this.enableNestedProgress) {
      // Initialize multi-bar for nested progress tracking
      this.multiBar = new ProgressBar.MultiBar(
        {
          clearOnComplete: false,
          hideCursor: true,
          format: ' {label} |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} | {status}',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
        },
        ProgressBar.Presets.shades_classic,
      );

      if (!this.showConsoleLogs) {
        console.log(chalk.bold.cyan(`\n${this.moduleName}:`));
      }
    } else if (this.total > 0) {
      if (!this.showConsoleLogs) {
        console.log(chalk.bold.cyan(`\n${this.moduleName}:`));
      }

      this.progressBar = new ProgressBar.SingleBar({
        format: ' {label} |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} | {status}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
      });
      this.progressBar.start(this.total, 0, {
        label: chalk.gray(`   └─ ${this.moduleName}`.padEnd(18)),
        status: chalk.gray('Starting...'),
        percentage: '0',
      });
    } else {
      this.spinner = ora(`${chalk.bold(this.moduleName)}: Processing...`).start();
    }
  }

  /**
   * Add a new process to track (for nested progress)
   */
  addProcess(processName: string, total: number): this {
    if (!this.enableNestedProgress || !this.multiBar) return this;

    const process: ProcessProgress = {
      name: processName,
      total,
      current: 0,
      status: 'pending',
      successCount: 0,
      failureCount: 0,
      failures: [],
    };

    if (!this.showConsoleLogs) {
      const indentedLabel = `  ├─ ${processName}`.padEnd(18);
      process.progressBar = this.multiBar.create(total, 0, {
        label: chalk.gray(indentedLabel),
        status: chalk.gray('Pending'),
        percentage: '0',
      });
    }

    this.processes.set(processName, process);
    return this;
  }

  /**
   * Start a specific process
   */
  startProcess(processName: string): this {
    if (!this.enableNestedProgress) return this;

    const process = this.processes.get(processName);
    if (process) {
      process.status = 'active';
      if (!this.showConsoleLogs && process.progressBar) {
        const indentedLabel = `  ├─ ${processName}`.padEnd(18);
        process.progressBar.update(0, {
          label: chalk.yellow(indentedLabel),
          status: chalk.yellow(this.moduleName),
          percentage: '0',
        });
      }
      this.currentProcess = processName;
    }
    return this;
  }

  /**
   * Complete a specific process
   */
  completeProcess(processName: string, success: boolean = true): this {
    if (!this.enableNestedProgress) return this;

    const process = this.processes.get(processName);
    if (process) {
      process.status = success ? 'completed' : 'failed';
      if (!this.showConsoleLogs && process.progressBar) {
        const percentage = Math.round((process.current / process.total) * 100);
        const statusText = success
          ? chalk.green(`✓ Complete (${process.successCount}/${process.current})`)
          : chalk.red(`✗ Failed (${process.successCount}/${process.current})`);
        const indentedLabel = `  ├─ ${processName}`.padEnd(18);
        process.progressBar.update(process.total, {
          label: success ? chalk.green(indentedLabel) : chalk.red(indentedLabel),
          status: statusText,
          percentage: percentage.toString(),
        });
      }
    }
    return this;
  }

  /**
   * Update status message
   */
  updateStatus(message: string, processName?: string): this {
    if (!this.showConsoleLogs) {
      if (this.enableNestedProgress && processName) {
        const process = this.processes.get(processName);
        if (process && process.progressBar) {
          const percentage = Math.round((process.current / process.total) * 100);
          const indentedLabel = `  ├─ ${processName}`.padEnd(18);
          process.progressBar.update(process.current, {
            label: chalk.yellow(indentedLabel),
            status: chalk.yellow(message),
            percentage: percentage.toString(),
          });
        }
      } else if (this.progressBar) {
        const percentage = Math.round(this.progressBar.getProgress() * 100);
        this.progressBar.update(this.progressBar.getProgress() * this.total, {
          label: chalk.yellow(`   └─ ${this.moduleName}`.padEnd(18)),
          status: chalk.yellow(message),
          percentage: percentage.toString(),
        });
      } else if (this.spinner) {
        this.spinner.text = `${chalk.bold(this.moduleName)}: ${message}`;
      }
    }
    return this;
  }

  /**
   * Update progress
   */
  tick(success = true, itemName = '', errorMessage: string | null = null, processName?: string): this {
    const targetProcess = processName || this.currentProcess;

    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
      this.failures.push({
        item: itemName,
        error: errorMessage,
        process: targetProcess || undefined,
      });
    }

    // Trigger callback
    this.callbacks.onProgress?.(this.moduleName, success, itemName, errorMessage || undefined);

    // Update nested progress if enabled and console logs are disabled
    if (this.enableNestedProgress && targetProcess) {
      const process = this.processes.get(targetProcess);
      if (process) {
        process.current++;
        if (success) {
          process.successCount++;
        } else {
          process.failureCount++;
          process.failures.push({ item: itemName, error: errorMessage });
        }

        // Only update progress bar if console logs are disabled
        if (!this.showConsoleLogs && process.progressBar) {
          const percentage = Math.round((process.current / process.total) * 100);
          const statusText = `${process.successCount}✓ ${process.failureCount}✗`;

          const indentedLabel = `  ├─ ${targetProcess}`.padEnd(18);
          process.progressBar.increment(1, {
            label: chalk.cyan(indentedLabel),
            status: chalk.cyan(statusText),
            percentage: percentage.toString(),
          });
        }
      }
    } else {
      // Update single progress bar or spinner only if console logs are disabled
      if (!this.showConsoleLogs) {
        if (this.progressBar) {
          const percentage = Math.round(((this.successCount + this.failureCount) / this.total) * 100);
          const totalProcessed = this.successCount + this.failureCount;

          // Show completion status when finished, otherwise show running count
          const statusText =
            totalProcessed >= this.total
              ? this.failureCount === 0
                ? chalk.green(`✓ Complete (${this.successCount}/${totalProcessed})`)
                : chalk.yellow(`✓ Complete (${this.successCount}/${totalProcessed})`)
              : chalk.cyan(`${this.successCount}✓ ${this.failureCount}✗`);

          const labelColor =
            totalProcessed >= this.total ? (this.failureCount === 0 ? chalk.green : chalk.yellow) : chalk.cyan;

          this.progressBar.increment(1, {
            label: labelColor(`   └─ ${this.moduleName}`.padEnd(18)),
            status: statusText,
            percentage: percentage.toString(),
          });
        } else if (this.spinner) {
          const total = this.successCount + this.failureCount;
          this.spinner.text = `${chalk.bold(this.moduleName)}: ${total} items (${this.successCount}✓ ${
            this.failureCount
          }✗)`;
        }
      }
    }
    return this;
  }

  /**
   * Complete the entire module
   */
  complete(success: boolean = true, error?: string): this {
    this.stop();
    this.callbacks.onModuleComplete?.(this.moduleName, success, error);
    return this;
  }

  /**
   * Log message (respects showConsoleLogs mode)
   */
  log(msg: string): void {
    if (this.showConsoleLogs) {
      console.log(msg);
    }
  }

  /**
   * Stop all progress indicators
   */
  stop(): void {
    // Only stop progress bars if they were initialized (console logs disabled)
    if (!this.showConsoleLogs) {
      if (this.multiBar) {
        this.multiBar.stop();
      }
      if (this.progressBar) {
        this.progressBar.stop();
      }
      if (this.spinner) {
        this.spinner.stop();
      }
      this.printSummary();
    }
  }

  private printSummary(): void {
    if (!this.enableNestedProgress) {
      // Simple summary for single progress
      this.log('\n' + chalk.bold(`${this.moduleName} Summary:`));
      this.log(`✓ Success: ${chalk.green(this.successCount)}`);
      this.log(`✗ Failures: ${chalk.red(this.failureCount)}`);
      return;
    }

    // Detailed summary for nested progress
    this.log('\n' + chalk.bold(`${this.moduleName} Detailed Summary:`));

    for (const [processName, process] of this.processes) {
      const status =
        process.status === 'completed'
          ? '✓'
          : process.status === 'failed'
          ? '✗'
          : process.status === 'active'
          ? '●'
          : '○';

      this.log(
        `  ${status} ${processName}: ${process.successCount}✓ ${process.failureCount}✗ (${process.current}/${process.total})`,
      );

      // Show first few failures for this process
      if (process.failures.length > 0) {
        process.failures.slice(0, 3).forEach((failure) => {
          this.log(`    ✗ ${failure.item}: ${failure.error}`);
        });
        if (process.failures.length > 3) {
          this.log(`    ... and ${process.failures.length - 3} more failures`);
        }
      }
    }

    this.log(`\nOverall: ${this.successCount}✓ ${this.failureCount}✗`);
  }
}
