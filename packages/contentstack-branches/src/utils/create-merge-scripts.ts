import fs from 'fs';
import { cliux } from '@contentstack/cli-utilities';
import { entryCreateScript } from './entry-create-script';
import { entryUpdateScript } from './entry-update-script';
import { entryCreateUpdateScript } from './entry-create-update-script';

type CreateMergeScriptsProps = {
  uid: string;
  entry_merge_strategy: string;
};

export function generateMergeScripts(mergeSummary, mergeJobUID) {
  try {
    let scriptFolderPath;

    const processContentType = (contentType, scriptFunction) => {
      const data = scriptFunction(contentType.uid);
      scriptFolderPath = createMergeScripts(contentType, data, mergeJobUID);
    };

    const mergeStrategies = {
      merge_existing_new: entryCreateUpdateScript,
      merge_existing: entryUpdateScript,
      merge_new: entryCreateScript,
      ignore: entryCreateUpdateScript,
    };

    const processContentTypes = (contentTypes, messageType) => {
      if (contentTypes && contentTypes.length > 0) {
        contentTypes.forEach((contentType) => {
          const mergeStrategy = contentType.entry_merge_strategy;
          if (mergeStrategies.hasOwnProperty(mergeStrategy)) {
            processContentType(contentType, mergeStrategies[mergeStrategy]);
          }
        });
      } else {
        cliux.print(`No ${messageType} entries selected for merge`, { color: 'yellow' });
      }
    };

    processContentTypes(mergeSummary.modified, 'Modified');
    processContentTypes(mergeSummary.added, 'New');

    return scriptFolderPath;
  } catch (error) {
    console.log(error);
  }
}

export function getContentTypeMergeStatus(status) {
  if (status === 'merge_existing') {
    return 'updated';
  } else if (status === 'merge_new') {
    return 'created';
  } else if (status === 'merge_existing_new') {
    return 'created_updated';
  } else {
    return '';
  }
}

export function createMergeScripts(contentType: CreateMergeScriptsProps, content, mergeJobUID) {
  const date = new Date();
  const rootFolder = 'merge_scripts';
  const fileCreatedAt = `${date.getFullYear()}${
    date.getMonth().toString.length === 1 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
  }${date.getUTCDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
  const mergeScriptsSlug = `merge_scripts_${mergeJobUID}_${fileCreatedAt}`;

  const fullPath = `${rootFolder}/${mergeScriptsSlug}`;

  const { W_OK: writePermission } = fs.constants;

  const checkPermissions = fs.accessSync('./', writePermission);

  try {
    if (checkPermissions === undefined) {
      if (!fs.existsSync(rootFolder)) {
        fs.mkdirSync(rootFolder);
      }
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath);
      }
      fs.writeFileSync(
        `${fullPath}/${fileCreatedAt}_${getContentTypeMergeStatus(contentType.entry_merge_strategy)}_${
          contentType.uid
        }.js`,
        content,
        'utf-8',
      );
    }
    return fullPath;
  } catch (error) {
    console.log(error);
  }
}
