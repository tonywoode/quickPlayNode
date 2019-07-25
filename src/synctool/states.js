const taggedSum = require("daggy").taggedSum
const quit = (code = 0) => process.exit(code)
const errorAndQuit = err => {
  console.log(`[synctool] error: ${err}`)
  quit(1)
}
const objPrint = obj => JSON.stringify(obj, null, 2)

const Ends = taggedSum("EndStates", {
  NoFileGiven: [],
  NoConfigFile: ["filePath"],
  InvalidJson: ["errObj"],
  InvalidConfig: ["config"],
  FileOutsideSyncPaths: ["filePath", "filePath"],
  FileNotFound: ["msg"],
  InvalidStat: ["filePath"],
  NotAFile: ["filePath"], //TODO: what do we do on symbolic links?
  RootDirNotFound: ["rootDir"],
  LocalAndRemoteMatch: ["filePath", "filePath"],
  Synced: ["filePath", "filePath"],
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
      errorAndQuit(
        `${filePath} is not a subpath of local sync folder ${localPath}`
      ),
    InvalidStat: filePath =>
      errorAndQuit(`file details are invalid for ${filePath}`),
    FileNotFound: msg => errorAndQuit(msg),
    NotAFile: filePath =>
      errorAndQuit(`not a file - only files can be synced: ${filePath}`),
    RootDirNotFound: rootDir =>
      errorAndQuit(`sync path can't be accessed: ${rootDir}`)
  })


module.exports = {
  Ends,
  end
}
