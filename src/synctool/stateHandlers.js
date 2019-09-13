const { join } = require('path')
const { dirname } = require('path')
const { of, rejected, task } = require('folktale/concurrency/task')
const { Ends, end } = require('./states.js')
const { inputEmpty, checkRequire, isConfigValid, getSubDir } = require('./processInput.js')
const { mkdirRecursive, copyFileStream, humanFileSize } = require('./copyFile.js')
const { stat, isFile } = require('./checkFiles.js')
const log = msg => console.log(`[synctool] - ${msg}`)
const checkLocalPath = localPath => {
  log(`checking rom path: ${localPath}`)
  return inputEmpty(localPath) ? end(Ends.NoFileGiven) : of('valid path')
}
const larger = (a, b) => a > b

// String -> Task Error Object
const loadConfig = configFileName =>
  stat(configFileName)
    .orElse(_ => end(Ends.NoConfigFile(configFileName)))
    // return a task, the orElse above does
    //  so we can chain here. If we don't: we'll carry on even if e.g.: the json is invalid
    .chain(_ =>
      checkRequire(join(process.cwd(), configFileName)) // check config file importable as json
        .orElse(
          err =>
            (err.toString().includes('SyntaxError') && end(Ends.InvalidJson(err))) || rejected(err)
        )
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

// Object -> Path -> Task Error Object
const isLocalPathInRootPath = ({ localRoot, remoteRoot }, localPath) =>
  getSubDir(localPath)(localRoot)
    .orElse(_ => end(Ends.FileOutsideSyncPaths(localPath, localRoot)))
    .chain(_ => of({ localRoot, remoteRoot }))

// Object -> Task Error Stat
const doRootPathsExist = ({ localRoot, remoteRoot }) => {
  log(`checking roots exist: \n ${localRoot} \n ${remoteRoot}`)
  return (
    stat(localRoot)
      .chain(_ => stat(remoteRoot))
      // don't forget that last option, something went wrong checking, wasn't about the paths
      .orElse(
        err =>
          err.includes(localRoot)
            ? end(Ends.RootDirNotFound(localRoot, err))
            : err.includes(remoteRoot) ? end(Ends.RootDirNotFound(remoteRoot, err)) : rejected(err)
      )
  )
}

// Path -> Object -> Path
/* when given a path, a subpath, and a new submpath, return path under new subpath
 * path.join is safe: we've shown both constituents are safe */
const calculateRemotePath = (localPath, { localRoot, remoteRoot }) =>
  getSubDir(localPath)(localRoot).chain(relativePath => join(remoteRoot, relativePath))

// Path -> Task Error Stat
// check file exists, and that stat confirms its a file (for now do nothing on dir)
const checkLocalFile = localPath =>
  stat(localPath)
    .orElse(rej => end(Ends.FileNotFound(rej)))
    .chain(
      stat =>
        // remember to wrap up the stat again if all is ok here
        isFile(stat).getOrElse(Ends.InvalidStat(localPath))
          ? of(stat)
          : end(Ends.NotAFile(localPath))
    )

// is file in remote? If not, be specific about why we're exiting
const checkRemoteFile = remotePath =>
  checkLocalFile(remotePath).orElse(fileError =>
    rejected(`File Not In Remote Folder: ${fileError}`)
  )

// Path -> Path -> Task Error _
const copyFileAndPath = (remotePath, localPath, remoteStat) =>
  mkdirRecursive(dirname(localPath)).chain(_ => copyFileStream(remotePath, localPath, remoteStat))

// Path -> Path -> Path ->  Task Error _
// modified times are often only very slightly different, i'm not entirely sure why, tolerance required
const copyIfNotEqual = (remotePath, localPath, remoteStat, localStat, timeTolerance = 1000) => {
  console.log('remote stat is ' + JSON.stringify(remoteStat, null, 2))
  console.log('local stat is ' + JSON.stringify(localStat, null, 2))
  const min = localStat.mtimeMs - timeTolerance
  const max = localStat.mtimeMs + timeTolerance
  return remoteStat.mtimeMs >= min && remoteStat.mtimeMs <= max
    ? end(Ends.FilesAreEqual(localPath, remotePath, localStat.mtime))
    : (log(
      `files aren't exactly the same, copying remote to local... - file is ${humanFileSize(
        remoteStat.size
      )}`
    ),
    copyFileAndPath(remotePath, localPath, remoteStat))
}

// Path -> Path -> Stat -> Stat -> Task Error _
const copyIfLocalSmaller = (localPath, remotePath, remoteStat, localStat) =>
  larger(remoteStat.size, localStat.size)
    ? (log(`copying ${remotePath} to ${localPath} - file is ${humanFileSize(remoteStat.size)}`),
    copyFileAndPath(remotePath, localPath, remoteStat))
    : end(Ends.LocalFileLarger(localPath, localStat.size, remotePath, remoteStat.size))

// Error -> Path -> Path -> Stat -> Task Error _
const copyIfLocalNotFound = (err, localPath, remotePath, remoteStat) =>
  err.includes('ENOENT')
    ? (log(`file appears remote but not local: ${err}`),
    // try to copy the file: its remote and cant be seen locally
    log(`copying ${remotePath} to ${localPath} - file is ${humanFileSize(remoteStat.size)}`),
    // first we'll need to make the appropriate path
    copyFileAndPath(remotePath, localPath, remoteStat))
    : rejected(err)

// rather than insist the timeout key exists in the config, have a default
const timeout = (ms = 10000) =>
  task(r => {
    const timerId = setTimeout(() => r.reject('timeout seeking paths'), ms)
    r.cleanup(() => clearTimeout(timerId))
  })

module.exports = {
  checkLocalPath,
  loadConfig,
  isLocalPathInRootPath,
  doRootPathsExist,
  calculateRemotePath,
  checkLocalFile,
  checkRemoteFile,
  copyFileAndPath,
  copyIfNotEqual,
  copyIfLocalSmaller,
  copyIfLocalNotFound,
  timeout
}
