const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');

module.exports = ({ migration, stackSDKInstance, managementAPIClient, config }) => {
  const dataDir = config['data-dir'];
  const delimiter = config['delimiter'] ?? ','; // default comma
  //parent and child term pointer
  let parentDetails = { taxonomy_uid: '' };
  let stack;
  let depth = 1,
    parentUID = null;
  let taxonomies = {};

  const stackClient = () => {
    return managementAPIClient.stack({ api_key: stackSDKInstance.api_key });
  };

  const pushTaxonomyDetails = async (apiData) => {
    if (!taxonomies[apiData?.uid]) taxonomies[apiData?.uid] = { taxonomy: apiData };
  };

  const pushTermDetails = async (apiData) => {
    if (taxonomies[apiData?.taxonomy_uid]) {
      const terms = (taxonomies[apiData.taxonomy_uid].terms ||= []);
      terms.push({ uid: apiData.uid, name: apiData.name, parent_uid: apiData.parent_uid });
    }
  };

  function handleErrorMsg(err) {
    let errMsg;
    if (err?.errorMessage || err?.message) {
      errMsg = err?.errorMessage || err?.errors?.taxonomy || err?.errors?.term || JSON.stringify(err?.errors) || err?.message;
    }
    throw errMsg ?? err;
  }

  const readCsv = (path, options) => {
    return new Promise((resolve, reject) => {
      const taxonomies = [];
      fastcsv
        .parseFile(path, options)
        .on('error', reject)
        .on('data', (data) => {
          taxonomies.push(data);
        })
        .on('end', () => {
          resolve(taxonomies);
        });
    });
  };

  const importTaxonomies = async () => {
    for (const taxonomyUID in taxonomies) {
      const filePath = path.resolve(process.cwd(), `${taxonomyUID}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(taxonomies[taxonomyUID]));
      }
      await stack
        .taxonomy()
        .import({ taxonomy: filePath })
        .then(() => console.log(`Taxonomy ${taxonomyUID} migrated successfully!`))
        .catch((err) => {
          handleErrorMsg(err);
        });
      fs.unlinkSync(filePath);
    }
  };

  const toSnakeCase = (str) =>
    str
      .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
      .map((x) => x.toLowerCase())
      .join('_');

  const createTaxonomyTask = (params) => {
    return {
      title: 'Create Taxonomies',
      successMessage: 'Taxonomies created successfully!',
      failedMessage: 'Failed to create taxonomies!',
      task: async (params) => {
        try {
          stack = stackClient();
          if (!fs.existsSync(dataDir)) throw new Error(`No Taxonomies folder found! - ${dataDir}`);
          const taxonomies = await readCsv(dataDir, { headers: true, delimiter });

          if (!taxonomies?.length) throw new Error('No Taxonomies found!');

          for (const taxDetails of taxonomies) {
            const taxonomyName = taxDetails['Taxonomy Name'] ?? '';
            const taxonomyUID = taxDetails['Taxonomy Uid'] ?? '';
            const taxonomyDesc = taxDetails['Taxonomy Description'] ?? '';
            //taxonomy name required
            if (taxonomyName) {
              const reqTaxonomyObj = {
                name: taxonomyName,
                uid: taxonomyUID ?? toSnakeCase(taxonomyName),
                description: taxonomyDesc,
              };
              parentDetails = { taxonomy_uid: reqTaxonomyObj.uid };
              await pushTaxonomyDetails(reqTaxonomyObj);
            } else if (!taxonomyName && parentDetails['taxonomy_uid']) {
              const column = Object.keys(taxDetails).find((col) => taxDetails[col] !== '');
              if (!column) continue;
               
              const termLevel = (column.match(/Level \d+/) || [''])[0]; // Output:- Level 1/Level 2
              const termDepth = +termLevel.replace(/\D/g, ''); // fetch depth from header
              const termName = taxDetails[`${termLevel} Term Name`] ?? '';

              //term name required field to generate term uid
              if (termName && termDepth) {
                const termUID = taxDetails[`${termLevel} Term Uid`] || toSnakeCase(termName);
                //Handled cases
                //1.child term case 2.sibling term 3.different parent term parentUID = parentDetails[termDepth - 1] || null
                //4.parent term -> parentUID = null & depth=1
                parentUID = parentDetails[termDepth - 1] || (termDepth === 1 ? null : parentUID);
                depth = termDepth;
                parentDetails[depth] = termUID;
                const reqTermObj = {
                  uid: termUID,
                  name: termName,
                  parent_uid: parentUID,
                  taxonomy_uid: parentDetails['taxonomy_uid'],
                };
                await pushTermDetails(reqTermObj);
              }
            }
          }

          // create json file & remove it after migrating taxonomy
          await importTaxonomies();
        } catch (error) {
          throw error;
        }
      },
    };
  };
  if (config?.['data-dir']) {
    migration.addTask(createTaxonomyTask());
  } else {
    console.error('Please provide config using --config data-dir:"<file-path>"');
  }
};
