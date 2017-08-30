'use strict'

const R                   = require(`ramda`)
const {readFile, createReadStream} = require(`fs`)
const _throw             = m => { throw new Error(m) }

const {cleanJson}        = require(`./src/cleanJson.js`)
const {iniToJson}        = require(`./src/fillFromIni.js`)
const makeRomdata        = require(`./src/makeRomdata.js`)
const {makeSystemsAsync} = require(`./src/readMameXml.js`)
const {printJson, printRomdataFolder, prepareBaseDir} 
                         = require(`./src/printers.js`)
const {sublist, getUniqueProps, makeFilteredJson} = require(`./src/filterMameJson.js`)

const mameXMLInPath      = `./inputs/mame187.xml`
const mameXMLStream      = createReadStream(mameXMLInPath)

const jsonOutPath        = `./outputs/mame.json`
const romdataOutBaseDir  = `./outputs/mame`
const winIconDir         = require(`./src/getDir.js`).getWinIconDir()


// If there's an xml that parses in the jsonOutDir, don't parse it all again
const decideWhetherToXMLAsync = () => new Promise( resolve =>
  readFile(jsonOutPath, (err, data) =>
    err? resolve(makeSystemsAsync(mameXMLStream) ) : resolve(JSON.parse(data) )  
  )
)

// these are the available inis, specifying their type (and their internal name if necessary)
//   there are three types of ini file (see iniReader.js)
//   n.b.: to add an ini to romdata, also populate it in makeRomdata
const inis = [
    { iniName: `arcade`,        iniType: `bare`}
  , { iniName: `arcade_NOBIOS`, iniType: `bare`}
  , { iniName: `bestgames`,     iniType: `section`}
  , { iniName: `category`,      iniType: `section`}
  , { iniName: `catlist`,       iniType: `section`}
  , { iniName: `genre`,         iniType: `section`}
  , { iniName: `languages`,     iniType: `section`}
  , { iniName: `mamescore`,     iniType: `kv`,     sectionName: `MAMESCORE`}
  , { iniName: `mess`,          iniType: `bare`}
  , { iniName: `monochrome`,    iniType: `section`}
  , { iniName: `nplayers`,      iniType: `kv`,     sectionName: `NPlayers`}
  , { iniName: `screenless`,    iniType: `bare`}
  , { iniName: `series`,        iniType: `section`}
  , { iniName: `version`,       iniType: `section`}
]

decideWhetherToXMLAsync()
  
  .then( systems => {
    // process all the inis into the json
    const filledSystems = inis.reduce( (systems, ini) => 
      iniToJson(ini.iniName, ini.iniType, ini.sectionName)(systems), systems ) 
    // post-process the data-complete json, printing it becomes a gatepost
    const mameJson = R.pipe(
       cleanJson
     , printJson(jsonOutPath) 
    )(filledSystems) 
  
   return mameJson
  })
  
  .then( mameJson => {
    prepareBaseDir(romdataOutBaseDir, `mame`)

    // first make the initial full thing
    const fullRomdata = makeRomdata(`Mame64`)(mameJson)
    printRomdataFolder(`${romdataOutBaseDir}/full`, `romdata.dat`, winIconDir, `mame`)(fullRomdata)

    const arcadeFilters = [
       { name: `nonMechanical`,   type: `remove`, path: [`ismechanical`] }
     , { name: `nonMechGenre`,    type: `remove`, path: [`genre`],    value: `Electromechanical` } //turns out you can't trust the ini bool
     , { name: `nonTableTop`,     type: `remove`, path: [`genre`],    value: `Tabletop` } //that means Mahjong etc
     , { name: `nonTableGenre`,   type: `remove`, path: [`category`], value: /Tabletop/ } //turns out you can't trust the ini AGAIN
     , { name: `deCloned`,        type: `remove`, path: [`cloneof`] }
     , { name: `noCasino`,        type: `remove`, path: [`genre`],    value: `Casino` }
     , { name: `noCasinoCatlist`, type: `remove`, path: [`catlist`],  value: /Casino/ } //turns out you can't trust genre
     , { name: `noMess`,          type: `remove`, path: [`mess`] }
     , { name: `noBios`,          type: `remove`, path: [`isbios`] }
     , { name: `noQuiz`,          type: `remove`, path: [`genre`],    value: `Quiz` }
    ] //probably also "Utilities / Update" genre and "Print Club" genre, and others...

    
    const multiFilteredJson = makeFilteredJson(arcadeFilters, mameJson)

    const originalVideoGamesRomdata = makeRomdata(`Mame64`)(multiFilteredJson)
    printRomdataFolder(`${romdataOutBaseDir}/originalVideoGames`, `romdata.dat`, winIconDir, `mame`)(originalVideoGamesRomdata)

     /* now make a naive no-mature set. Analysing the data shows we need to filter 
     *  BOTH by regex of Mature in catlist AND category. There's no point filtering
     *  by the genre "Mature" (its a tiny subset of those two), but we also need 
     *  to look for !word-separated "Adult" and "Sex" in game title
     *  There is a mature.ini available here: http://www.progettosnaps.net/catver/
     *  but in my experience, it doesn't filter out all of this...
     */

    const noMatureFilters = [
       { name: `noMatureCategory`, type: `remove`, path: [`category`], value: /Mature/ }
     , { name: `noMatureCatlist`,  type: `remove`, path: [`catlist`],  value: /Mature/ }
     , { name: `noAdult`,          type: `remove`, path: [`system`],   value: /\WAdult\W/i }
     , { name: `noSex`,            type: `remove`, path: [`system`],   value: /\WSex\W/i }
    ]

    const matureFilteredJson = makeFilteredJson(noMatureFilters, mameJson)

    const noMatureRomdata = makeRomdata(`Mame64`)(matureFilteredJson)
    printRomdataFolder(`${romdataOutBaseDir}/noMature`, `romdata.dat`, winIconDir, `mame`)(noMatureRomdata)

    // next let's make folder split by genre
    //  first, give me a list of all the genres
    const genreArray = getUniqueProps(`genre`)(mameJson)
    prepareBaseDir(`${romdataOutBaseDir}/Genre`, `mame`)


    // then filter out Driving games
    const onlyDrivingJson = sublist(`keep`, [`genre`], `Driving`)(mameJson)
    const onlyDrivingRomdata = makeRomdata(`Mame64`)(onlyDrivingJson)
    printRomdataFolder(`${romdataOutBaseDir}/onlyDriving`, `romdata.dat`, winIconDir, `mame`)(onlyDrivingRomdata)

    return fullRomdata
  })

  .catch(err => _throw(err) )
