import { CLIProgressManager, configHandler } from '@contentstack/cli-utilities';
import { ConfigType, ModuleConstructorParam } from '../types';

export default abstract class BaseClass {
  protected progressManager: CLIProgressManager | null = null;
  protected currentModuleName: string = '';
  public config: ConfigType;

  constructor({ config }: ModuleConstructorParam) {
    this.config = config;
  }

  /**
   * Create simple progress manager
   */
  protected createSimpleProgress(moduleName: string, total?: number): CLIProgressManager {
    this.currentModuleName = moduleName;
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;
    this.progressManager = CLIProgressManager.createSimple(moduleName, total, showConsoleLogs);
    return this.progressManager;
  }

  /**
   * Create nested progress manager
   */
  protected createNestedProgress(moduleName: string): CLIProgressManager {
    this.currentModuleName = moduleName;
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;
    this.progressManager = CLIProgressManager.createNested(moduleName, showConsoleLogs);
    return this.progressManager;
  }

  /**
   * Complete progress manager
   */
  protected completeProgress(success: boolean = true, error?: string): void {
    this.progressManager?.complete(success, error);
    this.progressManager = null;
  }

  /**
   * Execute action with loading spinner (if console logs are disabled)
   */
  protected async withLoadingSpinner<T>(message: string, action: () => Promise<T>): Promise<T> {
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;

    if (showConsoleLogs) {
      // If console logs are enabled, don't show spinner, just execute the action
      return await action();
    }
    return await CLIProgressManager.withLoadingSpinner(message, action);
  }
}

