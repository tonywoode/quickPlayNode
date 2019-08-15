const {
  checkLocalPath,
  loadConfig,
  isLocalPathInRootPath,
  doRootPathsExist,
  calculateRemotePath,
  checkFile,
  copyFileAndPath,
  checkReallyEqual
} = require('./stateHandlers.js')
const { Ends, end } = require('./states.js')
const { dirname } = require('path')
const { rejected } = require('folktale/concurrency/task')
const objPrint = obj => JSON.stringify(obj, null, 2)
const { getSize } = require('./checkFiles.js')
const { fileHash, mkdirRecursive, copyFile } = require('./copyFile.js')

const larger = (a, b) => a > b
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
                  // the files in both places, check dest is smaller
                  .chain(localStat =>
                    getSize(remoteStat).chain(remote =>
                      getSize(localStat).chain(
                        local =>
                          equal(remote, local)
                            // filesize is equal, but check really same before deciding
                            ? checkReallyEqual(remotePath, localPath)
                            : larger(remote, local)
                              ? copyFileAndPath(remotePath, localPath)
                              : end(Ends.LocalFileLarger(localPath, local, remotePath, remote))
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
