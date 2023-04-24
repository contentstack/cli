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

    modified.length !== 0 &&
      modified.map((contentType) => {
        let data = entryUpdateScript(contentType.uid);
        createMergeScripts(contentType, data);
      });

    added.length !== 0 &&
      added.map((contentType) => {
        let data = entryCreateScript(contentType.uid);
        createMergeScripts(contentType, data);
      });
  } catch (error) {
    console.log(error);
  }
}

export function createMergeScripts(contentType: CreateMergeScriptsProps, content) {
  const mergeJobID = 'unique';
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
  } catch (error) {
    console.log(error);
  }
}
