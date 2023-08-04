import find from "lodash/find";
import { resolve } from "path";
import { existsSync } from "fs";
import isEmpty from "lodash/isEmpty";
import includes from "lodash/includes";
import { cliux as ux } from "@contentstack/cli-utilities";

import BaseClass from "./base-class";
import { getRemoteUrls } from "../util";

export default class PreCheck extends BaseClass {
  public projectBasePath: string = process.cwd();
  /**
   * @method run
   *
   * @param {boolean} [identifyProject=true]
   * @return {*}  {Promise<void>}
   * @memberof PreCheck
   */
  async run(identifyProject = true): Promise<void> {
    await this.performValidations();

    if (identifyProject && !this.config.isExistingProject) {
      await this.identifyWhatProjectItIs();
    }
  }

  /**
   * @method performValidations - Validate if the current project is an existing launch project
   *
   * @return {*}  {(Promise<boolean | void>)}
   * @memberof PreCheck
   */
  async performValidations(): Promise<boolean | void> {
    if (this.config.config && existsSync(this.config.config)) {
      if (this.config.flags.init) {
        // NOTE reinitialize the project
        this.config.provider = undefined;
        this.config.isExistingProject = false;

        if (this.config.flags.type) {
          this.config.provider = this.config.flags.type as any;
        }
      } else {
        this.validateLaunchConfig();

        this.log("Existing launch project identified", "info");

        await this.displayPreDeploymentDetails();

        if (
          !(await ux.inquire({
            type: "confirm",
            name: "deployLatestSource",
            message: "Redeploy latest commit/code?",
          }))
        ) {
          this.exit(1);
        }
      }
    }
  }

  /**
   * @method displayPreDeploymentDetails
   *
   * @memberof GitHub
   */
  async displayPreDeploymentDetails() {
    if (this.config.config && !isEmpty(this.config.currentConfig)) {
      this.log(""); // Empty line
      this.log("Current Project details:", { bold: true, color: "green" });
      this.log(""); // Empty line
      const { name, projectType, repository, environments } =
        this.config.currentConfig;
      const [environment] = environments;

      const detail: Record<string, any> = {
        "Project Name": name,
        "Project Type":
          (this.config.providerMapper as Record<string, any>)[projectType] ||
          "",
        Environment: environment.name,
        "Framework Preset":
          find(this.config.listOfFrameWorks, {
            value: environment.frameworkPreset,
          })?.name || "",
      };

      if (repository?.repositoryName) {
        detail["Repository"] = repository.repositoryName;
      }

      ux.table([detail, {}], {
        "Project Name": {
          minWidth: 7,
        },
        "Project Type": {
          minWidth: 7,
        },
        Environment: {
          minWidth: 7,
        },
        Repository: {
          minWidth: 7,
        },
        "Framework Preset": {
          minWidth: 7,
        },
      });
    }
  }

  /**
   * @method validateLaunchConfig
   *
   * @memberof PreCheck
   */
  validateLaunchConfig() {
    try {
      // NOTE Perform validations here
      if (isEmpty(require(this.config.config as string))) {
        this.log("Invalid Launch config!", "warn");
        this.exit(1);
      }
    } catch (error) {}
  }

  /**
   * @method identifyWhatProjectItIs - identify if the project type (is GitHub, BitBucket, FileUpload etc.,)
   *
   * @return {*}  {Promise<void>}
   * @memberof PreCheck
   */
  async identifyWhatProjectItIs(): Promise<void> {
    const localRemoteUrl =
      (await getRemoteUrls(resolve(this.config.projectBasePath, ".git/config")))
        ?.origin || "";

    switch (true) {
      case includes(localRemoteUrl, 'github.'):
        this.config.provider = 'GitHub';
        this.log('Git project identified', 'info');
        break;
      default:
        if (existsSync(resolve(this.config.projectBasePath, ".git"))) {
          this.log("Git config found but remote URL not found in the config!", {
            color: "yellow",
            bold: true,
          });
        }
        await this.connectToAdapterOnUi(false);
        break;
    }
  }
}
