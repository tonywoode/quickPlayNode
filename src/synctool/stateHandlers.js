const taggedSum = require("daggy").taggedSum
const {
  inputEmpty,
  isConfigValid,
  getSubDir,
  checkRequire
} = require("./processInput.js")
const { stat, isFile, getSize } = require("./checkFiles.js")

const log = msg => console.log(`[synctool] - ${msg}`)
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

const checkRomPath = romPath => {
  inputEmpty(romPath) && end(Ends.NoFileGiven)
  log(`checking rom path: ${romPath}`)
}

const loadConfig = configFileName =>
  stat(configFileName)
    .orElse(_ => end(Ends.NoConfigFile(configFileName)))
    .map(_ =>
      checkRequire(`../../${configFileName}`) //check config file importable as json
        .orElse(err => end(Ends.InvalidJson(err)))
        .chain(config => {
          //ok we have json, check key names are as expected
          isConfigValid(config).orElse(_ => end(Ends.InvalidConfig(config)))
          const { localPath, remotePath } = config
          log(`using local root: ${localPath}`)
          log(`using remote root: ${remotePath}`)
          return config
        })
    )

const isRomPathInRootPath = ({ localPath, remotePath }, romPath) => {
  getSubDir(romPath)(localPath).orElse(_ =>
    end(Ends.FileOutsideSyncPaths(romPath, localPath))
  )
  return { localPath, remotePath }
}

const doRootPathsExist = ({ localPath, remotePath }) => {
  log(`checking roots exist: \n ${localPath} \n ${remotePath}`)
  return stat(localPath)
    .orElse(_ => end(Ends.RootDirNotFound(localPath)))
    .chain(_ => stat(remotePath))
    .orElse(_ => end(Ends.RootDirNotFound(remotePath)))
}

//check file exists, and that stat confirms its a file 
//  (for now do nothing on dir)
const checkFile = romPath => {
  return stat(romPath)
    .orElse(rej => end(Ends.FileNotFound(rej)))
    .map(stat => {
      isFile(stat).getOrElse(Ends.InvalidStat(romPath)) ||
        end(Ends.NotAFile(romPath))
      return stat
    })
}

module.exports = {
  checkRomPath,
  loadConfig,
  isRomPathInRootPath,
  doRootPathsExist,
  checkFile
}
