/**
 * Clone context interface for logging and tracking
 */
export interface CloneContext {
  command: string;
  module: string;
  email: string;
  sessionId?: string;
  authenticationMethod?: string;
}
