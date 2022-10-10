const { parentPort } = require('worker_threads')
const { makeEntriesConcurrentCall } = require('./entries')

parentPort.on('message', (message) => {
  const { operation, env} = message

   switch (operation) {
    case 'get-entries':
      try {
        makeEntriesConcurrentCall(env)
          .then(() => {
            parentPort.postMessage({
              action: 'done',
              message: `Export of ${env.content_type} is done.`
            })
          })
      } catch (error) {
        console.log(error)
      }
      break
    case 'get-entry':
      break
    case 'get-assets':
      break
  }
})