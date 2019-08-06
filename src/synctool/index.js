const {
  checkRomPath,
  loadConfig,
  isRomPathInRootPath,
  doRootPathsExist,
  checkFile
} = require('./stateHandlers.js')
const path = require('path')
const { getSubDir } = require('./processInput.js')
const configFileName = 'synctool_config.json'
const objPrint = obj => JSON.stringify(obj, null, 2)
const { getSize, isFile } = require('./checkFiles.js')

const synctool = romPath => {
  checkRomPath(romPath) // check you passed me an input path
  const checkFiles = loadConfig(configFileName) // starts a Task
    // so we have a valid path and a root path, is path in root path
    .map(config => isRomPathInRootPath(config, romPath))
    // ok relativePath is stated to live under localRoot, but localRoot and remoteRoot need to exist
    .chain(config =>
      doRootPathsExist(config)
        .map(_ =>
          getSubDir(romPath)(config.localRoot)
            // first work out the relative path we'd have on remote
            //   we know the path.join is safe because we've shown both constituents are safe
            //   chaining over the result returns us the remotePath, uncontainerised, but we're still in the outer Task
            .chain(relativePath => {
              const remotePath = path.join(config.remoteRoot, relativePath)
              return remotePath
            })
        )
        // so we've got a remotePath, and we know localPath exists, turn the Task into a check of remotePath
        .chain(remotePath => checkFile(remotePath))
        .chain(remoteStat =>
          checkFile(romPath).map(localStat => {
            const larger = (a,b) => a > b
            const remoteSize = getSize(remoteStat)
            const localSize = getSize(localStat)
            return remoteSize.chain( remote => localSize.map( local =>
              larger(remote,local)
            ))
          })
        )
    )

  checkFiles.run().listen({
    onRejected: rej => console.log(`[synctool] unexpected error: ${rej}`),
    onResolved: result => console.log(`result is ${objPrint(result)}`)
  })
}
module.exports = { synctool }
