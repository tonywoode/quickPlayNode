const { Ends, end } = require('./states.js')
const { inputEmpty, checkRequire, isConfigValid, getSubDir } = require('./processInput.js')
const { stat, isFile } = require('./checkFiles.js')
const log = msg => console.log(`[synctool] - ${msg}`)
const { of } = require('folktale/concurrency/task')
const checkLocalPath = localPath => {
  log(`checking rom path: ${localPath}`)
  return inputEmpty(localPath) ? end(Ends.NoFileGiven) : of('valid path')
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

const isLocalPathInRootPath = ({ localRoot, remoteRoot }, localPath) => {
  return getSubDir(localPath)(localRoot)
    .orElse(_ => end(Ends.FileOutsideSyncPaths(localPath, localRoot)))
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
const checkFile = localPath => {
  return (
    stat(localPath)
      .orElse(rej => end(Ends.FileNotFound(rej)))
      .chain(
        stat =>
          // remember to wrap up the stat again if all is ok here
          isFile(stat).getOrElse(Ends.InvalidStat(localPath)) ? of(stat) : end(Ends.NotAFile(localPath))
      )
  )
}

module.exports = {
  checkLocalPath,
  loadConfig,
  isLocalPathInRootPath,
  doRootPathsExist,
  checkFile
}
