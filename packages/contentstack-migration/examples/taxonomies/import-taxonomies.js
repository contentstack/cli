const fs = require('fs');
const fastcsv = require('fast-csv');
const find = require('lodash/find');

module.exports = ({ migration, stackSDKInstance, managementAPIClient, config }) => {
  const dataDir = config['data-dir'];
  const delimiter = config['delimiter'] ?? ','; // default comma
  //parent and child term pointer
  let parentDetails = { taxonomy_uid: '' };
  let stack;
  let depth = 1,
    parentUID = null;

  const stackClient = () => {
    return managementAPIClient.stack({ api_key: stackSDKInstance.api_key });
  };

  const createTaxonomy = async (apiData) => {
    await stack
      .taxonomy()
      .create({ taxonomy: apiData })
      .catch((err) => handleErrorMsg(err));
  };

  const createTerm = async (apiData) => {
    await stack
      .taxonomy(apiData.taxonomy_uid)
      .terms()
      .create({ term: apiData })
      .catch((err) => handleErrorMsg(err));
  };

  function handleErrorMsg(err) {
    let errMsg = 'Something went wrong! Please try again';
    if (err?.errorMessage) {
      errMsg = err.errorMessage;
    } else if (err?.message) {
      errMsg = err?.errors?.taxonomy || err?.errors?.term || JSON.stringify(err?.errors) || err?.message;
    }
    throw errMsg;
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
          if (!fs.existsSync(dataDir)) {
            throw new Error(`No such file or directory - ${dataDir}`);
          }
          const taxonomies = await readCsv(dataDir, { headers: true, delimiter });

          if (!taxonomies?.length) {
            throw new Error('No Taxonomies found!');
          }

          for (let row = 0; row < taxonomies?.length; row++) {
            const taxDetails = taxonomies[row];
            //taxonomy name required
            if (taxDetails['Taxonomy Name']?.length) {
              const taxonomyName = taxDetails['Taxonomy Name'];
              const taxonomyUID = taxDetails['Taxonomy UID'] ?? '';
              const taxonomyDesc = taxDetails['Taxonomy Description'] ?? '';
              const reqTaxonomyObj = {
                name: taxonomyName,
                uid: taxonomyUID?.length ? taxonomyUID : toSnakeCase(taxonomyName),
                description: taxonomyDesc,
              };
              parentDetails = {};
              parentDetails['taxonomy_uid'] = reqTaxonomyObj.uid;
              await createTaxonomy(reqTaxonomyObj);
            } else if (!taxDetails['Taxonomy Name']?.length && parentDetails['taxonomy_uid']) {
              const column = find(Object.keys(taxDetails), (col) => {
                if (taxDetails[col] !== '') {
                  return col;
                }
              });
              const termLevel = column?.split(' ')?.[1] ?? ''; // Output:- Level1/Level2
              const termDepth = +termLevel.replace(/[^0-9]/g, ''); // fetch depth from header
              const termName = taxDetails[`Term ${termLevel} Name`] ?? '';

              //term name required field
              if (termName?.length && termDepth) {
                const termUID = taxDetails[`Term ${termLevel} UID`]?.length
                  ? taxDetails[`Term ${termLevel} UID`]
                  : toSnakeCase(termName);
                if (termDepth > depth) {
                  //child term case
                  parentUID = parentDetails[termDepth - 1] || null;
                  depth = termDepth;
                  parentDetails[depth] = termUID;
                } else if (termDepth === 1) {
                  //parent term case
                  depth = 1;
                  parentUID = null;
                  parentDetails[depth] = termUID;
                } else if (termDepth === depth) {
                  //sibling term case
                  parentUID = parentDetails[termDepth - 1];
                } else if (termDepth < depth) {
                  //diff parent term case
                  parentUID = parentDetails[termDepth - 1] || null;
                  depth = termDepth;
                  parentDetails[depth] = termUID;
                }
                const reqTermObj = {
                  uid: termUID,
                  name: termName,
                  parent_uid: parentUID,
                  taxonomy_uid: parentDetails['taxonomy_uid'],
                };
                await createTerm(reqTermObj);
              }
            }
          }
        } catch (error) {
          throw error;
        }
      },
    };
  };
  if (config?.['data-dir']) {
    migration.addTask(createTaxonomyTask());
  } else {
    console.error('Please provide config using --config data-dir: "<file-path>"');
  }
};
