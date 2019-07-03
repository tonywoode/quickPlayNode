const processInput = require('./processInput.js')
const taggedSum = require("daggy").taggedSum
const SyncState = taggedSum("SyncState", {
  Move: ["bool"],
  NoMove: ["bool"],
  Resume: ["kb"],
  Error: ["errObj"],
})


const synctool = romPath => {
  console.log(romPath)
  process.exit() //else we'll fall through to the mametool stuff
}
module.exports = {synctool}
