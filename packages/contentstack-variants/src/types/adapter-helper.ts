import messages from "../messages";

export interface AdapterHelperInterface<T, Client> {
  readonly config: T;
  readonly apiClient: Client;
  readonly messages: typeof messages;

  delay(ms: number): Promise<void>;
  constructQuery(query: Record<string, any>): string | void;
}
