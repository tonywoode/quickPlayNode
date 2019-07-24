const taggedSum = require("daggy").taggedSum
const configFileName = "synctool_config.json"
const {
  inputEmpty,
  isConfigValid,
  getSubDir,
  checkRequire
} = require("./processInput.js")
const { stat, isFile, getSize } = require("./checkFiles.js")

const log = msg => console.log(`[synctool] - ${msg}`)
const objPrint = obj => JSON.stringify(obj, null, 2)
const quit = (code = 0) => process.exit(code)
const errorAndQuit = err => {
  console.log(`[synctool] error: ${err}`)
  quit(1)
}

const Ends = taggedSum("EndStates", {
  NoFileGiven: [],
  NoConfigFile: ["filePath"],
  InvalidJson: ["errObj"],
  InvalidConfig: ["config"],
  FileOutsideSyncPaths: ["filePath", "filePath"],
  FileNotFound: ["msg"],
  LocalAndRemoteMatch: ["filePath", "filePath"],
  Synced: ["filePath", "filePath"],
  NotAFile: ["filePath", "errObj"],
  ServerError: ["errObj"]
})

const end = state =>
  state.cata({
    NoFileGiven: _ =>
      errorAndQuit(`you must supply a filepath arg that you want to sync`),
    NoConfigFile: filePath =>
      errorAndQuit(`config file not found in root: ${filePath}`),
    InvalidJson: err => errorAndQuit(`config file isn't valid json: ${err}`),
    InvalidConfig: config =>
      errorAndQuit(`config invalid: ${objPrint(config)}`),
    FileOutsideSyncPaths: (filePath, localPath) =>
      errorAndQuit(`${filePath} is not in local sync folder ${localPath}`),
    FileNotFound: msg => errorAndQuit(msg)
  })

const getConfig = configFileName => {
  //check our config file is actually json
  const result = checkRequire(`../../${configFileName}`)
  //go into the Result of checking the json, and deal with both cases
  result.orElse(err => end(Ends.InvalidJson(err)))
  return result.chain(config => {
    //we know we have a json object, check get the keys out if they are the keys we expect
    isConfigValid(config).orElse(_ => end(Ends.InvalidConfig(config)))
    const { localPath, remotePath } = config
    log(`using local root: ${localPath}`)
    log(`using remote root: ${remotePath}`)
    return config
  })
}

const synctool = romPath => {
  //check you passed me an input path
  inputEmpty(romPath) && end(Ends.NoFileGiven)
  log(`checking rom path: ${romPath}`)
  //check + load config
  const checkFiles = stat(configFileName)
    .orElse(_ => end(Ends.NoConfigFile(configFileName)))
    .map(_ => getConfig(configFileName))
    //so we have a valid string, before io, is it in the root path
    .map(({ localPath, remotePath }) => {
      getSubDir(romPath)(localPath).orElse(_ =>
        end(Ends.FileOutsideSyncPaths(romPath, localPath))
      )
    })
    //we can be sure relativePath is stated to live under the localroot, so now does it exist?
    // first need to know if you've passed a dir or a file (for now do nothing on dir)
    .chain(_ => stat(romPath))
    .map(stat => {
      isFile(stat)
      return stat
    })
    .map(getSize)

  checkFiles.run().listen({
    onRejected: rej => end(Ends.FileNotFound(rej)),
    onResolved: result => console.log(`result is ${objPrint(result)}`)
  })
}
module.exports = { synctool }
