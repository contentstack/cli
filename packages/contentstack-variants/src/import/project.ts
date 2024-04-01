import { join } from 'path';
import { existsSync } from 'fs';

import { PersonalizationAdapter } from '../utils';
import { APIConfig, CreateProjectInput, ImportConfig, LogType } from '../types';

export class Project extends PersonalizationAdapter<ImportConfig> {
  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
    };
    super(Object.assign(config, conf));
  }

  /**
   * The function `importProject` checks if a project path exists, creates a project if it does, and
   * logs the result.
   * @param {CreateProjectInput} input - The `input` parameter in the `importProject` function likely
   * represents the data or configuration needed to create a new project. It is of type
   * `CreateProjectInput`, which could be an object containing information such as project name,
   * description, settings, or any other details required for creating a project.
   */
  async importProject(input: CreateProjectInput) {
    const personalization = this.config.modules.personalization;
    const { dirName, fileName } = personalization.projects;
    const projectPath = join(this.config.data, personalization.dirName, dirName, fileName);

    if (existsSync(projectPath)) {
      await this.createProject(input).catch((error) => {
        this.log(this.config, error, 'error');
      });

      this.log(this.config, 'Project created successfully!', 'info');
    }
  }
}
