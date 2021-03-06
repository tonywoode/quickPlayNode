'use strict'

//paths is agnostic, it doesn't know about live or dev, that's for the caller

const {readFileSync, existsSync} = require('fs')
const ini      = require('ini')
const _throw   = m => { throw new Error(m) }

module.exports = (qpSettingsIniPath, mameInisOverridePath ) => {

  existsSync(qpSettingsIniPath) || _throw(`the setttings file doesn't exist at ${qpSettingsIniPath}`)
  const qpSettings  = ini.parse(readFileSync(qpSettingsIniPath, 'utf-8'))
  const s           = qpSettings.MAME
  //console.log(s) 
  console.log(`Settings file:          ${qpSettingsIniPath}`)  

  return { 
      mameXMLInPath     : s.MameXMLPath
    , mfmTextFileInPath : s.MameFileManagerFilePath
    , mameExtrasPath    : s.MameExtrasPath 
    , winIconDir        : `${s.MameExtrasPath}\\icons`
    , mameFilePaths     : s.MameFilePaths
    , mameFilePathsRomsType :s.MameFilePathsRomsType
    , mameZipType       : s.MameZipType
    , mameExe           : s.MametoolMameExeName
    , mameExePath       : s.MametoolMameExePath
    , iniDir            : mameInisOverridePath? mameInisOverridePath : `${s.MameExtrasPath}\\folders`
    , tickBios          : s.MameOptBios
    , tickCasino        : s.MameOptCasino
    , tickClones        : s.MameOptClones
    , tickMature        : s.MameOptMature
    , tickMechanical    : s.MameOptMechanical
    , tickMess          : s.MameOptMess
    , tickPreliminary   : s.MameOptPreliminary
    , tickPrintClub     : s.MameOptPrintClub
    , tickSimulator     : s.MameOptSimulator
    , tickTableTop      : s.MameOptTableTop
    , tickQuiz          : s.MameOptQuiz
    , tickUtilities     : s.MameOptUtilities
    , tickSplitCompany  : s.MameOptCompany
    , tickSplitGenre    : s.MameOptGenre
    , tickSplitNPlayers : s.MameOptNPlayers
    , tickSplitRating   : s.MameOptRating
    , tickSplitSeries   : s.MameOptSeries
    , tickSplitVersion  : s.MameOptVersion
    , tickSplitYear     : s.MameOptYear
  }

}
