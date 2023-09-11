const isEmpty = require('lodash/isEmpty');
const { cliux } = require('@contentstack/cli-utilities');

function inquireRequireFieldValidation(input) {
  if (isEmpty(input)) {
    return "This field can't be empty";
  }
  return true;
}

async function askTaxonomyUID() {
  return await cliux.inquire({
    type: 'input',
    message: 'Enter taxonomy UID',
    name: 'taxonomyUid',
    validate: inquireRequireFieldValidation,
  });
}

module.exports = { askTaxonomyUID };
