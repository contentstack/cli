let fs = require('fs').promises;
let path = require('path')
let crypto = require('crypto')
let supportedLocales = require('./locales.json')
const { pathValidator, sanitizePath } = require('@contentstack/cli-utilities')

module.exports = async ({migration, config}) => {
    let changeMasterLocale = {
      title: 'Change master locale',
      successMessage: 'Changed master locale successfully for the given data',
      failMessage: 'Failed to execute successfully',
      task: async (params) => {

        if (!supportedLocales[config.target_locale]) {
          throw new Error('Please specify a supported language in config.json. For a list of all supported languages, refer to https://www.contentstack.com/docs/developers/multilingual-content/list-of-supported-languages')
        }

        function getMasterLocale(locales) {
          let localeUids = new Set()
          let fallbackLocales = new Set()

          Object.keys(locales).forEach(uid => {
            let data = locales[uid]
            localeUids.add(data.code)
            fallbackLocales.add(data.fallback_locale)
          })

          return [...fallbackLocales].filter(i => !localeUids.has(i)).pop()
        }

        async function tailorData () {
          let locales = await fs.readFile(pathValidator(path.resolve(config.data_dir, 'locales/locales.json')), 'utf-8')
          locales = JSON.parse(locales)
          let masterLocale = getMasterLocale(locales)
          let id = crypto.randomBytes(8).toString('hex');
          if (Object.values(locales).map(locale => locale.code).includes(config.target_locale)) {
            let targetLocaleUid = Object.keys(locales).filter(uid => locales[uid].code === config.target_locale).pop()
            delete locales[targetLocaleUid]
          }
          locales[id] = {};
          locales[id].uid = id
          locales[id].code = masterLocale
          locales[id].name = supportedLocales[masterLocale]
          locales[id].fallback_locale = config.target_locale
          
          await handleEntries(masterLocale)
          await fs.writeFile(pathValidator(path.resolve(config.data_dir, 'locales/locales.json')), JSON.stringify(locales))
        }

        async function handleEntries(masterLocale) {
          let contentTypes = await fs.readdir(pathValidator(path.resolve(config.data_dir, 'entries')))
          let sourceMasterLocaleEntries, targetMasterLocaleEntries
          for (let contentType of contentTypes) {
            sourceMasterLocaleEntries = await fs.readFile(pathValidator(path.resolve(sanitizePath(config.data_dir), `entries/${sanitizePath(contentType)}/${sanitizePath(masterLocale)}.json`)), {encoding: 'utf8'})
            sourceMasterLocaleEntries = JSON.parse(sourceMasterLocaleEntries)

            targetMasterLocaleEntries = await fs.readFile(pathValidator(path.resolve(sanitizePath(config.data_dir), `entries/${sanitizePath(contentType)}/${sanitizePath(config.target_locale)}.json`)), { encoding: 'utf8', flag: 'a+'})
            if (targetMasterLocaleEntries.length === 0) {
              targetMasterLocaleEntries = {}
            } else {
              targetMasterLocaleEntries = JSON.parse(targetMasterLocaleEntries)
            }

            Object.keys(sourceMasterLocaleEntries).forEach(uid => {
              if (!targetMasterLocaleEntries[uid]) {
                targetMasterLocaleEntries[uid] = JSON.parse(JSON.stringify(sourceMasterLocaleEntries[uid]))
                delete targetMasterLocaleEntries[uid]['publish_details']
                targetMasterLocaleEntries[uid].locale = config.target_locale;
              }
            })

            await fs.writeFile(pathValidator(path.resolve(config.data_dir, `entries/${contentType}/${config.target_locale}.json`)), JSON.stringify(targetMasterLocaleEntries))
          }
        }

        await tailorData()
        
      }

    }
    migration.addTask(changeMasterLocale);
}