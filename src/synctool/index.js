const taggedSum = require("daggy").taggedSum
const { either } = require('../helpers/sanctuary.js')
const { compose } = require("ramda")
const Result = require("folktale/result")

const config = require("../../synctool_config.json")
const { localPath, remotePath } = config
const { isString, strEmpty, isConfigValid, getSubDir } = require("./processInput.js")
const { stat, isDir, isFile, getSize, fileIsNotEmpty } = require("./checkFiles.js")

const log = msg => console.log(`[synctool] - ${msg}`)
const objPrint = obj => JSON.stringify(obj, null,2)
const quit = (code = 0) => process.exit(code)
const errorAndQuit = err => {
  console.log(`[synctool] error: ${err}`)
  quit(1)
}

const Ends = taggedSum('EndStates', {
  NoFileGiven: [],
  InvalidConfig: ['config'],
  FileOutsideSyncPaths: ['filePath', 'filePath'],
  FileNotFound: ['filePath'],
  LocalAndRemoteMatch: ['filePath', 'filePath'],
  Synced: ['filePath', 'filePath'],
  NotAFile: ['filePath', 'errObj'],
  ServerError: ['errObj']
})

const end = state =>
  state.cata({
    NoFileGiven: _ => errorAndQuit(`you must supply a filepath to sync`),
    InvalidConfig: config => errorAndQuit(`config invalid: ${objPrint(config)}`),
    FileOutsideSyncPaths: (filePath, localPath) => errorAndQuit(`${filePath} is not in local sync folder ${localPath}`)

  })



const synctool = romPath => {
  (!isString(romPath) || strEmpty(romPath) ) && end(Ends.NoFileGiven)  //if we couldn't read the config keys, quit
  isConfigValid(config).orElse(_ => end(Ends.InvalidConfig(config)))

  //TODO: the check for remotePath and localPath keys are short-circuiting, actually i want to error if either OR both are not there
  log(`using local root: ${localPath}`)
  log(`using remote root: ${remotePath}`)
  log(`checking rom path: ${romPath}`)

  //so we have a valid string, before io, is it in the root path
  getSubDir(romPath)(localPath).orElse( _ => end(Ends.FileOutsideSyncPaths(romPath, localPath) ))
  
  //we can be sure relativePath is stated to live under the localroot, so now does it exist
  // first we need to know if you've passed a dir or a file, for now do nothing on dir
  const size = stat(romPath)
    .map(stat => { 
      fileIsNotEmpty(stat)
      return stat
    })
    .map(stat => {
      isFile(stat)
      return stat
    })
    .map(getSize) 

  size.run().listen({
    onRejected: rej => console.log(rej), 
    onResolved: result => console.log(`result is ${objPrint(result)}`)
  })
}
module.exports = { synctool }
