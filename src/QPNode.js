'use strict'

const fs                               = require('fs')
const ini                              = require('ini')
const program                          = require('commander')
const R                                = require('ramda')
const _throw                           = m => { throw new Error(m) }

const paths                                = require('./paths.js')
const {generateRomdata}                    = require('./romdata/printRomdata.js')
const readMameJson                         = require('./romdata/readMameJson.js')

//cmd-line options as parsed by commander
program
    .option('--output-dir [path]')
    //mameTool options
    .option(`--scan`)
    .option(`--arcade`)
    .option(`--mfm`)
    .option(`--dev`)
    .option(`--testArcadeRun`)
    //messTool options
    .option(`--datAndEfind`)
    .option(`--softlists`)
    .option(`--embedded`)
    .parse(process.argv)

//TODO: inconsistent
if (!process.argv.slice(2).length) {
  console.log( 
`MAMETOOL TEST USAGE: 
npm run full -- --scan deletes the whole outputs folder, full must be run with scan
'npm start -- --scan' will make a mame json output file, which is used by the arcade and mfm flags
'npm start -- --arcade' will make an arcade set to the ini flags in settings.ini, and output to ./outputs
'npm start -- --mfm' will make an arcade set to a fatfile list output of mame file manager, and output to ./outputs
'npm debug -- --arcade' will break on ln1 of making an arcade set to the ini flags in settings.ini, and output to ./outputs)
'QPNode --datAndEfind' makes a mess Json, an efind set and a systems dat
'QPNode --softlists' makes a softlist set
'QPNode --embedded' makes the embedded mess romdata for mame
`
)
  process.exit()
}


//calculate these
const outputDir         = program.outputDir
const jsonOutName       = `mame.json`
const devMode           = program.dev
const jsonOutDir        = devMode? outputDir : `dats` //json will sit in the frontends config dir, or for dev in the passed-in dir
const qpIni             = devMode? `./settings.ini`: `dats\\settings.ini` //settings from QP's ini file, or nix dev settings
const devExtrasOverride = devMode? `/Volumes/GAMES/MAME/EXTRAs/folders` : `` //on windows its specified in the above ini
console.log(
`Dev mode:               ${devMode? `on`: `off`}
Output dir:             ${outputDir}
MAME Json dir:          ${jsonOutDir}` 
)

//read these from the ini
const settings          = paths(qpIni, devExtrasOverride)
const romdataConfig     = {emu: settings.mameExe, winIconDir: settings.winIconDir, devMode} //these same settings get immutably passed to many things
console.log(
`MAME extras dir:        ${settings.mameExtrasPath}
MAME icons dir:         ${settings.winIconDir} 
MAME exe:               ${settings.mameExe}`
)

//scanning means filter a mame xml into json, add inis to the json, then make a file of it
const scan = () => {
  const {makeSystemsAsync, cleanJson, iniToJson, inis, printJson} = require('./scan')
  console.log(
`MAME xml file:          ${settings.mameXMLInPath}  
MAME ini dir:           ${settings.iniDir}`
)
  const iniDir            = settings.iniDir
  settings.mameXMLInPath  || _throw(`there's no MAME XML`)
  const  mameXMLStream    = fs.createReadStream(settings.mameXMLInPath)
  makeSystemsAsync(mameXMLStream) 
    .then( sysObj => {
      const {arcade} = sysObj 
     
      /* process all the inis into the json we specify their type (and their internal name if necessary)
       *   there are three types of ini file (see iniReader.js)
       *   n.b.: to add an ini to romdata, also populate it in makeRomdata */
      const mameJson = R.pipe( arcade =>
        inis.reduce( (systems, ini) => iniToJson(iniDir, ini)(systems), arcade ) 
        , cleanJson 
      )(arcade)
  
      const newSysObj = { versionInfo: sysObj.versionInfo, arcade: mameJson }
      printJson(jsonOutDir, jsonOutName)(newSysObj) //print out json with inis included, and also version info

      //save the version information into quickplay's ini file, do it last then a throw will end up least contradictory
      const config = ini.parse(fs.readFileSync(qpIni, `utf-8`))
      config.MAME.MameXMLVersion = sysObj.versionInfo.mameVersion
      fs.writeFileSync(qpIni, ini.stringify(config)) 

      return newSysObj
    })
    .catch(err => _throw(err) )
}

