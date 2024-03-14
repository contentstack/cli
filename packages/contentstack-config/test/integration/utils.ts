import { Command } from '@contentstack/cli-command';

// helper function for timing
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export class Helper extends Command {
  async run() {
    return this.region
  }
}