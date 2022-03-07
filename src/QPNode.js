'use strict'

const no = _ => false
const yes = console.log
// global goes first, else no modules will see it
global.log = global.log || {
  // datAndEfind
  efindProblems: no,
  loaderCalls: yes,
  loaderCallsVerbose: no,
  // the data/efind/scan artifacts
  dat: no,
  efind: no,
  json: no,
  // softlist
  // these probably should be printed to the user
  printer: yes, // prints softlist names as synchronously printed, leave on
  fileProblems: yes, // as of mame 187, there is persistently one file missing in mame's hash: 'squale'
  filePaths: yes, // will also print helpful 'necessary to run this rom' file info
  // these probably shouldn't
  deviceProblems: no,
  otherSoftlists: no,
  otherGameNames: no,
  otherGameConflicts: no,
  findRegions: no,
  regions: no,
  regionsGames: no,
  exclusions: no
}

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
const { determinePathToMameIni, getMameIniRomPath } = require('./printPaths/printPaths.js')
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

// problem is though, this won't have time to get to the logfile
process.on('uncaughtException', err => {
  console.error('FATAL ERROR: uncaught exception:', err.stack)
  process.exit(1)
})

// https://github.com/tj/commander.js/issues/944 TODO: need real nested subcommands, swith to yargs?
program
  .command('mametool')
  .option('--output-dir [path]')
  .option('--scan')
  .option('--dev')
  // mameTool options
  .option('--arcade')
  .option('--mfm')
  .option('--testArcadeRun')
  // messTool options
  .option('--softlists [rompath]') // todo, []=optional, <>=required, surely latter
  .option('--getRomPath <mameExeDir>')
  .action(mametoolObj => {
    if (mametoolObj.getRomPath) {
      const mameIniFileName = './mame.ini'
      const messIniFileName = './mess.ini'
      const isItRetroArch = path.basename(mametoolObj.getRomPath).match(/retroarch/i)
      const mameEmuDir = path.dirname(mametoolObj.getRomPath) // or should I look this up from the settings? see belows mameEmuDir! is it important to have this saved in settings first, or more important to have this passed from Delphi? Ultimately we need a check for if no mame emu is selected in the mame options in Delphi, and if its not maybe default to all 'roms;?
      const mameIniPath = determinePathToMameIni(mameEmuDir, isItRetroArch, mameIniFileName, messIniFileName)
      const mameRomPaths = getMameIniRomPath(mameIniPath, mameEmuDir)
      console.log(mameRomPaths)
      process.exit(1) // we want this call part of mametool, but its not part of the mametool flow
    }
    const outputDir = mametoolObj.outputDir
    !mametoolObj.scan &&
      (fs.existsSync(outputDir) ||
        _throw(
          `output directory ${outputDir} doesn't exist, so Mametool can't output any romdatas`
        ))
    const devMode = mametoolObj.dev
    devMode && console.log('\t*** Mametool is in Dev mode ***\n')
    devMode && (log.efindProblems = yes)
    const devInputsDir = 'inputs/current'
    const qpIni = devMode ? `${devInputsDir}/settings.ini` : 'dats\\settings.ini' // settings from QP's ini file, or nix dev settings
    // read these from the ini
    const settings = paths(qpIni)
    settings.devMode = devMode
    // override the iniDir from that settings file if we're in dev mode...on windows its specified in the settings.ini, in dev its in inputs dir
    //devMode && (settings.iniDir = `${devInputsDir}/folders`)
    settings.isItRetroArch = path.basename(settings.mameExePath).match(/retroarch/i) // best bet is to limit ourselves to what the emu file is called for this
    const efindOutName = settings.isItRetroArch ? 'Mess_Retroarch.ini' : 'Mess_Mame.ini'
    const mameEmuDir = path.dirname(settings.mameExePath)

    const devObj = {
      jsonOutPath: `${outputDir}/mame.json`, // json will sit in the frontends config dir, or for dev in the passed-in dir
      iniDir: `${devInputsDir}/folders`,
      datInPath: `${devInputsDir}/systems.dat`, // determine that location of QuickPlays systems.dat, and where to write the amended version
      datOutPath: `${outputDir}/systems.dat`,
      efindOutPath: `${outputDir}/${efindOutName}`, // are we making a mess or retroarch efinder file? to make both the users has to go through the menu again and select the appropriate emu
      hashDir: `${devInputsDir}/hash/`
    }

    const liveObj = {
      jsonOutPath: 'dats\\mame.json',
      iniDir: `${settings.mameExtrasPath}\\folders`,
      datInPath: 'dats\\systems.dat',
      datOutPath: 'dats\\systems.dat',
      efindOutPath: `EFind\\${efindOutName}`,
      // mess hash dir is determinable relative to mame exe dir (mame is distributed that way/retroarch users must place it here to work)
      hashDir: settings.isItRetroArch ? `${mameEmuDir}\\system\\mame\\hash\\` : `${mameEmuDir}\\hash\\`
    }

    const { jsonOutPath, iniDir, datInPath, datOutPath, efindOutPath, hashDir } = devMode ? devObj : liveObj
    ;(mametoolObj.scan && !devMode) || console.log(`Output dir:             ${outputDir}`)

    console.log(`MAME Json path:         ${jsonOutPath}
MAME extras dir:        ${settings.mameExtrasPath}
MAME icons dir:         ${settings.winIconDir} 
MAME exe:               ${settings.mameExe}
MAME exe path:          ${settings.mameExePath}
EFind Ini output Path:  ${efindOutPath}`
    )

    if (settings.mameFilePaths) {
      log.filePaths(`MAME roms path:         ${settings.mameRomPathTypeRomsPath}`)
      log.filePaths(`MAME chds path:         ${settings.mameRomPathTypeChdsPath}`)
      log.filePaths(`MAME software list roms path: ${settings.mameRomPathTypeSoftlistRomsPath}`)
      log.filePaths(`MAME software list chds path: ${settings.mameRomPathTypeSoftlistChdsPath}`)
    }

    // TODO: promisify these so you can run combinations
    mametoolObj.scan && scan(settings, iniDir, jsonOutPath, qpIni, efindOutPath, datInPath, datOutPath)
    mametoolObj.mfm && mfm(settings, readMameJson, jsonOutPath, generateRomdata, outputDir)
    mametoolObj.arcade && arcade(settings, jsonOutPath, outputDir, readMameJson, generateRomdata)
    mametoolObj.testArcadeRun && testArcadeRun(settings, readMameJson, jsonOutPath, outputDir)
    mametoolObj.softlists && softlists(settings, jsonOutPath, hashDir, outputDir)
  })

program
  .command('synctool')
  .option('--sync [rompath]')
  .option('--checkStatus')
  .option('--folderFlip <startFolder>')
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
