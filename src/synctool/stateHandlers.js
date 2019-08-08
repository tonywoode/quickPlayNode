const { Ends, end } = require('./states.js')
const { inputEmpty, checkRequire, isConfigValid, getSubDir } = require('./processInput.js')
const { stat, isFile, getSize } = require('./checkFiles.js')
const log = msg => console.log(`[synctool] - ${msg}`)
const { of } = require('folktale/concurrency/task')
const checkRomPath = romPath => {
  log(`checking rom path: ${romPath}`)
  return inputEmpty(romPath) ? end(Ends.NoFileGiven) : of('valid path')
}

// String -> Task Error Object
const loadConfig = configFileName =>
  stat(configFileName)
    .orElse(_ => end(Ends.NoConfigFile(configFileName)))
    // return a task, the orElse above does
    //  so we can chain here. If we don't: we'll carry on even if e.g.: the json is invalid
    .chain(_ =>
      checkRequire(`../../${configFileName}`) // check config file importable as json
        .orElse(err => end(Ends.InvalidJson(err)))
        .chain((
          config // ok we have json, check key names are as expected
        ) =>
          isConfigValid(config)
            .orElse(err => end(Ends.InvalidConfig(err)))
            .chain(_ => {
              const { localRoot, remoteRoot } = config
              log(`using local root: ${localRoot}`)
              log(`using remote root: ${remoteRoot}`)
              return of(config) // return a task
            })
        )
    )

const isRomPathInRootPath = ({ localRoot, remoteRoot }, romPath) => {
  return getSubDir(romPath)(localRoot)
    .orElse(_ => end(Ends.FileOutsideSyncPaths(romPath, localRoot)))
    .chain(_ => of({ localRoot, remoteRoot }))
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
  return (
    stat(romPath)
      .orElse(rej => end(Ends.FileNotFound(rej)))
      .chain(
        stat =>
          // remember to wrap up the stat again if all is ok here
          isFile(stat).getOrElse(Ends.InvalidStat(romPath)) ? of(stat) : end(Ends.NotAFile(romPath))
      )
  )
}

module.exports = {
  checkRomPath,
  loadConfig,
  isRomPathInRootPath,
  doRootPathsExist,
  checkFile
}
