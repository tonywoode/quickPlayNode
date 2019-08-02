const { Ends, end } = require('./states.js')
const { inputEmpty, checkRequire, isConfigValid, getSubDir } = require('./processInput.js')
const { stat, isFile, getSize } = require('./checkFiles.js')
const log = msg => console.log(`[synctool] - ${msg}`)

const checkRomPath = romPath => {
  inputEmpty(romPath) && end(Ends.NoFileGiven)
  log(`checking rom path: ${romPath}`)
}

const loadConfig = configFileName =>
  stat(configFileName)
    .orElse(_ => end(Ends.NoConfigFile(configFileName)))
    .map(_ =>
      checkRequire(`../../${configFileName}`) // check config file importable as json
        .orElse(err => end(Ends.InvalidJson(err)))
        .chain(config => {
          // ok we have json, check key names are as expected
          isConfigValid(config).orElse(err => end(Ends.InvalidConfig(err)))
          const { localRoot, remoteRoot } = config
          log(`using local root: ${localRoot}`)
          log(`using remote root: ${remoteRoot}`)
          return config
        })
    )

const isRomPathInRootPath = ({ localRoot, remoteRoot }, romPath) => {
  getSubDir(romPath)(localRoot).orElse(_ => end(Ends.FileOutsideSyncPaths(romPath, localRoot)))
  return { localRoot, remoteRoot }
}

const doRootPathsExist = ({ localRoot, remoteRoot }) => {
  log(`checking roots exist: \n ${localRoot} \n ${remoteRoot}`)
  return stat(localRoot)
    .orElse(_ => end(Ends.RootDirNotFound(localRoot)))
    .chain(_ => stat(remoteRoot))
    .orElse(_ => end(Ends.RootDirNotFound(remoteRoot)))
}

// check file exists, and that stat confirms its a file
//  (for now do nothing on dir)
const checkFile = romPath => {
  return stat(romPath)
    .orElse(rej => end(Ends.FileNotFound(rej)))
    .map(stat => {
      isFile(stat).getOrElse(Ends.InvalidStat(romPath)) || end(Ends.NotAFile(romPath))
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