//fulfil a call to make an arcade set from a set of filter choices
const arcade = () => {
  const {filters, applyFilters, applySplits} = require('./arcade')
  const tickObject = [
     { name: `noBios`       , value: parseInt(settings.tickBios)       , filter: filters.biosFilter        }      
   , { name: `noCasino`     , value: parseInt(settings.tickCasino)     , filter: filters.casinoFilter      }    
   , { name: `noClones`     , value: parseInt(settings.tickClones)     , filter: filters.clonesFilter      }    
   , { name: `noMature`     , value: parseInt(settings.tickMature)     , filter: filters.matureFilter      }    
   , { name: `noMechanical` , value: parseInt(settings.tickMechanical) , filter: filters.mechanicalFilter  }
   , { name: `noMess`       , value: parseInt(settings.tickMess)       , filter: filters.messFilter        }      
   , { name: `noPreliminary`, value: parseInt(settings.tickPreliminary), filter: filters.preliminaryFilter }
   , { name: `noPrintClub`  , value: parseInt(settings.tickPrintClub)  , filter: filters.printClubFilter   }
   , { name: `noSimulator`  , value: parseInt(settings.tickSimulator)  , filter: filters.simulatorFilter   }
   , { name: `noTableTop`   , value: parseInt(settings.tickTableTop)   , filter: filters.tableTopFilter    }
   , { name: `noQuiz`       , value: parseInt(settings.tickQuiz)       , filter: filters.quizFilter        }
   , { name: `noUtilities`  , value: parseInt(settings.tickUtilities)  , filter: filters.utilitiesFilter   }
  ]

  const splitObject = [
     { name: `company`  , value: parseInt(settings.tickSplitCompany )}
   , { name: `genre`    , value: parseInt(settings.tickSplitGenre   )}
   , { name: `nplayers` , value: parseInt(settings.tickSplitNPlayers)}
   , { name: `bestgames`, value: parseInt(settings.tickSplitRating  )}
   , { name: `series`   , value: parseInt(settings.tickSplitSeries  )}
   , { name: `version`  , value: parseInt(settings.tickSplitVersion )}
   , { name: `year`     , value: parseInt(settings.tickSplitYear    )}
  ]

  readMameJson(jsonOutDir, jsonOutName).then( sysObj => {
    const {arcade} = sysObj 
    const userFilteredArcade = applyFilters(tickObject, arcade)
    generateRomdata(outputDir, romdataConfig)(userFilteredArcade)
    applySplits(splitObject, outputDir, romdataConfig)(userFilteredArcade) //now use that romdata to make the splits the user wants 

    return sysObj
  })
  .catch(err => _throw(err) )
}


//fulfil a call to make a mame file manager filtered romdata
const mfm = () => {
  const {mfmReaderAsync, mfmFilter}          = require('./mfm')
  console.log(`MAME file manager file: ${settings.mfmTextFileInPath}` )
  settings.mfmTextFileInPath || _throw(`there's no MFM File`) //TODO: recover?
  const  mfmTextFileStream = fs.createReadStream(settings.mfmTextFileInPath)
  readMameJson(jsonOutDir, jsonOutName).then( sysObj => {
    const {arcade} = sysObj 
    mfmReaderAsync(mfmTextFileStream) 
      .then( (mfmArray) => {
        const mfmFilteredJson = mfmFilter(mfmArray)(arcade) 
        generateRomdata(outputDir, romdataConfig)(mfmFilteredJson)

        return sysObj
      })
  })
  .catch(err => _throw(err) )
}

//these manual prints from an early version could be an integration test
const testArcadeRun = () => {
  const manualOutput                         = require('./testing/manualOutput.js')
  readMameJson(jsonOutDir, jsonOutName).then( sysObj => {
    const {arcade} = sysObj 
    manualOutput(`${outputDir}/MAME`, romdataConfig)(arcade) 
    romdataConfig.emu = `Retroarch Arcade (Mame) Win32`
    manualOutput(`${outputDir}/RetroArch`, romdataConfig)(arcade) 
    return sysObj
  })
  .catch(err => _throw(err) )
}


//FROM HERE ARE THE MESSTOOL OPTIONS

