const synctool = romPath => {
  console.log(romPath)
  process.exit() //else we'll fall through to the mametool stuff
}
module.exports = {synctool}
