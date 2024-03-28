import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';

import BaseClass from './base-class';
import { log, formatError, fsUtil } from '../../utils';
import { LabelConfig, ModuleClassParams } from '../../types';

export default class ExportEclipse extends BaseClass {

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
  }

    async start(): Promise<void> {
        log(this.exportConfig, 'Starting personalization project export', 'info');

        // get project details
        // if project exist
        // set that in the global config
        // export project
        // export events
        // export attributes
        // export audiences
        // export experiences, along with this export content type details as well
    
    }
}
