const taggedSum = require("daggy").taggedSum
const { either, maybe, map } = require('../helpers/sanctuary.js')
const { compose } = require("ramda")

const config = require("../../synctool_config.json")
const { localPath, remotePath } = config
const { strEmpty, isConfigValid, getSubDir } = require("./processInput.js")
const { stat, isDir, isFile, getSize, fileIsNotEmpty } = require("./checkFiles.js")
//TODO: type as soon as a decision is made, something like
//const SyncState = taggedSum("SyncState", {
//  Move: ["remotePath"], //coz of course synctool is calulating this, does processInput check its there tho?
//  NoMove: ["bool"],
//  Resume: ["kb"],
//  Error: ["errObj"]
//})

const log = msg => console.log(`[synctool] - ${msg}`)
const quit = (code = 0) => process.exit(code)
const errorAndQuit = err => {
  console.log(`[synctool] error: ${err}`)
  quit(1)
}
const synctool = romPath => {

  //commander already checks path provided, but check its valid
  strEmpty(romPath) && errorAndQuit("rom path cannot be empty")
  //if we couldn't read the config keys, quit
  compose(
    either(errorAndQuit)(_ => _),
    isConfigValid
  )(config)
  //TODO: the check for remotePath and localPath keys are short-circuiting, actually i want to error if either OR both are not there
  log(`using local root: ${localPath}`)
  log(`using remote root: ${remotePath}`)
  log(`checking rom path: ${romPath}`)

  //so we have a valid string, before io, is it in the root path
  const relativePath = compose(
    either(rej =>
      errorAndQuit(
        `rom path "${romPath}" not in local sync folder "${localPath}"`
      )
    )(res => {
      log(`${res} is a subpath of your local sync path: ${localPath}`)
      return res
    })
  )(getSubDir(romPath)(localPath))

  //we can be sure relativePath is stated to live under the localroot, so now does it exist
  // first we need to know if you've passed a dir or a file, for now do nothing on dir
  const size = stat(romPath)
    .map(stat => { 
      fileIsNotEmpty(stat)
      return stat
    })
    .map(stat => {
      isFile(stat)
      return stat
    })
    .map(getSize) 

  size.fork(rej => console.log(rej), result => console.log("result is " + JSON.stringify(result, null,2)))
  }
module.exports = { synctool }
