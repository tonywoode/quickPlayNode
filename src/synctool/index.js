const processInput = require('./processInput.js')
const taggedSum = require("daggy").taggedSum
const SyncState = taggedSum("SyncState", {
  Move: ["remotePath"], //coz of course synctool is calulating this, does processInput check its there tho?
  NoMove: ["bool"],
  Resume: ["kb"],
  Error: ["errObj"],
})


const synctool = romPath => {
  processInput(romPath)
  process.exit() //else we'll fall through to the mametool stuff
}
module.exports = {synctool}
