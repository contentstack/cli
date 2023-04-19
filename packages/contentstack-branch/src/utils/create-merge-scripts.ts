import fs from 'fs';

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
    console.log('mergeSummary', mergeSummary, mergeSummary.content_type);

    modified.length &&
      modified.map((contentType) => {
        console.log(contentType);

        createMergeScripts(contentType);
      });

    added.length &&
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
  const content = `const data = 'Hello';`;
  const date = new Date();
  const rootFolder = 'merge_scripts';
  const fileCreatedAt = `${date.getFullYear()}${
    date.getMonth().toString.length === 1 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
  }${date.getUTCDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
  // const mergeScriptsSlug = `merge_scripts_${mergeJobID}_${fileCreatedAt}`;
  const mergeScriptsSlug = `merge_scripts_${mergeJobID}_${fileCreatedAt}`;

  const fullPath = `${rootFolder}/${mergeScriptsSlug}`;
  try {
    if (!fs.existsSync(`${rootFolder}`)) {
      fs.mkdirSync(`${rootFolder}`);
      fs.mkdirSync(`${fullPath}`);
      fs.writeFileSync(`${fullPath}/${fileCreatedAt}_${status}_${uid}.js`, content, 'utf-8');
    } else {
      fs.mkdirSync(`${fullPath}`);
      fs.writeFileSync(`${fullPath}/${fileCreatedAt}_${status}_${uid}.js`, content, 'utf-8');
    }
  } catch (error) {
    console.log(error);
  }
}
