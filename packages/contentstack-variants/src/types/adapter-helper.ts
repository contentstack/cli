export interface AdapterHelperInterface {
  delay(ms: number): Promise<void>;
  constructQuery(query: Record<string, any>): string | void;
}
