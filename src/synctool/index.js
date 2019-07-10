const taggedSum = require("daggy").taggedSum
const config = require("../../synctool_config.json")
const { localPath, remotePath } = config
const { strEmpty, isConfigValid, getSubDir } = require("./processInput.js")
const { stat } = require("./checkFiles.js")
const { either } = require("sanctuary")
const { compose } = require("ramda")
//TODO: type as soon as a decision is made
const SyncState = taggedSum("SyncState", {
  Move: ["remotePath"], //coz of course synctool is calulating this, does processInput check its there tho?
  NoMove: ["bool"],
  Resume: ["kb"],
  Error: ["errObj"]
})

const log = msg => console.log(`[synctool] - ${msg}`)
const quit = (code = 0) => process.exit(code)
const errorAndQuit = err => {
  console.log(`[synctool] error: ${err}`)
  quit(1)
}
const synctool = romPath => {
  //if we couldn't read the config keys, quit
  compose(
    either(errorAndQuit)(_ => _),
    isConfigValid
  )(config)
  //TODO: the check for remotePath and localPath keys are short-circuiting, actually i want to error if either OR both are not there
  log(`using local root: ${localPath}`)
  log(`using remote root: ${remotePath}`)
  log(`checking rom path: ${romPath}`)

  //commander already checks path provided, but check its valid
  strEmpty(romPath) && errorAndQuit("rom path cannot be empty")

  //so we have a valid string, before io, is it in the root path
  const relativePath = compose(
    either(rej =>
      errorAndQuit(
        `rom path "${romPath}" not in local sync folder "${localPath}"`
      )
    )(res => res)
  )(getSubDir(romPath)(localPath))

  log(`rom lives under your local sync path: ${romPath}`)
  //we can be sure relativePath is stated to live under the localroot, so now does it exist
  const getStat = stat(romPath).fork(
    _ => errorAndQuit(`rom path doesn't exist: ${romPath}`),
    res => {
      log(`rom path exists and here's its stat ${JSON.stringify(res, null, 2)}`)
      return stat
    }
  )
  //compose(getStat)()
}
module.exports = { synctool }
