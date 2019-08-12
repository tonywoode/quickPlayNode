const {
  checkLocalPath,
  loadConfig,
  isLocalPathInRootPath,
  doRootPathsExist,
  checkFile
} = require('./stateHandlers.js')
const { join, dirname } = require('path')
const { rejected } = require('folktale/concurrency/task')
const { getSubDir } = require('./processInput.js')
const objPrint = obj => JSON.stringify(obj, null, 2)
const { getSize } = require('./checkFiles.js')
const {mkdirRecursive, copyFile} = require('./copyFile.js')
const synctool = (localPath, configFileName) => {
  return (
    checkLocalPath(localPath) // check you passed me an input path
      .chain(_ => loadConfig(configFileName)) // starts a Task
      // so we have a valid path and a root path, is path in root path
      .chain(config => isLocalPathInRootPath(config, localPath))
      // ok relativePath is stated to live under localRoot, but localRoot and remoteRoot need to exist
      .chain(config =>
        doRootPathsExist(config)
          .map(_ =>
            // work out the relative path we'd have on remote
            getSubDir(localPath)(config.localRoot)
              //   path.join is safe:  we've shown both constituents are safe
              //   return remotePath uncontainerised: we're still in outer Task
              .chain(relativePath => join(config.remoteRoot, relativePath))
          )
          .chain(remotePath =>
            checkFile(remotePath)
              // describe remote path error more specifically
              .orElse(fileError => rejected(`File Not In Remote Folder: ${fileError}`))
              .chain(remoteStat =>
                checkFile(localPath)
                  .orElse(err => {
                    console.log(`[synctool] - file appears remote but not local: ${err}`)
                    // return rejected(err)
                    /* actually: try to copy the file: its remote and cant be seen locally */
                    console.log(`[synctool] - copying ${remotePath} to ${localPath}`)
                    //first we'll need to make the appropriate path
                    const neededDir = dirname(localPath)
                    return mkdirRecursive(neededDir)                  
                      .chain( _ => copyFile(remotePath, localPath))
                  })
                  // the files in both places, check dest is smaller
                  .map(localStat => {
                    const larger = (a, b) => a > b
                    const remoteSize = getSize(remoteStat)
                    const localSize = getSize(localStat)
                    return remoteSize.chain(remote => localSize.map(local => larger(remote, local)))
                  })
              )
          )
      )
  )
}
module.exports = { synctool }
