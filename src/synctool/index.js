const taggedSum = require("daggy").taggedSum
const configFileName = "synctool_config.json"
const { inputEmpty, isConfigValid, getSubDir } = require("./processInput.js")
const { stat, isFile, getSize } = require("./checkFiles.js")

const log = msg => console.log(`[synctool] - ${msg}`)
const objPrint = obj => JSON.stringify(obj, null, 2)
const quit = (code = 0) => process.exit(code)
const errorAndQuit = err => {
  console.log(`[synctool] error: ${err}`)
  quit(1)
}

const Ends = taggedSum("EndStates", {
  NoFileGiven: [],
  InvalidConfig: ["config"],
  FileOutsideSyncPaths: ["filePath", "filePath"],
  FileNotFound: ["msg"],
  LocalAndRemoteMatch: ["filePath", "filePath"],
  Synced: ["filePath", "filePath"],
  NotAFile: ["filePath", "errObj"],
  ServerError: ["errObj"]
})
const end = state =>
  state.cata({
    NoFileGiven: _ =>
      errorAndQuit(`you must supply a filepath arg that you want to sync`),
    InvalidConfig: config =>
      errorAndQuit(`config invalid: ${objPrint(config)}`),
    FileOutsideSyncPaths: (filePath, localPath) =>
      errorAndQuit(`${filePath} is not in local sync folder ${localPath}`),
    FileNotFound: msg => errorAndQuit(msg)
  })

const synctool = romPath => {
  stat(configFileName).run().listen({
      onRejected: _ =>
        end(Ends.FileNotFound(`config file note found in root: ${configFileName}`)),
      onResolved: _ => {
        const config = require(`../../${configFileName}`)
        const { localPath, remotePath } = config

        inputEmpty(romPath) && end(Ends.NoFileGiven) 
        isConfigValid(config).orElse(_ => end(Ends.InvalidConfig(config)))

        log(`using local root: ${localPath}`)
        log(`using remote root: ${remotePath}`)
        log(`checking rom path: ${romPath}`)

        //so we have a valid string, before io, is it in the root path
        getSubDir(romPath)(localPath).orElse(_ =>
          end(Ends.FileOutsideSyncPaths(romPath, localPath))
        )

        //we can be sure relativePath is stated to live under the localroot, so now does it exist?
        // first need to know if you've passed a dir or a file (for now do nothing on dir)
        const size = stat(romPath)
          .map(stat => {
            isFile(stat)
            return stat
          })
          .map(getSize)

        size.run().listen({
          onRejected: rej => end(Ends.FileNotFound(rej)),
          onResolved: result => console.log(`result is ${objPrint(result)}`)
        })
      }
    })
}
module.exports = { synctool }
