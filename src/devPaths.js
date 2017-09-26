'use strict'


const {readFileSync, createReadStream}  = require('fs')

//these paths vary
const ini                 = require('ini')
const qpIni               = `./settings.ini`
const qpSettings          = ini.parse(readFileSync(qpIni, 'utf-8'))


//TODO: this text is idential to src/livePaths
console.log(qpSettings.MAME)
console.log('\n')
exports.mameXMLInPath     = qpSettings.MAME.MameXMLPath || _throw(`there's no MAME XML`); console.log(`mame xml path set to ${exports.mameXMLInPath}`)  
exports.mameXMLStream     = createReadStream(exports.mameXMLInPath)
exports.mfmTextFileInPath = qpSettings.MAME.MameFileManagerFilePath || _throw(`there's no MFM File`); console.log(`mame file manager path set to ${exports.mfmTextFileInPath}`)  
exports.mfmTextFileStream = createReadStream(exports.mfmTextFileInPath)
exports.mameExtrasPath    = qpSettings.MAME.MameExtrasPath;          console.log(`mame extras path set to ${exports.mameExtrasPath}`)
exports.winIconDir        = `${exports.mameExtrasPath}\\Icons`;      console.log(`mame icons path set to ${exports.winIconDir}`) 
exports.mameExe           = qpSettings.MAME.MametoolMameExePath;     console.log(`mame exe set to ${exports.mameExe}` )

//this path varies
exports.iniDir            = `/Volumes/GAMES/MAME/EXTRAs/folders`//for dev is nix
