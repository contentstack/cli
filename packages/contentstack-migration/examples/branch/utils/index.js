/**
 * Helpers
 */
function replaceAssetPayloadWithUids(data, key = null) {
  if (key) {
    if (Array.isArray(data[key])) {
      for (let item of data[key]) {
        replaceAssetPayloadWithUids(item);
      }
    } else if (typeof data[key] === 'object' && data[key]) {
      if (data[key]['filename'] && data[key]['file_size']) {
        data[key] = data[key].uid;
      } else {
        for (let property in data[key]) {
          replaceAssetPayloadWithUids(data[key], property);
        }
      }
    }
  } else {
    if (Array.isArray(data)) {
      for (let item of data) {
        replaceAssetPayloadWithUids(item);
      }
    } else if (typeof data === 'object') {
      if (data['filename'] && data['file_size']) {
        data = data.uid;
      } else {
        for (let key in data) {
          replaceAssetPayloadWithUids(data, key);
        }
      }
    }
  }
}

function getEntries(stack, payload) {
  return new Promise((resolve, reject) => {
    stack
      .contentType(payload.contentType)
      .entry()
      .query(payload.query)
      .find()
      .then((entries) => resolve(cleanEntries(entries.items || [])))
      .catch((error) => reject(error));
  });
}

function getEntriesCount(stack, payload) {
  // console.log('stack', stack);
  return new Promise((resolve, reject) => {
    stack
      .contentType(payload.contentType)
      .entry()
      .query(payload.query)
      .count()
      .then((entriesData) => resolve(entriesData.entries))
      .catch((error) => reject(formatError(error)));
  });
}

function formatError(error) {
  try {
    if (typeof error === 'string') {
      error = JSON.parse(error);
    } else {
      error = JSON.parse(error.message);
    }
  } catch (e) {}
  let message = error.errorMessage || error.error_message || error.message || error;
  if (error.errors && Object.keys(error.errors).length > 0) {
    Object.keys(error.errors).forEach((e) => {
      let entity = e;
      if (e === 'authorization') entity = 'Management Token';
      if (e === 'api_key') entity = 'Stack API key';
      if (e === 'uid') entity = 'Content Type';
      if (e === 'access_token') entity = 'Delivery Token';
      message += ' ' + [entity, error.errors[e]].join(' ');
    });
  }
  return message;
}

function cleanEntries(entries) {
  return entries.map((entry) => {
    delete entry.publish_details;
    delete entry.stackHeaders;
    delete entry.content_type_uid;
    delete entry.created_by;
    delete entry.updated_by;
    delete entry.published;
    return entry;
  });
}

module.exports = { replaceAssetPayloadWithUids, cleanEntries, getEntries, getEntriesCount };
