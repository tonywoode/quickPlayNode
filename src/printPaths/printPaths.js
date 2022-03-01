const path = require('path')
const fs = require('fs')

// work out where the mame ini file is on your filesystem
const determinePathToMameIni = (mameEmuDir, isItRetroArch, mameIniFileName, messIniFileName) => {
  const standardMameIniPath = isItRetroArch
    ? path.join(mameEmuDir, `system`, `mame`, mameIniFileName)
    : path.join(mameEmuDir, mameIniFileName)
  const standardMessIniPath = isItRetroArch
    ? path.join(mameEmuDir, `system`, `mess2015`, messIniFileName) // foldername at least was true in 2019, best i can do
    : path.join(mameEmuDir, messIniFileName)

  return fs.existsSync(standardMameIniPath)
    ? standardMameIniPath
    : fs.existsSync(standardMessIniPath) ? standardMessIniPath : '' // no ini path, no paths get (safely) printed
}

// get the actual contents of the rompath array in mame's ini file on your filesystem
const getMameIniRomPath = (mameIniPath, mameEmuDir) => {
  try {
    const mameIni = fs.readFileSync(mameIniPath, 'utf-8')
    const match = /^rompath\s+(.*)$/m.exec(mameIni)
    const quotesRemoved = match[1].replace(/^["'](.*)["']$/, '$1')
    const absoluteString = makeRomPathsAbs(quotesRemoved, mameEmuDir)
    return absoluteString
  } catch {
    log.filePaths(`didnt manage to get any rompaths out of mame.in path: ${mameIniPath}`)
    const defaultRomsDir = path.win32.join(mameEmuDir, 'roms')
    return [defaultRomsDir] // now we're pure we always return an array
  }
}

// If you have relative paths in your mame rom path, then your mame roms must be on the same path as your mame emu
// Not sure that QuickPlay is rooted such that it'll cd to your mame emu dir when running a romdata line,
// So instead, makle the paths in that array absolute before we hand it to QuickPlay
// why win32? node will NOT test both for us, only the one on the OS this imp is running on, which is not helpful for running the tests or potentially dealing with win or nix mame inis
const makeRomPathAbs = (filepath, mameEmuDir) =>
  path.win32.isAbsolute(filepath) || path.posix.isAbsolute(filepath)
    ? filepath
    : path.resolve(mameEmuDir, filepath)

// romPathString -> romPathString
//the trouble here is we need to reserialise the result, as we're passing quickplay a string
const makeRomPathsAbs = (mameRomPath, mameEmuDir) => {
  const romPaths = mameRomPath.split(';') 
  const abs = romPaths.map(romPath => makeRomPathAbs(romPath, mameEmuDir))
  return abs.join(';')
}
module.exports = {
  makeRomPathsAbs,
  determinePathToMameIni,
  getMameIniRomPath,
}
