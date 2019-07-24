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

const checkRomPath = romPath => {
  inputEmpty(romPath) && end(Ends.NoFileGiven)
  log(`checking rom path: ${romPath}`)
}

const getConfig = configFileName =>
  checkRequire(`../../${configFileName}`) //check config file is json
    .orElse(err => end(Ends.InvalidJson(err)))
    .chain(config => {
      //ok we have json, check key names are as expected
      isConfigValid(config).orElse(_ => end(Ends.InvalidConfig(config)))
      const { localPath, remotePath } = config
      log(`using local root: ${localPath}`)
      log(`using remote root: ${remotePath}`)
      return config
    })

//check the stat confirms its a file (for now do nothing on dir)
const checkItsAFile = romPath =>
  stat(romPath).map(stat => {
    isFile(stat).getOrElse(Ends.InvalidStat(romPath)) ||
      end(Ends.NotAFile(romPath))
    return stat
  })

const synctool = romPath => {
  checkRomPath(romPath) //check you passed me an input path
  const checkFiles = stat(configFileName) //check + load config
    .orElse(_ => end(Ends.NoConfigFile(configFileName)))
    .map(_ => getConfig(configFileName))
    //so we have a valid string, is it in the root path
    .map(({ localPath, remotePath }) => {
      getSubDir(romPath)(localPath).orElse(_ =>
        end(Ends.FileOutsideSyncPaths(romPath, localPath))
      )
      return { localPath, remotePath }
    }) //ok relativePath is stated to live under localPath
    //but localPath and remotePath need to exist
    .chain(({ localPath, remotePath }) => {
      log(`checking roots exist: \n ${localPath} \n ${remotePath}`)
      return stat(localPath)
        .orElse(_ => end(Ends.RootDirNotFound(localPath)))
        .chain(_ => stat(remotePath))
        .orElse(_ => end(Ends.RootDirNotFound(remotePath)))
    })
    .chain(_ => checkItsAFile(romPath))
    .map(getSize)

  checkFiles.run().listen({
    onRejected: rej => end(Ends.FileNotFound(rej)),
    onResolved: result => console.log(`result is ${objPrint(result)}`)
  })
}
module.exports = { synctool }
