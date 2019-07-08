const taggedSum = require("daggy").taggedSum
const config = require("../../synctool_config.json")
const { localPath, remotePath } = config
const { strEmpty, isConfigValid, getSubDir } = require("./processInput.js")
const { either } = require("sanctuary")
const { compose } = require("ramda")
//TODO: type as soon as a decision is made
const SyncState = taggedSum("SyncState", {
  Move: ["remotePath"], //coz of course synctool is calulating this, does processInput check its there tho?
  NoMove: ["bool"],
  Resume: ["kb"],
  Error: ["errObj"]
})

const quit = (code = 0) => process.exit(code) //TODO: else we'll fall through to the mametool stuff
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
  console.log(`[synctool] - using local root: ${localPath}`)
  console.log(`[synctool] - using remote root: ${remotePath}`)
  console.log(`[synctool] - checking rom path: ${romPath}`)

  //commander already checks path provided, but check its valid
  strEmpty(romPath) && errorAndQuit("rom path cannot be empty")

  //so we have a valid string, before io, is it in the root path
  compose(
    either(rej =>
      errorAndQuit(
        `rom path "${romPath}" not in local sync folder "${localPath}"`
      )
    )(res =>
      console.log(
        "it's your lucky day pal, rom path is in the local sync folder"
      )
    ))(getSubDir(romPath)(localPath))
  quit()
}
module.exports = { synctool }
