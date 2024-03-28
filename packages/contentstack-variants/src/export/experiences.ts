import * as path from 'path';
import { ContentstackClient } from '@contentstack/cli-utilities';

import { ExportConfig } from '../types';

export default class ExportExperiences {
  public exportConfig: ExportConfig;
  constructor(exportConfig: ExportConfig) {
    this.exportConfig = exportConfig
  }

  async start() {
    try {
      // get all experiences
      // loop through experiences and get content types attached to it 
      // write experiences in to a file
    } catch (error) {
    }
  }
}
