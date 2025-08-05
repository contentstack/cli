import { LogFn } from '../../types';
import { $t } from '../../messages';
import { IVariantLogger } from './interfaces';

export class VariantLogger implements IVariantLogger {
  constructor(private readonly log: LogFn) {}

  logError(message: string, args: Record<string, string>): void {
    this.log($t(message, args), 'error');
  }

  logInfo(message: string, args: Record<string, string>): void {
    this.log($t(message, args), 'info');
  }
}