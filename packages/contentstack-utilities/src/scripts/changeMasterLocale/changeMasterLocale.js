let fs = require('fs').promises;
let path = require('path')
let config = require('./config.json')
let crypto = require('crypto')
let supportedLocales = require('./locales.json')

if (!supportedLocales[config.target_locale]) {
  console.log('Please specify a supported language in config.json. Refer to locales.json for all the supported languages')
  process.exit()
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
  let locales = await fs.readFile(path.resolve(config.data_dir, 'locales/locales.json'), 'utf-8')
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
  await fs.writeFile(path.resolve(config.data_dir, 'locales/locales.json'), JSON.stringify(locales))
  console.log(`Changed master locale to ${config.target_locale} successfully`)
}

async function handleEntries(masterLocale) {
  let contentTypes = await fs.readdir(path.resolve(config.data_dir, 'entries'))
  let sourceMasterLocaleEntries, targetMasterLocaleEntries
  for (let contentType of contentTypes) {
    sourceMasterLocaleEntries = await fs.readFile(path.resolve(config.data_dir, `entries/${contentType}/${masterLocale}.json`), {encoding: 'utf8'})
    sourceMasterLocaleEntries = JSON.parse(sourceMasterLocaleEntries)

    targetMasterLocaleEntries = await fs.readFile(path.resolve(config.data_dir, `entries/${contentType}/${config.target_locale}.json`), { encoding: 'utf8', flag: 'a+'})
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

    await fs.writeFile(path.resolve(config.data_dir, `entries/${contentType}/${config.target_locale}.json`), JSON.stringify(targetMasterLocaleEntries))
  }
}

try {
  tailorData()
} catch(e) {
  console.error(e)
}