const path = require('path')
const fs = require('fs')

const getMameIniRomPath = mameIniPath => {
  try {
    const mameIni = fs.readFileSync(mameIniPath, 'utf-8')
    const match = /^rompath\s+(.*)$/m.exec(mameIni)
    const quotesRemoved = match[1].replace(/^["'](.*)["']$/, '$1')
    return quotesRemoved
  } catch {
    log.filePaths &&
      console.log(`didnt manage to get any rompaths out of mame.in path: ${mameIniPath}`)
    return '' // TODO what does mame do, assume ./ROMS? Should we do the same?
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

// node will NOT test both for us, only the one on the OS this imp is running on, which is not helpful for running the tests or potentially dealing with win or nix mame inis
const makeRomPathAbs = (filepath, mameEmuDir) =>
  path.win32.isAbsolute(filepath) || path.posix.isAbsolute(filepath)
    ? filepath
    : path.resolve(mameEmuDir, filepath)

const getBasename = filepath => path.win32.basename(filepath)
const removeMameStringFromPath = filepath => filepath.replace(/mame/i, '')

// removes the string 'mame' from any rompath - TODO: should this be a pipeline with the above, or not? Why do we return the absolute path from here not the path as stated in ini? Oh god, its not that i expect it'll always be in mame's folder is it, and i add that later? surely not, since i myself keep them somewhere else.....
// const removeMameString = romPathSplitAbsolute
// takes your rompaths and rates each for closeness to mame's rompath types

// make manual adjustments to the distance score of each rompath type

// for each of mame's rompath types, returns the rompath (out of 4) that is the most likely container for that rompath type

// now that each rompath is rated, if we have more than one for each type, we need to take the most likely, so returns 4 rompaths

/** determine the location of the mame.ini, this is only for printing filepaths, we just print a default if anything goes wrong...
 * path -> bool -> bool -> Object
 * @return an object with the 4 types of mame rom paths */
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
  const romPaths = mameRomPath.split(';')
  // cater for the possibility that mame's rompath variable contains relative paths meaning they will be relative to mame's directory, any number of the paths may or may not be relative, make them all absolute since we're going to be following them from an unknown root
  const romPathsAbs = romPaths.map(romPath => makeRomPathAbs(romPath, mameEmuDir))
  log.filePaths &&
    console.log(
      `MAME ini file:          found in ${mameIniPath}\nMAME ini Rompath:       ${romPaths}\n         Absolute:      ${romPathsAbs}`
    )
  const romPathsBasenames = romPaths.map(getBasename)
  const romPathsBasenamesNoMame = romPathsBasenames.map(removeMameStringFromPath)
  console.log(romPathsBasenames)
  if (mameRomPath) {
    if (romPathsAbs.length === 1) {
      const theSingleRomPath = romPathsAbs[0]
      log.filePaths &&
        console.log(`only one path in your mame ini, make it all the params: ${theSingleRomPath}`)
      paths.mameRoms = theSingleRomPath
    } else {
      // array order will be the same, test against basename but return absolute path
      romPathsBasenamesNoMame.forEach((rompath, idx) => {
        console.log(rompath, idx)
        ;/^.*Software List ROMS$/i.test(rompath) && (paths.mameSoftwareListRoms = romPathsAbs[idx])
        ;/^.*Software List CHDs$/i.test(rompath) && (paths.mameSoftwareListChds = romPathsAbs[idx])
        ;/^.*(?<!Software List )ROMS$/i.test(rompath) && (paths.mameRoms = romPathsAbs[idx])
        ;/^.*(?<!Software List )CHDs$/i.test(rompath) && (paths.mameChds = romPathsAbs[idx])
      })
    }
  }
  return paths
}

module.exports = { addMameFilePathsToSettings, getBasename }
