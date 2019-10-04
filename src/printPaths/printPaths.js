const path = require('path')
const fs = require('fs')

const getMamePath = mameIniPath => {
  try {
    const mameIni = fs.readFileSync(mameIniPath, 'utf-8')
    const match = /^rompath\s+(.*)$/m.exec(mameIni)
    const quotesRemoved = match[1].replace(/^["'](.*)["']$/, '$1')
    return quotesRemoved
  } catch {
    return ''
  }
}

// determine the location of the mame.ini, this is only for printing filepaths, we just print a default if anything goes wrong...
const addMameFilePathsToSettings = (settings, devMode, log) => {
  const mameEmuDir = path.dirname(settings.mameExePath)
  settings.mameRoms = ''
  settings.mameChds = ''
  settings.mameSoftwareListRoms = ''
  settings.mameSoftwareListChds = ''
  const mameIniFileName = `./mame.ini`
  const standardMameIniPath = settings.isItRetroArch
    ? path.join(mameEmuDir, `system`, `mame`, mameIniFileName)
    : path.join(mameEmuDir, mameIniFileName)
  const messIniFileName = `./mess.ini`
  const standardMessIniPath = settings.isItRetroArch
    ? path.join(mameEmuDir, `system`, `mess2015`, messIniFileName) // foldername at least was true in 2019, best i can do
    : path.join(mameEmuDir, messIniFileName)

  const mameIniPath = devMode
    ? mameIniFileName
    : fs.existsSync(standardMameIniPath)
      ? standardMameIniPath
      : fs.existsSync(standardMessIniPath) ? standardMessIniPath : '' // no ini path, no paths get (safely) printed
  const mameRomPath = mameIniPath ? getMamePath(mameIniPath) : ''
  const romPathSplit = mameRomPath.split(';')
  log.filePaths && console.log(`MAME ini file:          found in ${mameIniPath}\nMAME ini Rompath:       ${romPathSplit}`)
  if (mameRomPath) {
    if (romPathSplit.length === 1) {
      log.filePaths &&
        console.log(
          `we have only one path in your mame ini, so make it all the params: ${romPathSplit[0]}`
        )
      settings.mameRoms = romPathSplit[1]
      settings.mameChds = ''
      settings.mameSoftwareListRoms = ''
      settings.mameSoftwareListChds = ''
    } else {
      const romsRegex = /^.*\\ROMS$/i
      const chdsRegex = /^.*\\CHDs$/i
      const softListRomsRegex = /^.*\\Software List ROMS$/i
      const softListChdsRegex = /^.*\\Software List CHDs$/i
      romPathSplit.forEach(rompath => {
        romsRegex.test(rompath) && (settings.mameRoms = rompath)
        chdsRegex.test(rompath) && (settings.mameChds = rompath)
        softListRomsRegex.test(rompath) && (settings.mameSoftwareListRoms = rompath)
        softListChdsRegex.test(rompath) && (settings.mameSoftwareListChds = rompath)
      })
    }
  }

  log.filePaths && console.log(`MAME roms path:         ${settings.mameRoms}`)
  log.filePaths && console.log(`MAME chds path:         ${settings.mameChds}`)
  log.filePaths &&
    console.log(`MAME software list roms path: ${settings.mameSoftwareListRoms}`)
  log.filePaths &&
    console.log(`MAME software list chds path: ${settings.mameSoftwareListChds}`)
}

module.exports = addMameFilePathsToSettings
