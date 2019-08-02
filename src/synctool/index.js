const {
  checkRomPath,
  loadConfig,
  isRomPathInRootPath,
  doRootPathsExist,
  checkFile
} = require('./stateHandlers.js')
const path = require("path")
const {getSubDir} = require('./processInput.js')
const configFileName = 'synctool_config.json'
const objPrint = obj => JSON.stringify(obj, null, 2)
const { getSize } = require('./checkFiles.js')

const synctool = romPath => {
  checkRomPath(romPath) // check you passed me an input path
  const checkFiles = loadConfig(configFileName) // starts a Task
    // so we have a valid path and a root path, is path in root path
    .map(config => isRomPathInRootPath(config, romPath))
    // ok relativePath is stated to live under localPath, but localPath and remotePath need to exist
    .chain(config => {
      return doRootPathsExist(config)
        .chain(_ => checkFile(romPath)) // check its not a dir
        .map(getSize)
        .map(localSize => {
          return getSubDir(romPath)(config.localPath)  
          // first work out the relative path we'd have on remote
          //   we know the path.join is safe because we've shown both consituents are safe
            .map(relativePath => path.join(config.remotePath, relativePath))
        })
    })

  checkFiles.run().listen({
    onRejected: rej => console.log(`[synctool] unexpected error: ${rej}`),
    onResolved: result => console.log(`result is ${objPrint(result)}`)
  })
}
module.exports = { synctool }
