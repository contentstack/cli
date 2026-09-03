/**
 * Console-log policy.
 *
 * Whether the CLI writes log lines to the console is a single process-wide
 * decision, resolved once from static inputs (env var → user config → the
 * plugin's `csdxConfig.showConsoleLogs` declaration → `false`) by the
 * `console-policy` init hook in the core CLI, before any command code runs.
 *
 * The default is `false`: the logger writes diagnostics to files and knows
 * nothing about the screen. Console output is an opt-in verbosity feature, and
 * because the progress UI and the log stream are two consumers of one terminal,
 * enabling it also turns the progress UI off (see `CLIProgressManager`).
 *
 * This module holds no disk state, so it is free to consult per message. The
 * decision is deliberately *not* frozen on first read — freezing a value that
 * arrives late is the bug this policy replaces.
 *
 * `setConsoleLogPolicy` is intentionally absent from the package index. The core
 * CLI imports it by deep path (`@contentstack/cli-utilities/lib/logger/console-policy`);
 * a plugin importing from the index has no setter to call, which makes "nothing
 * downstream may override the policy" structural rather than a runtime lock.
 */

let enabled = false;

export function setConsoleLogPolicy(value: boolean): void {
  enabled = value;
}

export function isConsoleLogEnabled(): boolean {
  return enabled;
}

/** Test-only: restore the default (files-only) policy between cases. */
export function resetConsoleLogPolicy(): void {
  enabled = false;
}
