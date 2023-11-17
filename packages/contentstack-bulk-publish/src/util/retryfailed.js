const { getAllLogs } = require('./logger');
const { getStack } = require('./client.js');

module.exports = async (filename, queue, Type) => {
  const logs = await getAllLogs(filename);
  if (logs.file.length > 0) {
    logs.file.forEach(async (log) => {
      const stackOptions = {host: log.message.host };
      if(log.message.alias) {
        stackOptions["alias"] = log.message.alias
      } else {
        stackOptions["stackApiKey"] = log.message.api_key
      }
      if (Type === 'bulk') {        
        log.message.options.stack = await getStack(stackOptions);
        queue.Enqueue(log.message.options);
      }
      if (Type === 'publish') {
        if (log.message.options.Type === 'entry') {
          queue.entryQueue.Enqueue({
            content_type: log.message.options.content_type,
            publish_details: log.message.options.publish_details,
            environments: log.message.options.environments,
            entryUid: log.message.options.entryUid,
            locale: log.message.options.locale,
            Type: 'entry',
            stack: await getStack(stackOptions),
          });
        } else {
          queue.assetQueue.Enqueue({
            assetUid: log.message.options.assetUid,
            publish_details: log.message.options.publish_assets,
            environments: log.message.options.environments,
            Type: 'asset',
            stack: await getStack(stackOptions),
          });
        }
      }
    });
  } else {
    throw new Error('NO FAILURE LOGS WERE FOUND');
  }
};
