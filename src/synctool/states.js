const taggedSum = require('daggy').taggedSum
const quit = (code = 0) => process.exit(code)
const errorAndQuit = err => {
  console.log(`[synctool] error: ${err}`)
  quit(1)
}
const objPrint = obj => JSON.stringify(obj, null, 2)
const { rejected } = require('folktale/concurrency/task')
const Ends = taggedSum('EndStates', {
  NoFileGiven: [],
  NoConfigFile: ['filePath'],
  InvalidJson: ['errObj'],
  InvalidConfig: ['config'],
  FileOutsideSyncPaths: ['filePath', 'filePath'],
  FileNotFound: ['msg'],
  InvalidStat: ['filePath'],
  NotAFile: ['filePath'], // TODO: what do we do on symbolic links?
  RootDirNotFound: ['rootDir'],
  LocalAndRemoteMatch: ['filePath', 'filePath'],
  Synced: ['filePath', 'filePath'],
  ServerError: ['errObj']
})

const end = state =>
  state.cata({
    NoFileGiven: _ => rejected(`you must supply a filepath arg that you want to sync`),
    NoConfigFile: filePath => rejected(`config file not found in root: ${filePath}`),
    InvalidJson: err => rejected(`config file isn't valid json: ${err}`),
    InvalidConfig: config => rejected(`config invalid: ${objPrint(config)}`),
    FileOutsideSyncPaths: (filePath, localRoot) =>
      rejected(`${filePath} is not a subpath of local sync folder ${localRoot}`),
    InvalidStat: filePath => errorAndQuit(`file details are invalid for ${filePath}`),
    FileNotFound: msg => rejected(msg),
    NotAFile: filePath => errorAndQuit(`not a file - only files can be synced: ${filePath}`),
    RootDirNotFound: rootDir => errorAndQuit(`sync path can't be accessed: ${rootDir}`)
  })

module.exports = {
  Ends,
  end
}
