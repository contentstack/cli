export interface AuditContext {
  command: string;
  module: string;
  email: string | undefined;
  sessionId: string | undefined;
  clientId?: string;
  authenticationMethod?: string;
  basePath: string;
}
