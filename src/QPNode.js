'use strict'
const program = require('commander')
const fs = require('fs')
const path = require('path')
const _throw = m => {
  throw new Error(m)
}
const util = require('util')

const paths = require('./paths.js')
// these two are used by multiple modules and are being passed in as dependecies
const { generateRomdata } = require('./romdata/printRomdata.js')
const readMameJson = require('./romdata/readMameJson.js')
const addMameFilePathsToSettings = require('./printPaths/printPaths.js')
const scan = require('./scan')
const { arcade } = require('./arcade')
const { mfm } = require('./mfm')
const { testArcadeRun } = require('./testing')
const { softlists } = require('./softlists')
const { synctool, synctoolEnable, synctoolFolderFlip } = require('./synctool')
const configFileName = path.join('dats', 'qpnode_config.json')

// tee output to console and to a logfile https://stackoverflow.com/a/30578473/3536094
const logFile = './mametool_logfile.txt'
const logStream = fs.createWriteStream(logFile) // todo: close stream on exit!

const muxLog = logType => (...args) => {
  const text = util.format.apply(this, args) + '\n'
  logStream.write(`${new Date().toISOString()} ${text}`)
  process[logType].write(text)
}

console.log = muxLog('stdout')
console.error = muxLog('stderr')

// https://github.com/tj/commander.js/issues/944
// TODO: need real nested subcommands, swith to yargs?
program
  .command(`mametool`)
  .option('--output-dir [path]')
  .option(`--scan`)
  .option(`--dev`)
  // mameTool options
  .option(`--arcade`)
  .option(`--mfm`)
  .option(`--testArcadeRun`)
  // messTool options
  .option(`--softlists [rompath]`) // todo, []=optional, <>=required, surely latter
  .action(mametoolObj => {
    const outputDir = mametoolObj.outputDir
    !mametoolObj.scan &&
      (fs.existsSync(outputDir) ||
        _throw(
          `output directory ${outputDir} doesn't exist, so Mametool can't output any romdatas`
        ))
    const devMode = mametoolObj.dev
    const jsonOutDir = devMode ? outputDir : `dats` // json will sit in the frontends config dir, or for dev in the passed-in dir
    const jsonOutName = `mame.json`
    const jsonOutPath = `${jsonOutDir}/${jsonOutName}`
    const qpIni = devMode ? `./settings.ini` : `dats\\settings.ini` // settings from QP's ini file, or nix dev settings
    const devExtrasOverride = devMode ? `/Volumes/GAMES/MAME/EXTRAs/folders` : `` // on windows its specified in the settings.ini above

    devMode && console.log(`\t*** Mametool is in Dev mode ***\n`)
    ;(mametoolObj.scan && !devMode) || console.log(`Output dir:             ${outputDir}`)
    console.log(`MAME Json dir:          ${jsonOutDir}`)

    // read these from the ini
    const settings = paths(qpIni, devExtrasOverride)
    settings.devMode = devMode
    settings.isItRetroArch = path.basename(settings.mameExePath).match(/retroarch/i) // best bet is to limit ourselves to what the emu file is called for this

    console.log(
      `MAME extras dir:        ${settings.mameExtrasPath}
MAME icons dir:         ${settings.winIconDir} 
MAME exe:               ${settings.mameExe}
MAME exe path:          ${settings.mameExePath}`
    )

    const log = {
      // datAndEfind
      efindProblems: devMode,
      loaderCalls: true,
      loaderCallsVerbose: false,
      // the data/efind/scan artifacts
      dat: false,
      efind: false,
      json: false,
      // softlist
      // these probably should be printed to the user
      printer: true, // prints softlist names as synchronously printed, leave on
      fileProblems: true, // as of mame 187, there is persistently one file missing in mame's hash: 'squale'
      filePaths: true, // will also print helpful 'necessary to run this rom' file info
      // these probably shouldn't
      deviceProblems: false,
      otherSoftlists: false,
      otherGameNames: false,
      otherGameConflicts: false,
      findRegions: false,
      regions: false,
      regionsGames: false,
      exclusions: false
    }

    // determine that location of the systems.dat
    const devInputsDir = `inputs/current`
    const datInPath = devMode ? `${devInputsDir}/systems.dat` : `dats\\systems.dat`
    const datOutPath = devMode ? `${outputDir}/systems.dat` : `dats\\systems.dat`
    // are we making a mess or retroarch efinder file? to make both the users has to go through the menu again and select the appropriate emu
    const efindOutName = settings.isItRetroArch ? `Mess_Retroarch.ini` : `Mess_Mame.ini`
    const efindOutPath = devMode ? `${outputDir}/${efindOutName}` : `EFind\\${efindOutName}`
    console.log(`EFind Ini output Path:  ${efindOutPath}`)

    // softlist paths
    const mameEmuDir = path.dirname(settings.mameExePath)
    // mess hash dir is determinable relative to mame exe dir (mame is distributed that way/retroarch users must place it here to work)
    const liveHashDir = settings.isItRetroArch
      ? `${mameEmuDir}\\system\\mame\\hash\\`
      : `${mameEmuDir}\\hash\\`
    const hashDir = devMode ? `${devInputsDir}/hash/` : liveHashDir

    if (settings.mameFilePaths) {
      settings.mameRoms = ''
      settings.mameChds = ''
      settings.mameSoftwareListRoms = ''
      settings.mameSoftwareListChds = ''
      addMameFilePathsToSettings(settings, mameEmuDir, settings.isItRetroArch, devMode, log)
    }

    // TODO: promisify these so you can run combinations
    mametoolObj.scan && scan(settings, jsonOutPath, qpIni, efindOutPath, datInPath, datOutPath, log)
    mametoolObj.mfm && mfm(settings, readMameJson, jsonOutPath, generateRomdata, outputDir)
    mametoolObj.arcade && arcade(settings, jsonOutPath, outputDir, readMameJson, generateRomdata)
    mametoolObj.testArcadeRun && testArcadeRun(settings, readMameJson, jsonOutPath, outputDir)
    mametoolObj.softlists && softlists(settings, jsonOutPath, hashDir, outputDir, log)
  })

