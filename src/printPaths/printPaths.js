const path = require('path')
const fs = require('fs')

const getMameIniRomPath = mameIniPath => {
  try {
    const mameIni = fs.readFileSync(mameIniPath, 'utf-8')
    const match = /^rompath\s+(.*)$/m.exec(mameIni)
    const quotesRemoved = match[1].replace(/^["'](.*)["']$/, '$1')
    return quotesRemoved
  } catch {
    log.filePaths(`didnt manage to get any rompaths out of mame.in path: ${mameIniPath}`)
    return ''
  }
}

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

// determine the location of the mame.ini, this is only for printing filepaths, we just print a default if anything goes wrong...

// let's work out the different concerns we had going on in the original fn which had too many concerns:
//   we work out the path to the mame ini based on input
//   we read the ini
//   we work out how the ini says to make the filepaths for mame
//   we write those into settings for the rest of the program to use
//   we log out what the settings are
//
//   there was a lot of mutating external state here!

const addMameFilePathsToSettings = (mameEmuDir, isItRetroArch, devMode) => {
  const paths = {
    mameRoms: '',
    mameChds: '',
    mameSoftwareListRoms: '',
    mameSoftwareListChds: ''
  }
  const mameIniFileName = `./mame.ini`
  const messIniFileName = `./mess.ini`
  const mameIniPath = devMode
    ? mameIniFileName
    : determinePathToMameIni(mameEmuDir, isItRetroArch, mameIniFileName, messIniFileName)
  const mameRomPath = getMameIniRomPath(mameIniPath)
  const romPathSplit = mameRomPath.split(';')

  const splitMameIniRomPathIntoConstituents = mamePathSplit => {
    // cater for the possibility that mame's rompath variable contains relative paths meaning they will be relative to mame's directory, any number of the paths may or may not be relative
    return romPathSplit.map(
      romPathPart =>
        // node will NOT test both for us, only the one on the OS this imp is running on, which is not helpful for running the tests or potentially dealing with win or nix mame inis
        path.win32.isAbsolute(romPathPart) || path.posix.isAbsolute(romPathPart)
          ? romPathPart
          : path.resolve(mameEmuDir, romPathPart)
    )
  }

  const romPathSplitAbsolute = splitMameIniRomPathIntoConstituents(romPathSplit)
  log.filePaths &&
    console.log(
      `MAME ini file:          found in ${mameIniPath}\nMAME ini Rompath:       ${romPathSplit}\n         Absolute:      ${romPathSplitAbsolute}`
    )
  if (mameRomPath) {
    if (romPathSplitAbsolute.length === 1) {
      const theSingleRomPath = romPathSplitAbsolute[0]
      log.filePaths && console.log(`only one path in your mame ini, make it all the params: ${theSingleRomPath}`)
      paths.mameRoms = theSingleRomPath
    } else {
      const romsRegex = /^.*[/\\]ROMS$/i
      const chdsRegex = /^.*[/\\]CHDs$/i
      const softListRomsRegex = /^.*[/\\]Software List ROMS$/i
      const softListChdsRegex = /^.*[/\\]Software List CHDs$/i
      romPathSplitAbsolute.forEach(rompath => {
        romsRegex.test(rompath) && (paths.mameRoms = rompath)
        chdsRegex.test(rompath) && (paths.mameChds = rompath)
        softListRomsRegex.test(rompath) && (paths.mameSoftwareListRoms = rompath)
        softListChdsRegex.test(rompath) && (paths.mameSoftwareListChds = rompath)
      })
    }
  }
  return paths
}

module.exports = addMameFilePathsToSettings
