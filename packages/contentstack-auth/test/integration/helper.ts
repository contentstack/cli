import { Command } from '@contentstack/cli-command';

export interface MockSTDIN {
  /** Queue up data to be read by the stream. Results in data (and possibly end) events being dispatched. */
  send: (data: String | Buffer | string[] | null, encoding?: string) => MockSTDIN
  /** Alias for MockSTDIN.send(null). Results in dispatching an end event. */
  end: () => MockSTDIN
  /** Restore the target of the mocked stream. If only a single mock stream is created, will restore the original stdin TTY stream. If multiple mock streams are created, it will restore the stream which was active at the time the mock was created. */
  restore: () => MockSTDIN
  /**
   * Ordinarily, a Readable stream will throw when attempting to push after an EOF. This routine will reset the ended state of a Readable stream, preventing it from throwing post-EOF. This prevents being required to re-create a mock STDIN instance during certain tests where a fresh stdin is required.
   * @param removeListeners - When set to true, will remove all event listeners attached to the stream.
   */
  reset: (removeListeners?: boolean) => MockSTDIN
}

// helper function for timing
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// # Here are the various escape sequences we can capture
// '\x0d': 'return'
// '\x7f': 'backspace'
// '\x1b': 'escape'
// '\x01': 'ctrl+a'
// '\x02': 'ctrl+b'
// '\x03': 'ctrl+c'
// '\x04': 'ctrl+d'
// '\x05': 'ctrl+e'
// '\x06': 'ctrl+f'
// '\x1a': 'ctrl+z'
// '\x1b\x4f\x50': 'f1'
// '\x1b\x4f\x51': 'f2'
// '\x1b\x4f\x52': 'f3'
// '\x1b\x4f\x53': 'f4'
// '\x1b\x4f\x31\x35\x7e': 'f5'
// '\x1b\x4f\x31\x37\x7e': 'f6'
// '\x1b\x4f\x31\x38\x7e': 'f7'
// '\x1b\x4f\x31\x39\x7e': 'f8'
// '\x1b\x4f\x31\x30\x7e': 'f9'
// '\x1b\x4f\x31\x31\x7e': 'f10'
// '\x1b\x4f\x31\x33\x7e': 'f11'
// '\x1b\x4f\x31\x34\x7e': 'f12'
// '\x1b\x5b\x41': 'up'
// '\x1b\x5b\x42': 'down'
// '\x1b\x5b\x43': 'right'
// '\x1b\x5b\x44': 'left'
// '\x1b\x4f\x46': 'end'
// '\x1b\x4f\x48': 'home'
// '\x1b\x5b\x32\x7e': 'insert'
// '\x1b\x5b\x33\x7e': 'delete'
// '\x1b\x5b\x35\x7e': 'pageup'
// '\x1b\x5b\x36\x7e': 'pagedown'

// NOTE Key codes
const keys = {
  up: '\x1B\x5B\x41',
  down: '\x1B\x5B\x42',
  enter: '\x0D',
  space: '\x20',
};

class Helper extends Command {
  async run() {
    return this.email
  }
}

export { keys, Helper }