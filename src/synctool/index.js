const os = require('os')
const { of, rejected } = require('folktale/concurrency/task')
const {
  checkLocalPath,
  loadConfig,
  isLocalPathInRootPath,
  doRootPathsExist,
  calculateRemotePath,
  checkLocalFile,
  checkRemoteFile,
  copyIfNotEqual,
  copyIfLocalSmaller,
  copyIfLocalNotFound,
  timeout
} = require('./stateHandlers.js')
const equal = (a, b) => a === b
// give synctool only the LOCAL path, and a config file that tells it how to make the remotePath
const synctool = (localPath, configFileName) =>
  checkLocalPath(localPath) // check you passed me an input path
    .chain(_ => loadConfig(configFileName))
    // so we have a valid path and a root path, is path in root path
    .chain(config =>
      isLocalPathInRootPath(config, localPath)
        // ok relativePath is stated to live under localRoot, but localRoot and remoteRoot need to exist
        .chain(config => doRootPathsExist(config))
        .or(timeout(config.timeout)) // you have to ensure config is in scope here
        .map(_ => calculateRemotePath(localPath, config))
        // worked out the relative path we'd have on remote
        .chain(remotePath =>
          checkRemoteFile(remotePath)
            // remote exists
            .chain(remoteStat =>
              checkLocalFile(localPath)
                // the files in both places, check dest is smaller, or maybe they are same file
                .chain(
                  localStat =>
                    equal(remoteStat.size, localStat.size) // filesize is equal, but check really same before deciding
                      ? copyIfNotEqual(remotePath, localPath, remoteStat, localStat, config.timeTolerance) // prettier-ignore
                      : copyIfLocalSmaller(localPath, remotePath, remoteStat, localStat)
                )
                /* we need to put a sad path on the happy path (failed local stat), we're now
                   * responsible for making sure that's why we got here */
                .orElse(err => copyIfLocalNotFound(err, localPath, remotePath, remoteStat))
            )
        )
    )

// client is able to not run synctool unless askedto
const synctoolEnable = configFileName =>
  configFileName
    ? loadConfig(configFileName)
      .orElse(rej => rejected(`[syncToolEnable] - ${rej}`))
      .chain(
        config =>
          config.globalEnable
            ? of('[syncToolEnable] - SyncTool is Enabled')
            : config.enableOnHostName &&
                config.enableOnHostName.map(hostName => hostName === os.hostname())
              ? of('[syncToolEnable] - SyncTool is Enabled')
              : of('[syncToolEnable] - SyncTool is Disabled')
      )
    : rejected('[synctoolEnable] - no config filename passed')

module.exports = { synctool, synctoolEnable }
