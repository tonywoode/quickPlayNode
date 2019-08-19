const { join } = require('path')
const { dirname } = require('path')
const { of, rejected } = require('folktale/concurrency/task')
const { Ends, end } = require('./states.js')
const { inputEmpty, checkRequire, isConfigValid, getSubDir } = require('./processInput.js')
const { fileHash, mkdirRecursive, copyFile, humanFileSize } = require('./copyFile.js')
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
const checkLocalFile = localPath => {
  return stat(localPath)
    .orElse(rej => end(Ends.FileNotFound(rej)))
    .chain(
      stat =>
        // remember to wrap up the stat again if all is ok here
        isFile(stat).getOrElse(Ends.InvalidStat(localPath))
          ? of(stat)
          : end(Ends.NotAFile(localPath))
    )
}

// is file in remote? If not, be specific about why we're exiting
const checkRemoteFile = remotePath =>
  checkLocalFile(remotePath).orElse(fileError =>
    rejected(`File Not In Remote Folder: ${fileError}`)
  )

// Path -> Path -> Task Error _
const copyFileAndPath = (remotePath, localPath) =>
  mkdirRecursive(dirname(localPath)).chain(_ => copyFile(remotePath, localPath))

// Path -> Path -> Path ->  Task Error _
// hashing feels like a little overkill, could be lost
const copyIfNotEqual = (remotePath, localPath, remoteSize, remoteStat, localStat) =>{
console.log( "remote stat is " + JSON.stringify(remoteStat, null, 2))
console.log( "local stat is " + JSON.stringify(localStat, null, 2))
 return remoteStat.mtimeMs === localStat.mtimeMs ?
    end(Ends.FilesAreEqual(localPath, remotePath, localStat.mtime))
   : (log(`files aren't exactly the same, copying remote to local... - file is ${humanFileSize(remoteSize)}`),
            copyFileAndPath(remotePath, localPath))
  //return  fileHash(remotePath).chain(remoteHash =>
  //    fileHash(localPath).chain(
  //      localHash =>
  //        remoteHash === localHash
  //          ? end(Ends.FilesAreEqual(localPath, remotePath, remoteHash))
  //          : (log(`files aren't exactly the same, copying remote to local... - file is ${humanFileSize(remoteSize)}`),
  //          copyFileAndPath(remotePath, localPath))
  //    )
  //  )
}

// Path -> Size -> Path -> Size -> Task Error _
const copyIfLocalSmaller = (localPath, localSize, remotePath, remoteSize) =>
  larger(remoteSize, localSize)
    ? (log(`copying ${remotePath} to ${localPath} - file is ${humanFileSize(remoteSize)}`),
    copyFileAndPath(remotePath, localPath))
    : end(Ends.LocalFileLarger(localPath, localSize, remotePath, remoteSize))

// Error -> Path -> Path -> Task Error _
const copyIfLocalNotFound = (err, localPath, remotePath, remoteSize) =>
  err.includes('ENOENT')
    ? (log(`file appears remote but not local: ${err}`),
    // try to copy the file: its remote and cant be seen locally
    log(`copying ${remotePath} to ${localPath} - file is ${humanFileSize(remoteSize)}`),
    // first we'll need to make the appropriate path
    copyFileAndPath(remotePath, localPath))
    : rejected(err)

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
  copyIfLocalNotFound
}
