import { ProcessProgress, ProgressResult } from '../interfaces';

export interface ProgressCalculationStrategy {
  calculate(processes: Map<string, ProcessProgress>): ProgressResult | null;
}

export class DefaultProgressStrategy implements ProgressCalculationStrategy {
  calculate(): ProgressResult | null {
    return null; // Use default aggregated counting
  }
}

export class PrimaryProcessStrategy implements ProgressCalculationStrategy {
  constructor(private primaryProcessName: string) {}
  
  calculate(processes: Map<string, ProcessProgress>): ProgressResult | null {
    const primaryProcess = processes.get(this.primaryProcessName);
    if (!primaryProcess) return null;
    
    return {
      total: primaryProcess.total,
      success: primaryProcess.successCount,
      failures: primaryProcess.failureCount
    };
  }
}

export class CustomProgressStrategy implements ProgressCalculationStrategy {
  constructor(private calculator: (processes: Map<string, ProcessProgress>) => ProgressResult | null) {}
  
  calculate(processes: Map<string, ProcessProgress>): ProgressResult | null {
    return this.calculator(processes);
  }
}

// Registry
export class ProgressStrategyRegistry {
  private static strategies = new Map<string, ProgressCalculationStrategy>();
  
  static register(moduleName: string, strategy: ProgressCalculationStrategy): void {
    this.strategies.set(moduleName.toUpperCase(), strategy);
  }
  
  static get(moduleName: string): ProgressCalculationStrategy {
    return this.strategies.get(moduleName.toUpperCase()) || new DefaultProgressStrategy();
  }
  
  static clear(): void {
    this.strategies.clear();
  }
  
  static has(moduleName: string): boolean {
    return this.strategies.has(moduleName.toUpperCase());
  }
  
  static getAllRegistered(): string[] {
    return Array.from(this.strategies.keys());
  }
}