program
  .command(`synctool`)
  .option(`--sync [rompath]`)
  .option(`--checkStatus`)
  .option(`--folderFlip <startFolder>`)
  .action(synctoolObj => {
    synctoolObj.sync && runSynctool(synctoolObj.sync, configFileName)
    synctoolObj.checkStatus && synctoolStatus()
    synctoolObj.folderFlip && synctoolRomdataFlip(synctoolObj.folderFlip, configFileName)
  })

const runSynctool = (rompath, configFileName) => {
  synctool(rompath, configFileName)
    .run()
    .listen({
      onRejected: rej =>
        console.log(`[synctool] - no work done: ${rej}`) || setTimeout(() => process.exit(1), 3000),
      onResolved: result =>
        console.log(`[synctool] - ${result}: copied ${rompath}`) ||
        setTimeout(() => process.exit(0), 3000)
    })
}

const synctoolStatus = () => {
  synctoolEnable(configFileName)
    .run()
    .listen({
      onRejected: rej => {
        console.error(rej)
        process.exit(1)
      },
      onResolved: res => {
        console.log(res)
        process.exit(0)
      }
    })
}

const synctoolRomdataFlip = (startFolder, configFileName) => {
  synctoolFolderFlip(startFolder, configFileName)
    .run()
    .listen({
      onRejected: rej => {
        console.error(rej)
        process.exit(1)
      },
      onResolved: res => {
        console.log(res)
        process.exit(0)
      }
    })
}

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  console.log(
    `MAMETOOL TEST USAGE: 
'npm start -- --scan'          make a mame json output file, which is used by the arcade and mfm flags
'npm start -- --arcade'        make an arcade set to the ini flags in settings.ini, and output to outputsDir in package.json
'npm start -- --mfm'           make an arcade set to a flatfile list output of mame file manager, and output to outputsDir in package.json
'npm start -- --testArcadeRun' makes a set of both Mame and RetroArch romdata and splits from a canned list
'npm start -- --softlists'     makes a softlist set
'npm run full'                 deletes the outputs folder, scans, makes an arcade set, and softlists plus embedded (according to config settings)
'npm run mess-start            doesn't delete output dir, just runs scan and softlist/embedded generation
'npm run debug -- --arcade'    break on ln1 of making an arcade set to the ini flags in settings.ini, and output to outputsDir in package.json)
`
  )
  process.exit()
}

module.exports = { synctoolEnable, synctoolFolderFlip }