//JSON, DAT AND EFIND MAKER
const datAndEfind = () => {
  const XmlStream      = require('xml-stream')
  const {
      readMameXML
    , cleanSoftlists
    , cleanDevices
    , mungeCompanyAndSystemNames
    , mungeCompanyForType
    , makeFinalSystemTypes
    , removeBoringSystems
    , print
    , printSysdatAndJson
  }                    = require('./datAndEfind')
  
  const 
      datInPath        = `inputs/systems.dat`
    , datInStream      = fs.createReadStream(datInPath)
    , mameXMLInPath    = `inputs/mame187.xml`
    , stream           = fs.createReadStream(mameXMLInPath)
    , xml              = new XmlStream(stream)
    , mameIniOutPath   = `outputs/Mess_Mame.ini`
    , rarchIniOutPath  = `outputs/Mess_Retroarch.ini`
    , datOutPath       = `outputs/systems.dat`
    , jsonOutPath      = `outputs/systems.json`
  
  //set simple console logging
  const
      logIni  = false
    , logDat  = false
    , logJSON = false
  
  //program flow
  readMameXML( xml, systems => {
  
    R.pipe(
       cleanSoftlists
    ,  cleanDevices
    ,  mungeCompanyAndSystemNames
    ,  mungeCompanyForType
    ,  makeFinalSystemTypes
    ,  removeBoringSystems
    ,  print(mameIniOutPath, rarchIniOutPath, logIni)
    ,  printSysdatAndJson(logDat, logJSON, datInStream, datOutPath, jsonOutPath)
    )(systems)
  
  })
  
  
  function mockSystems(jsonOutPath, callback) {
    const input   = fs.readFileSync(jsonOutPath)
        , systems = JSON.parse(input)
    
    callback(systems, callback)
  }

}


//SOFTLISTS
const softlists = () => {
  const {
      callSheet
    , filterSoftlists
    , chooseDefaultEmus
    , makeParams
    , readSoftlistXML
    , cleanSoftlist
    , setRegionalEmu
    , printSoftlistRomdata
  }                   = require('./softlists')
  
  const hashDir       = `inputs/hash/`
    , outputDir       = `outputs/`
    , systemsJsonFile = fs.readFileSync(`${outputDir}systems.json`)
    , systems         = JSON.parse(systemsJsonFile)
    //TODO - you can append the DTD at the top of the file if it isn't being read correctly
  
    //decide what we want to print to console
    , logGames        = false
    , logChoices      = false
    , logRegions      = false
    , logExclusions   = false
    , logPrinter      = false
  
  //program flow at list level
  R.pipe(
      callSheet(logExclusions)
    , filterSoftlists(hashDir)
    , chooseDefaultEmus(logChoices)
    , makeSoftlists 
  )(systems)
  
  //program flow at emu level
  function makeSoftlists(emuSystems) {
    R.map(emu => {
          const softlistParams = makeParams(hashDir, outputDir, emu)
          readSoftlistXML(softlistParams.xml, softlist => {
            const cleanedSoftlist = cleanSoftlist(softlist)
            printSoftlistRomdata(logGames, logExclusions, logRegions, logPrinter, softlistParams, setRegionalEmu, cleanedSoftlist)
          })
        }, emuSystems)
  }

}


//EMBEDDED SYSTEMS
/* here we pair down the imp elsewhere to print us a set of embedded systems in mess
 * its important to note that this is only possible atm because there is still a standalone
 * mess executable you can ask to --listdevices. The mess team say that there won't be
 * this standalone exe in the future. If that comes to pass, they need a 'isMess' key. 
 * This class uses the mecahanics of the other classes in this module, but has a far
 * narrower scope, its an afterthought */

const embedded = () => {
  const XmlStream      = require('xml-stream')
  const {
      readMameXMLembedded
    , mungeCompanyAndSystemNamesEmbedded
    , removeBoringSystemsEmbedded
    , printRomdata 
  }                 = require('./embeddedSystems')
  
  const 
      mameXMLInPathEmbedded = `inputs/mess.xml`
    , streamEmbedded        = fs.createReadStream(mameXMLInPathEmbedded)
    , xmlEmbedded           = new XmlStream(streamEmbedded)
  
  //program flow
  readMameXMLembedded( xmlEmbedded, systems => {
    R.pipe(
       mungeCompanyAndSystemNamesEmbedded
     , removeBoringSystemsEmbedded
     , printRomdata
    )(systems)
  })

}

//TODO: promisify these so you can run combinations
program.scan          && scan()
program.mfm           && mfm()
program.arcade        && arcade()
program.testArcadeRun && testArcadeRun()
//messtool options
program.datAndEfind      && datAndEfind()
program.softlists && softlists()
program.embedded  && embedded()
