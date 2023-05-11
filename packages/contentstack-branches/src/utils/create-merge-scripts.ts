import fs from 'fs';
import { entryCreateScript } from './entry-create-script';
import { entryUpdateScript } from './entry-update-script';

type CreateMergeScriptsProps = {
  uid: string;
  status: string;
};

export function generateMergeScripts(mergeSummary, mergeJobUID) {
  try {
    let scriptFolderPath;

    if (mergeSummary.content_types.modified && mergeSummary.content_types.modified?.length !== 0) {
      mergeSummary.content_types.modified.map((contentType) => {
        let data = entryUpdateScript(contentType.uid);
        scriptFolderPath = createMergeScripts(contentType, data, mergeJobUID);
      });
    }

    if (mergeSummary.content_types.added && mergeSummary.content_types.added?.length !== 0) {
      mergeSummary.content_types.added?.map((contentType) => {
        let data = entryCreateScript(contentType.uid);
        scriptFolderPath = createMergeScripts(contentType, data, mergeJobUID);
      });
    }

    return scriptFolderPath;
  } catch (error) {
    console.log(error);
  }
}

export function getContentypeMergeStatus(status) {
  if (status === 'modified') {
    return 'updated';
  } else if (status === 'compare_only') {
    return 'created';
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
        `${fullPath}/${fileCreatedAt}_${getContentypeMergeStatus(contentType.status)}_${contentType.uid}.js`,
        content,
        'utf-8',
      );
    }
    return fullPath;
  } catch (error) {
    console.log(error);
  }
}
