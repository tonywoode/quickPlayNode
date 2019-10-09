const os = require('os')
const { task, of, rejected } = require('folktale/concurrency/task')
const replace = require('replace-in-file')
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
const { getRealPath } = require('./checkFiles.js')
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
              // we potentially need the real local path now for fs methods in case a symlink is sitting at the localPath, but we DON'T want it when statting
              getRealPath(localPath).chain(
                realLocalPath =>
                  checkLocalFile(localPath) // statting one more time
                    .chain(
                      localStat =>
                      // the files in both places, check dest is smaller, or maybe they are same file
                        equal(remoteStat.size, localStat.size) // filesize is equal, but check really same before deciding
                          ? copyIfNotEqual(remotePath, realLocalPath, remoteStat, localStat, config)
                          : copyIfLocalSmaller(realLocalPath, remotePath, remoteStat, localStat, config) // prettier-ignore
                    )
                  /* we need to put a sad path on the happy path (failed local stat), we're now
                   * responsible for making sure that's why we got here */
                    .orElse(err => copyIfLocalNotFound(err, realLocalPath, remotePath, remoteStat, config)) // prettier-ignore
              )
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

const tagMsg = msg => `[Synctool Folder Flip] - ${msg}`
const log = (message, obj) => console.log(`${tagMsg(message)}: \n`, obj || '')
const haveRomdatasChanged = results => results.filter(result => result.hasChanged).length !== 0
const getChangedRomdatas = results =>
  results.filter(result => result.hasChanged).map(result => result.file)
const printObj = obj => JSON.stringify(obj, null, 2)
const formatResults = results => tagMsg(`Files Changed: \n` + printObj(getChangedRomdatas(results)))

const synctoolFolderFlip = (startFolder, configFileName) =>
  configFileName
    ? loadConfig(configFileName)
      .orElse(rej => rejected(`[syncToolEnable] - ${rej}`))
      .chain(config => {
        const remoteToLocal = {
          files: `${startFolder}/**/romdata.dat`,
          from: new RegExp(`¬` + config.remoteRoot, 'g'), // its root node so don't remove trailing path
          to: `¬` + config.localRoot,
          encoding: `latin1`
        }
        const localToRemote = {
          files: `${startFolder}/**/romdata.dat`,
          from: new RegExp('¬' + config.localRoot, 'g'),
          to: `¬` + config.remoteRoot,
          encoding: `latin1`
        }
        log(`starting folder is ${startFolder}`)

        return task(
          r => (
            log(`changing all Remote to Local:`, remoteToLocal),
            replace(remoteToLocal, (err, results) =>
              err
                ? r.reject(tagMsg(err))
                : haveRomdatasChanged(results)
                  ? r.resolve(formatResults(results))
                  : (log(`no changes for Remote to Local, try Local to Remote:`, localToRemote),
                  replace(localToRemote, (err, results) =>
                    err
                      ? r.reject(tagMsg(err))
                      : haveRomdatasChanged(results)
                        ? r.resolve(formatResults(results))
                        : r.resolve(tagMsg(`found nothing trying to change Local to Remote either`)
                        )
                  ))
            ) // prettier-ignore
          )
        )
      })
    : rejected(tagMsg('no config filename passed'))

module.exports = { synctool, synctoolEnable, synctoolFolderFlip }
