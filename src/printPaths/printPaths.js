const path = require('path')
const fs = require('fs')
const Leven = require('levenshtein')
const { uniq } = require('ramda')

const getMameIniRomPath = (mameIniPath, mameEmuDir) => {
  try {
    const mameIni = fs.readFileSync(mameIniPath, 'utf-8')
    const match = /^rompath\s+(.*)$/m.exec(mameIni)
    const quotesRemoved = match[1].replace(/^["'](.*)["']$/, '$1')
    return quotesRemoved
  } catch {
    log.filePaths(`didnt manage to get any rompaths out of mame.in path: ${mameIniPath}`)
    const defaultRomsDir = path.win32.join(mameEmuDir, 'roms')
    return [defaultRomsDir] // now we're pure we always return an array
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

// why win32? node will NOT test both for us, only the one on the OS this imp is running on, which is not helpful for running the tests or potentially dealing with win or nix mame inis
const makeRomPathAbs = (filepath, mameEmuDir) =>
  path.win32.isAbsolute(filepath) || path.posix.isAbsolute(filepath)
    ? filepath
    : path.resolve(mameEmuDir, filepath)

// basename is the final rightmost segment of file path; usually a file, but can also be directory
const getBasename = filepath => path.win32.basename(filepath)
const removeMameStringFromPath = filepath => filepath.replace(/mame/i, '')

// takes your rompaths and rates each for closeness to mame's rompath types
const rateRomPath = (romPath, romPathType) => new Leven(romPath, romPathType).distance
// make manual adjustments to the distance score of each rompath type

// for each of mame's rompath types, returns the rompath (out of 4) that is the most likely container for that rompath type
const rateEachFolderForEachType = (romPath, romPathTypes) =>
  romPathTypes.map(pathType => rateRomPath(romPath, pathType))

const getLowestDistanceWithIdx = distances => {
  const lowest = Math.min(...distances)
  return [lowest, distances.indexOf(lowest)]
}

const getLowestDistanceForTypes = (romPathTypes, allDistances) => {
  return allDistances.reduce((acc, distances) => {
    const distanceAndIdx = getLowestDistanceWithIdx(distances)
    console.log([distanceAndIdx[0], romPathTypes[distanceAndIdx[1]]])
    // we got an array of the distance and the index
    // const lowestIdx = distances.indexOf(Math.min(...distances)) // this should pick the first if there's any same distances, which is concievable if one folder has mame in it and another doesnt
    // console.log(lowestIdx)
    // return lowestIdx
  }, [])
}


// now that each rompath is rated, if we have more than one for each type, we need to take the most likely, so returns 4 rompaths

// get your rompaths ready for difference comparison: turn into basenames, check for duplicates (warning if so), remove the string 'mame'
const sanitiseRomPaths = romPathsAbs => {
  const romPathBasenames = romPathsAbs.map(getBasename)
  const noMameString = romPathBasenames.map(removeMameStringFromPath)
  // if >1 sanitised basename is the same, first wins and warn user to symlink if they want it fixed (should test absolute names in this event)
  const basesNoDupes = uniq(noMameString)
  const inAnotB = (a, b) => a.filter(item => !b.includes(item))
  const removed = inAnotB(romPathBasenames, basesNoDupes)
  removed.length !== 0 &&
    console.log(
      `Warning: Mame filepath printing may not work properly: identical foldernames found that look like: ${removed.toString()} - we're going to use the first path found. You can make all rompaths work by symlinking the files from the second folder into the first`
    )
  // conumdrum: we don't want to remove 'mame' first incase we have 'mameroms' and 'romsmame', but if we don't we get two dupes 'roms'
  return basesNoDupes
}

const makeDifferenceObjects = basenames => {
  const romPathTypes = ['Roms', 'Chds', 'SoftwareListRoms', 'SoftwareListChds']
  const bases = basenames.map(basename => ({ name: basename }))
  // now we need to give each object a field for each type
  const addArrAsObjKeys = (arr, obj) => arr.reduce((obj, key, idx) => ({ ...obj, [key]: '' }), obj)
  const romPathsReadyToBeRated = bases.map(base => addArrAsObjKeys(romPathTypes, base))
  return romPathsReadyToBeRated
}

/** basenames -> paths -> [] */
const fillRomPaths = romPathsAbs => {
  // first make a list of each of your rompaths, with slots for each of the rompathTypes for a rating of distance
  const romPathsSanitised = sanitiseRomPaths(romPathsAbs)
  const romPathsReadyToBeRated = makeDifferenceObjects(romPathsSanitised)
  const paths = {
    mameRoms: '',
    mameChds: '',
    mameSoftwareListRoms: '',
    mameSoftwareListChds: ''
  }

  if (romPathsAbs.length === 1) {
    const theSingleRomPath = romPathsAbs[0]
    log.filePaths(`only one path in your mame ini, make it all the params: ${theSingleRomPath}`)
    paths.mameRoms = theSingleRomPath
  } else {
    // array order will be the same, test against basename but return absolute path
    romPathsSanitised.forEach((rompath, idx) => {
      ;/^.*Software List ROMS$/i.test(rompath) && (paths.mameSoftwareListRoms = romPathsAbs[idx])
      ;/^.*Software List CHDs$/i.test(rompath) && (paths.mameSoftwareListChds = romPathsAbs[idx])
      ;/^.*(?<!Software List )ROMS$/i.test(rompath) && (paths.mameRoms = romPathsAbs[idx])
      ;/^.*(?<!Software List )CHDs$/i.test(rompath) && (paths.mameChds = romPathsAbs[idx])
    })
  }
  return paths
}

/** determine the location of the mame.ini, this is only for printing filepaths, we just print a default if anything goes wrong...
 * path -> bool -> bool -> Object
 * @return an object with the 4 types of mame rom paths */
const addMameFilePathsToSettings = (mameEmuDir, isItRetroArch, devMode) => {
  const mameIniFileName = `./mame.ini`
  const messIniFileName = `./mess.ini`
  const mameIniPath = devMode
    ? mameIniFileName
    : determinePathToMameIni(mameEmuDir, isItRetroArch, mameIniFileName, messIniFileName)
  const mameRomPath = getMameIniRomPath(mameIniPath, mameEmuDir)
  const romPaths = mameRomPath.split(';')
  // cater for the possibility that mame's rompath variable contains relative paths meaning they will be relative to mame's directory, any number of the paths may or may not be relative, make them all absolute since we're going to be following them from an unknown root
  const romPathsAbs = romPaths.map(romPath => makeRomPathAbs(romPath, mameEmuDir))
  log.filePaths(`MAME ini file:          found in ${mameIniPath}\nMAME ini Rompath:       ${romPaths}\n         Absolute:      ${romPathsAbs}`) // prettier-ignore
  // and array is returned of the 4 romtypes
  return fillRomPaths(romPathsAbs)
}

module.exports = {
  addMameFilePathsToSettings,
  fillRomPaths,
  sanitiseRomPaths,
  rateEachFolderForEachType,
  getLowestDistanceForTypes
}
