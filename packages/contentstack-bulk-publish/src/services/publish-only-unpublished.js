'use strict';

const { cliux } = require('@contentstack/cli-utilities');

const { start } = require('../producer/publish-unpublished-env');
const { prettyPrint, formatError } = require('../util');
const { getStack } = require('../util/client');
const store = require('../util/store');

const configKey = 'publish_unpublished_env';

async function publishOnlyUnpublishedService(UnpublishedEntriesCommand) {
  let config;
  const unpublishedEntriesFlags = flagsAdapter(this.parse(UnpublishedEntriesCommand).flags);
  let updatedFlags;
  try {
    updatedFlags = unpublishedEntriesFlags.config
      ? store.updateMissing(configKey, unpublishedEntriesFlags)
      : unpublishedEntriesFlags;
  } catch (error) {
    this.error(error.message, { exit: 2 });
  }
  if (validate.apply(this, [updatedFlags])) {
    let stack;
    if (!updatedFlags.retryFailed) {
      if (!updatedFlags.alias) {
        updatedFlags.alias = await cliux.prompt('Please enter the management token alias to be used');
      }
      updatedFlags.bulkPublish = updatedFlags.bulkPublish === 'false' ? false : true;
      // Validate management token alias.
      try {
        this.getToken(updatedFlags.alias);
      } catch (error) {
        this.error(
          `The configured management token alias ${updatedFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${updatedFlags.alias}'`,
          { exit: 2 },
        );
      }
      config = {
        alias: updatedFlags.alias,
        host: this.region.cma,
        branch: unpublishedEntriesFlags.branch,
      };
      stack = getStack(config);
    }
    if (await confirmFlags(updatedFlags)) {
      try {
        if (!updatedFlags.retryFailed) {
          await start(updatedFlags, stack, config);
        } else {
          await start(updatedFlags);
        }
      } catch (error) {
        let message = formatError(error);
        this.error(message, { exit: 2 });
      }
    } else {
      this.exit(0);
    }
  }
}

function validate({ contentTypes, environments, sourceEnv, locale, retryFailed }) {
  let missing = [];
  if (retryFailed) {
    return true;
  }

  if (!contentTypes || contentTypes.length === 0) {
    missing.push('Content Types');
  }

  if (!sourceEnv) {
    missing.push('SourceEnv');
  }

  if (!environments || environments.length === 0) {
    missing.push('Environments');
  }

  if (!locale) {
    missing.push('Source Locale');
  }

  if (missing.length > 0) {
    this.error(`${missing.join(', ')} are required for processing this command. Please check --help for more details`, {
      exit: 2,
    });
  } else {
    return true;
  }
}

async function confirmFlags(data) {
  prettyPrint(data);
  if (data.yes) {
    return true;
  }
  return cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
}

function flagsAdapter(flags) {
  if ('content-types' in flags) {
    flags.contentTypes = flags['content-types'];
    delete flags['content-types'];
  }
  if ('locales' in flags) {
    flags.locale = flags.locales;
    delete flags['locales'];
  }
  if ('source-env' in flags) {
    flags.sourceEnv = flags['source-env'];
    delete flags['source-env'];
  }
  if ('retry-failed' in flags) {
    flags.retryFailed = flags['retry-failed'];
    delete flags['retry-failed'];
  }
  if ('bulk-publish' in flags) {
    flags.bulkPublish = flags['bulk-publish'];
    delete flags['bulk-publish'];
  }
  return flags;
}

module.exports = {
  publishOnlyUnpublishedService,
  validate,
  confirmFlags,
};
