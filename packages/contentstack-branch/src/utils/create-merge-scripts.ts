import fs from 'fs';

type CreateMergeScriptsProps = {
  mergeJobID: string;
  operationType: string;
  contentTypeUid: string;
  content: string;
};

export function createMergeScripts({ mergeJobID, operationType, contentTypeUid, content }: CreateMergeScriptsProps) {
  const date = new Date();
  const rootFolder = 'merge_scripts';
  const fileCreatedAt = `${date.getFullYear()}${
    date.getMonth().toString.length === 1 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
  }${date.getUTCDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
  const mergeScriptsSlug = `merge_scripts_${mergeJobID}_${fileCreatedAt}`;
  const fullPath = `${rootFolder}/${mergeScriptsSlug}`;
  try {
    if (!fs.existsSync(`${rootFolder}`)) {
      fs.mkdirSync(`${rootFolder}`);
      fs.mkdirSync(`${fullPath}`);
      fs.writeFileSync(`${fullPath}/${fileCreatedAt}_${operationType}_${contentTypeUid}.js`, content, 'utf-8');
    } else {
      fs.mkdirSync(`${fullPath}`);
      fs.writeFileSync(`${fullPath}/${fileCreatedAt}_${operationType}_${contentTypeUid}.js`, content, 'utf-8');
    }
  } catch (error) {
    console.log(error);
  }
}
