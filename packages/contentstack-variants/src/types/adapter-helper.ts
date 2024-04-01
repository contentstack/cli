import { ContentstackClient, HttpClient } from "@contentstack/cli-utilities";

export interface AdapterHelperInterface<T> {
  readonly config: T;
  apiClient: HttpClient | ContentstackClient;

  delay(ms: number): Promise<void>;
  constructQuery(query: Record<string, any>): string | void;
}
