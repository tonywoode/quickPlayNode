const { Ends, end } = require("./states.js")
const {
  inputEmpty,
  checkRequire,
  isConfigValid,
  getSubDir
} = require("./processInput.js")
const { stat, isFile, getSize } = require("./checkFiles.js")
const log = msg => console.log(`[synctool] - ${msg}`)

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
          isConfigValid(config).orElse( err => end(Ends.InvalidConfig(err)))
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
