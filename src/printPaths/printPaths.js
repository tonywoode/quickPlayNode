const path = require('path')
const fs = require('fs')
var stringSimilarity = require('string-similarity')
const { map, pipe } = require('ramda')

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
    return quotesRemoved
  } catch {
    log.filePaths(`didnt manage to get any rompaths out of mame.in path: ${mameIniPath}`)
    const defaultRomsDir = path.win32.join(mameEmuDir, 'roms')
    return [defaultRomsDir] // now we're pure we always return an array
  }
}

const makeRomPathsObjArr = romPathAbs => ({ romPathAbs})
// basename is the final rightmost segment of file path; usually a file, but can also be directory
const addBasename = ({romPathAbs}) => ({ romPathAbs, basename: path.win32.basename(romPathAbs) })
const removeMameStringFromPath = romPathObj => ({...romPathObj, basenameNoMame: romPathObj.basename.replace(/mame/i, '') })


// if >1 sanitised basename is the same, first wins and warn user to symlink if they want it fixed (should test absolute names in this event)
// so we need to make a list of the basenames on each object and check they are unique, we can indedc use the index of the object made to get back to each object because we have an array of objects
const checkForDupes = romPathsObjArr => {
  // we can match up idxs on this
  const basenamesNoMame = romPathsObjArr.map( romPathsObj => romPathsObj.basenameNoMame)
  const removedIdxs = idxsOfDupes(basenamesNoMame)
  removedIdxs.length !== 0 &&
    console.log(
      `Print Paths - Warning: Mame filepath printing may not work properly: found more than one Mame Rompath that seems to deal with the same content. We're going to use the first path found - removed: ${removedIdxs.map(
        idx => romPathsObjArr[idx].romPathAbs
      )} . You can make all rompaths work by symlinking the files from the non-chosen folders into the chosen ones`
    )
  return romPathsObjArr.filter( (el, idx) => !removedIdxs.includes(idx) )
}

// get your rompaths ready for difference comparison: turn into basenames, check for duplicates (warning if so), remove the string 'mame'
// conumdrum: we don't want to remove 'mame' first incase we have 'mameroms' and 'romsmame', but if we don't we get two dupes 'roms', we've got little choice but to compare post-removal
const sanitiseRomPaths = romPathsAbs =>
  pipe(
    map(makeRomPathsObjArr),
    map(addBasename),
    map(removeMameStringFromPath),
    checkForDupes
  )(romPathsAbs)

/* DISTANCE FNS */
const romPathTypes = ['Roms', 'Chds', 'SoftwareListRoms', 'SoftwareListChds']

// now that each rompath is rated, if we have more than one for each type, we need to take the most likely, so returns 4 rompaths
// takes your rompaths and rates each for closeness to mame's rompath types
const rateRomPath = (romPath, romPathType) =>
  stringSimilarity.compareTwoStrings(romPath, romPathType)

// for each of mame's rompath types, returns the rompath (out of 4) that is the most likely container for that rompath type
const rateEachFolderForEachType = (romPath, romPathTypes) =>
  romPathTypes.map(pathType => rateRomPath(romPath, pathType))

// difference object will become { name: 'foo', Roms: '3', Chds: '6', ... }
const rateADifferenceObject = (romPathTypes, differenceObject) => ({
  ...differenceObject,
  ...Object.fromEntries(romPathTypes.map(key => [key, rateRomPath(differenceObject.basenameNoMame, key)]))
})

const rateAllRomPaths = romPathTypes => differenceObjects =>
  differenceObjects.map(differenceObject => rateADifferenceObject(romPathTypes, differenceObject))

const rateUsersRompaths = (romPathTypes, romPaths) =>
  pipe(sanitiseRomPaths, rateAllRomPaths(romPathTypes))(romPaths)
/// /////////////
/// /////////////
/// //////////////
// trying not to do with arrays now
const getLowestDistanceWithIdx = distances => {
  const lowest = Math.min(...distances)
  return [lowest, distances.indexOf(lowest)]
}

// make manual adjustments to the distance score of each rompath type

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

/** basenames -> paths -> [] */
const fillRomPaths = romPathsAbs => {
  // first make a list of each of your rompaths, with slots for each of the rompathTypes for a rating of distance
  // this just to get this test to pass atm, the imp needs replacing
  const romPathsSanitised = sanitiseRomPaths(romPathsAbs).map( romPathObj => romPathObj.basenameNoMame)
  console.log(romPathsSanitised)
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

// why win32? node will NOT test both for us, only the one on the OS this imp is running on, which is not helpful for running the tests or potentially dealing with win or nix mame inis
const makeRomPathAbs = (filepath, mameEmuDir) =>
  path.win32.isAbsolute(filepath) || path.posix.isAbsolute(filepath)
    ? filepath
    : path.resolve(mameEmuDir, filepath)

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

// utility fn returns the idxs of dupes in an array
const idxsOfDupes = arr =>
  arr
    .map((element, idx) => {
      if (arr.indexOf(element) !== idx) {
        return idx
      }
    })
    .filter(e => e != null)

module.exports = {
  addMameFilePathsToSettings,
  fillRomPaths,
  checkForDupes,
  sanitiseRomPaths,
  rateADifferenceObject,
  rateAllRomPaths,
  rateUsersRompaths,
  rateEachFolderForEachType,
  getLowestDistanceForTypes
}
