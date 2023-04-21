import fs from 'fs';
import { entryCreateScript } from './entry-create-script';

type CreateMergeScriptsProps = {
  mergeJobID?: string;
  operationType?: string;
  contentTypeUid?: string;
  content?: string;

  uid: string;
  status: string;
};

export function generateMergeScripts(mergeSummary) {
  try {
    let { added, modified } = mergeSummary.content_type;
    console.log('mergeSummary', added, modified);

    modified.length !== 0 &&
      modified.map((contentType) => {
        console.log(contentType);
        createMergeScripts(contentType);
      });

    added.length !== 0 &&
      added.map((contentType) => {
        console.log(contentType);
        createMergeScripts(contentType);
      });
  } catch (error) {
    console.log(error);
  }
}

export function createMergeScripts({ status, uid }: CreateMergeScriptsProps) {
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
    fs.writeFileSync(`${fullPath}/${fileCreatedAt}_${status}_${uid}.js`, entryCreateScript(uid), 'utf-8');
  } catch (error) {
    console.log(error);
  }
}
