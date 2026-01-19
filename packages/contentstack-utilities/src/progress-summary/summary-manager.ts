import chalk from 'chalk';
import { ModuleResult, SummaryOptions } from '../interfaces/index';
import { getLogPath } from '../logger/log';

export default class SummaryManager {
  private modules: Map<string, ModuleResult> = new Map();
  private operationName: string;
  private context: any;
  private operationStartTime: number;
  private branchName: string;

  constructor({ operationName, context }: SummaryOptions) {
    this.operationName = operationName;
    this.context = context;
    this.operationStartTime = Date.now();
    this.branchName = context?.branchName || '';
  }

  getModules() {
    return this.modules;
  }

  registerModule(moduleName: string, totalItems: number = 0): void {
    this.modules.set(moduleName, {
      name: moduleName,
      status: 'pending',
      totalItems,
      successCount: 0,
      failureCount: 0,
      failures: [],
      processes: [],
    });
  }

  startModule(moduleName: string): void {
    const module = this.modules.get(moduleName);
    if (module) {
      module.status = 'running';
      module.startTime = Date.now();
    }
  }

  completeModule(moduleName: string, success: boolean = true, error?: string): void {
    const module = this.modules.get(moduleName);
    if (module) {
      module.status = success ? 'completed' : 'failed';
      module.endTime = Date.now();

      if (!success && error) {
        module.failures.push({ item: 'module', error });
      }
    }
  }

  /**
   * Register process data for strategy calculations
   */
  registerProcessData(moduleName: string, processName: string, processData: any): void {
    const module = this.modules.get(moduleName);
    if (module) {
      if (!module.processes) {
        module.processes = [];
      }

      const existingIndex = module.processes.findIndex((p: any) => p.processName === processName);
      if (existingIndex >= 0) {
        module.processes[existingIndex] = { processName, ...processData };
      } else {
        module.processes.push({ processName, ...processData });
      }
    }
  }

  updateModuleProgress(moduleName: string, success: boolean, itemName: string, error?: string): void {
    const module = this.modules.get(moduleName);
    if (module) {
      if (success) {
        module.successCount++;
      } else {
        module.failureCount++;
        if (error) {
          module.failures.push({ item: itemName, error });
        }
      }
    }
  }

  printFinalSummary(): void {
    const operationEndTime = Date.now();
    const totalDuration = operationEndTime - this.operationStartTime;

    // Overall Statistics
    const totalModules = this.modules.size;
    const completedModules = Array.from(this.modules.values()).filter((m) => m.status === 'completed').length;
    const failedModules = Array.from(this.modules.values()).filter((m) => m.status === 'failed').length;
    const totalItems = Array.from(this.modules.values()).reduce((sum, m) => sum + m.successCount + m.failureCount, 0);
    const totalSuccess = Array.from(this.modules.values()).reduce((sum, m) => sum + m.successCount, 0);
    const totalFailures = Array.from(this.modules.values()).reduce((sum, m) => sum + m.failureCount, 0);

    console.log('\n' + chalk.bold('='.repeat(80)));
    console.log(chalk.bold(`${this.operationName} SUMMARY`));
    console.log('\n' + chalk.bold('Overall Statistics:'));
    console.log(`  Total ${this.operationName} Time: ${chalk.cyan(this.formatDuration(totalDuration))}`);
    console.log(`  Modules Processed: ${chalk.cyan(completedModules)}/${chalk.cyan(totalModules)}`);
    console.log(
      `  Items Processed: ${chalk.green(totalSuccess)} success, ${chalk.red(totalFailures)} failed of ${chalk.cyan(
        totalItems,
      )} total`,
    );
    console.log(`  Success Rate: ${chalk.cyan(this.calculateSuccessRate(totalSuccess, totalItems))}%`);

    // Module Details
    console.log('\n' + chalk.bold('Module Details:'));
    console.log(chalk.gray('-'.repeat(80)));

    Array.from(this.modules.values()).forEach((module) => {
      const status = this.getStatusIcon(module.status);
      const totalCount = module.successCount + module.failureCount;
      const duration =
        module.endTime && module.startTime ? this.formatDuration(module.endTime - module.startTime) : 'N/A';

      const successRate = this.calculateSuccessRate(module.successCount, totalCount);

      console.log(
        `${status} ${module.name.padEnd(20)} | ` +
          `${String(module.successCount).padStart(4)}/${String(totalCount).padStart(4)} items | ` +
          `${this.formatSuccessRate(successRate).padStart(6)} | ` +
          `${duration.padStart(8)}`,
      );
    });

    // Final Status
    console.log('\n' + chalk.bold('Final Status:'));
    if (!this.hasFailures() && failedModules === 0) {
      console.log(chalk.bold.green(`✅ ${this.operationName} completed successfully!`));
    } else if (this.hasFailures() || failedModules > 0) {
      console.log(
        chalk.bold.yellow(`⚠️ ${this.operationName} completed with failures, see the logs for more details.`),
      );
    } else {
      console.log(chalk.bold.red(`❌ ${this.operationName} failed`));
    }

    console.log(chalk.bold('='.repeat(80)));
    console.log(chalk.bold('='.repeat(80)));

    // Simple failure summary with log reference
    this.printFailureSummaryWithLogReference();
  }

  /**
   * Check if there are any failures across all modules
   */
  hasFailures(): boolean {
    return Array.from(this.modules.values()).some((m) => m.failures.length > 0 || m.failureCount > 0);
  }

  private printFailureSummaryWithLogReference(): void {
    const modulesWithFailures = Array.from(this.modules.values()).filter((m) => m.failures.length > 0);

    if (modulesWithFailures.length === 0) return;

    const totalFailures = modulesWithFailures.reduce((sum, m) => sum + m.failures.length, 0);

    console.log('\n' + chalk.bold.red('Failure Summary:'));
    console.log(chalk.red('-'.repeat(50)));

    modulesWithFailures.forEach((module) => {
      console.log(`${chalk.bold.red('✗')} ${chalk.bold(module.name)}: ${chalk.red(module.failures.length)} failures`);

      // Show just first 2-3 failures briefly
      const preview = module.failures.slice(0, 2);
      preview.forEach((failure) => {
        console.log(`    • ${chalk.gray(failure.item)}`);
      });

      if (module.failures.length > 2) {
        console.log(`    ${chalk.gray(`... and ${module.failures.length - 2} more`)}`);
      }
    });

    console.log(chalk.blue('\n📋 For detailed error information, check the log files:'));
    //console.log(chalk.blue(`   ${getLogPath()}`));
    console.log(chalk.gray('   Recent errors are logged with full context and stack traces.'));
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return chalk.green('✓');
      case 'failed':
        return chalk.red('✗');
      case 'running':
        return chalk.yellow('●');
      case 'pending':
        return chalk.gray('○');
      default:
        return chalk.gray('?');
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  private calculateSuccessRate(success: number, total: number): string {
    if (total === 0) return '0';
    return ((success / total) * 100).toFixed(1);
  }

  private formatSuccessRate(rate: string): string {
    if (rate === '100.0') {
      return '100%';
    } else if (parseFloat(rate) >= 10) {
      return `${rate}%`;
    } else {
      return ` ${rate}%`;
    }
  }
}
