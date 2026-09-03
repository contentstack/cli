import { configHandler } from '@contentstack/cli-utilities';
import { setConsoleLogPolicy } from '@contentstack/cli-utilities/lib/logger/console-policy';

/**
 * Resolve whether the CLI writes log lines to the console, once, before any command code
 * runs. Registered first among the `init` hooks so the pre-policy window is `Config.load()`
 * alone, during which no first-party code runs.
 *
 * Console output is opt-in; the default is files only. Three static sources may enable it
 * and nothing downstream may override the result — the setter is deliberately reachable
 * only by deep path, not from the package index. Precedence, highest first:
 *
 *   1. `CS_CLI_CONSOLE_LOGS` (`1`/`true` → on, `0`/`false` → off). Read at process start, so
 *      it cannot lose a race with hook ordering. Also the way to force console logs *off*.
 *   2. User config `log.showConsoleLogs`, honoured **only when `true`** — see below.
 *   3. The command's plugin declaring `csdxConfig.showConsoleLogs` in its `package.json`.
 *   4. Default `false`.
 *
 * A persisted `log.showConsoleLogs: false` is treated as "no opinion" rather than an
 * override. Every user who has run `cm:stacks:audit` carries that value on disk, written as
 * a side effect; since `false` *is* the default it conveys no intent the default doesn't
 * already provide, and letting it win would silently mute every plugin that declares
 * console logs, with no visible cause. Ignore the value; never rewrite the user's file.
 *
 * Because the progress UI and the log stream are two consumers of one terminal, enabling
 * console logs also turns the progress UI off — see `CLIProgressManager.initializeProgress`.
 */
export default function (opts: { id?: string }): void {
  setConsoleLogPolicy(resolveConsoleLogPolicy(opts, this?.config));
}

/**
 * The precedence chain, split out from the hook so it can be exercised directly with a
 * fake oclif `config`.
 */

export function resolveConsoleLogPolicy(opts: { id?: string }, config: any): boolean {
  // 1. Environment variable — the only source that can force console logs off.
  const fromEnv = parseBoolean(process.env.CS_CLI_CONSOLE_LOGS);
  if (fromEnv !== undefined) return fromEnv;

  // 2. User config, on `true` only.
  try {
    if (configHandler.get('log')?.showConsoleLogs === true) return true;
  } catch {
    // a broken config file must not stop the CLI from starting
  }

  // 3. The plugin owning this command. Resolved straight from `pjson.csdxConfig` with plain
  //    oclif API rather than via `config.context`, so this hook neither depends on how the
  //    context is built nor has to be re-run wherever the context is rebuilt.
  //
  //    `findCommand` returns nothing for an id oclif has yet to correct (a mistyped command),
  //    in which case the declaration simply cannot be read and the default applies. That is
  //    accepted: the invocation is about to be re-dispatched, and adding a second resolution
  //    point for one decision is the failure mode this policy exists to remove.
  try {
    const command = config?.findCommand?.(opts?.id) || {};
    const plugin = (config?.plugins || new Map()).get(command.pluginName) || {};
    if (plugin.pjson?.csdxConfig?.showConsoleLogs === true) return true;
  } catch {
    // never block CLI startup on plugin resolution
  }

  // 4. Default: files only.
  return false;
}

function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true') return true;
  if (normalized === '0' || normalized === 'false') return false;
  return undefined;
}
