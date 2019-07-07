const taggedSum = require("daggy").taggedSum
const config = require("../../synctool_config.json")
const { localPath, remotePath } = config
const { isConfigValid } = require('./processInput.js')
const { either } = require('sanctuary')
const { compose} = require('Ramda')
const SyncState = taggedSum("SyncState", {
  Move: ["remotePath"], //coz of course synctool is calulating this, does processInput check its there tho?
  NoMove: ["bool"],
  Resume: ["kb"],
  Error: ["errObj"],
})

const quit = (code=0) => process.exit() //TODO: else we'll fall through to the mametool stuff

const synctool = romPath => {
  //if we couldn't read the config keys, quit
  compose( either (msg => console.log(msg && quit(1))) (_=>_), isConfigValid) (config)



  //TODO: the check for remotePath and localPath keys are short-circuiting, actualy i want to error if either OR both are not there
  console.log(`[synctool] - using local root: ${localPath}`)
  console.log(`[synctool] - using remote root: ${remotePath}`)
  console.log(`[synctool] - checking ${romPath}`)

  

  quit() 
}
module.exports = {synctool}
