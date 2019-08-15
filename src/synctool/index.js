const {
  checkLocalPath,
  loadConfig,
  isLocalPathInRootPath,
  doRootPathsExist,
  calculateRemotePath,
  checkFile,
  copyFileAndPath,
  checkReallyEqual,
  copyIfLocalSmaller
} = require('./stateHandlers.js')
const { rejected } = require('folktale/concurrency/task')
const { getSize } = require('./checkFiles.js')

const equal = (a, b) => a === b
// give synctool only the LOCAL path, and a config file that tells it how to make the remotePath
const synctool = (localPath, configFileName) => {
  return (
    checkLocalPath(localPath) // check you passed me an input path
      .chain(_ => loadConfig(configFileName))
      // so we have a valid path and a root path, is path in root path
      .chain(config => isLocalPathInRootPath(config, localPath))
      // ok relativePath is stated to live under localRoot, but localRoot and remoteRoot need to exist
      .chain(config =>
        doRootPathsExist(config)
          // work out the relative path we'd have on remote
          .map(_ => calculateRemotePath(localPath, config))
          .chain(remotePath =>
            // is file in remote? If not, be specific about why we're exiting
            checkFile(remotePath)
              .orElse(fileError => rejected(`File Not In Remote Folder: ${fileError}`))
              .chain(remoteStat =>
                checkFile(localPath)
                  // the files in both places, check dest is smaller, or maybe they are same file
                  .chain(localStat =>
                    getSize(remoteStat).chain(remoteSize =>
                      getSize(localStat).chain(
                        localSize =>
                          equal(remoteSize, localSize)
                            // filesize is equal, but check really same before deciding
                            ? checkReallyEqual(remotePath, localPath)
                            : copyIfLocalSmaller(localPath, localSize, remotePath, remoteSize)
                      )
                    )
                  )
                  .orElse(err => {
                    /* we need to put a sad path on the happy path (failed local stat), we're now
                   * responsible for making sure that's why we got here */
                    if (err.includes('ENOENT')) {
                      console.log(`[synctool] - file appears remote but not local: ${err}`)
                      // try to copy the file: its remote and cant be seen locally
                      console.log(`[synctool] - copying ${remotePath} to ${localPath}`)
                      // first we'll need to make the appropriate path
                      return copyFileAndPath(remotePath, localPath)
                    } else {
                      return rejected(err)
                    }
                  })
              )
          )
      )
  )
}
module.exports = { synctool }
