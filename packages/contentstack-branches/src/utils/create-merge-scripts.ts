import fs from 'fs';
import { cliux, formatTime, formatDate } from '@contentstack/cli-utilities';
import { entryCreateScript } from './entry-create-script';
import { entryUpdateScript } from './entry-update-script';
import { entryCreateUpdateScript } from './entry-create-update-script';
import { assetFolderCreateScript } from './asset-folder-create-script';

type CreateMergeScriptsProps = {
  uid: string;
  entry_merge_strategy?: string;
  type?: string;
  status?: string;
};

export function generateMergeScripts(mergeSummary, mergeJobUID) {
  try {
    let scriptFolderPath;

    const processContentType = (contentType, scriptFunction) => {
      let data: any;
      if (contentType.uid) {
        data = scriptFunction(contentType.uid);
      } else {
        data = scriptFunction();
      }
      scriptFolderPath = createMergeScripts(contentType, mergeJobUID, data);
    };

    const mergeStrategies = {
      asset_create_folder: assetFolderCreateScript,
      merge_existing_new: entryCreateUpdateScript,
      merge_existing: entryUpdateScript,
      merge_new: entryCreateScript,
    };

    const processContentTypes = (contentTypes, messageType) => {
      if (contentTypes && contentTypes.length > 0) {
        contentTypes.forEach((contentType) => {
          const mergeStrategy = contentType.entry_merge_strategy;
          if (mergeStrategies.hasOwnProperty(mergeStrategy)) {
            processContentType(contentType, mergeStrategies[mergeStrategy]);
          }
        });
        cliux.print(`Info: Entries of ${messageType} content types selected for the migration`, { color: 'blue' });
      }
    };

    processContentType({ type: 'assets', uid: '', entry_merge_strategy: '' }, mergeStrategies['asset_create_folder']);
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
  } else if (status === 'ignore') {
    return;
  } else {
    return '';
  }
}

export function createMergeScripts(contentType: CreateMergeScriptsProps, mergeJobUID: string, content?: any) {
  const date = new Date();
  const rootFolder = 'merge_scripts';
  const fileCreatedAt = `${formatDate(date)}${formatTime(date)}`;
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
      let filePath: string;
      let milliSeconds = date.getMilliseconds().toString().padStart(3, '0');
      if (contentType.type === 'assets') {
        filePath = `${fullPath}/${fileCreatedAt}${milliSeconds}_create_assets_folder.js`;
      } else {
        filePath = `${fullPath}/${fileCreatedAt}${milliSeconds}_${getContentTypeMergeStatus(
          contentType.entry_merge_strategy,
        )}_${contentType.uid}.js`;
      }
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return fullPath;
  } catch (error) {
    console.log(error);
  }
}
