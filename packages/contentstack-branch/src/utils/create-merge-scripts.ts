import fs from 'fs';
import { entryCreateScript } from './entry-create-script';
import { entryUpdateScript } from './entry-update-script';

type CreateMergeScriptsProps = {
  uid: string;
  status: string;
};

export function generateMergeScripts(mergeSummary) {
  try {
    let { added, modified } = mergeSummary.content_types;
    let scriptFolderPath;

    modified.length !== 0 &&
      modified.map((contentType) => {
        let data = entryUpdateScript(contentType.uid);
        scriptFolderPath = createMergeScripts(contentType, data);
      });

    added.length !== 0 &&
      added.map((contentType) => {
        let data = entryCreateScript(contentType.uid);
        scriptFolderPath = createMergeScripts(contentType, data);
      });

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
  }
}

export function renameScriptFolder(mergeUID, scriptFolderPath) {
  const currPath = scriptFolderPath;
  const regex = /mergeJobID/i;
  const newPath = scriptFolderPath.replace(regex, mergeUID);

  try {
    fs.renameSync(currPath, newPath);
    return newPath;
  } catch (err) {
    console.log(err);
  }
}

export function createMergeScripts(contentType: CreateMergeScriptsProps, content) {
  const mergeJobID = 'mergeJobID';
  const date = new Date();
  const rootFolder = 'merge_scripts';
  const fileCreatedAt = `${date.getFullYear()}${
    date.getMonth().toString.length === 1 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
  }${date.getUTCDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
  const mergeScriptsSlug = `merge_scripts_${mergeJobID}_${fileCreatedAt}`;

  const fullPath = `${rootFolder}/${mergeScriptsSlug}`;
  try {
    if (!fs.existsSync(rootFolder)) {
      fs.mkdirSync(rootFolder);
    }
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath);
    }
    fs.writeFileSync(`${fullPath}/${fileCreatedAt}_${contentType.status}_${contentType.uid}.js`, content, 'utf-8');
    return fullPath;
  } catch (error) {
    console.log(error);
  }
}
