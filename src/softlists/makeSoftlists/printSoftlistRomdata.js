'use strict'

const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const R = require('ramda')

const setRegionalEmu = require('./setRegionalEmu.js')
const { makeOtherSoftlists, doWeNeedToSpecifyDevice } = require('./otherGameNames')
const { makeParameters } = require('./otherGameNames')

module.exports = (settings, softlistParams, softlist, list) => {
  // don't make a dat or folder if all of the games for a softlist aren't supported
  if (!softlist.length) {
    log.exclusions(`INFO: Not printing softlist for ${softlistParams.name} : no working games`)
    return softlist
  }

  log.printer(`INFO: printing softlist for ${softlistParams.name}`)
  const romdataHeader = `ROM DataFile Version : 1.1`
  const noPath = `./qp.exe` // we don't need a path for softlist romdatas, they don't use it, we just need to point to a valid file
  const romdataLine = (
    { name, MAMEName, parentName, path, emu, company, year, parameters, comment },
    settings
  ) => {
    const callToEmu = settings.isItRetroArch ? `Retroarch ${emu} (MAME)` : `MAME ${emu}`
    const possiblyRetroArchParameters =
      parameters && settings.isItRetroArch
        ? `-L cores\\mame_libretro.dll " ${parameters}"`
        : parameters
    return (
      `${name}¬${MAMEName}¬${parentName}¬¬${path}¬${callToEmu}` +
      `¬${company}¬${year}¬¬¬¬${possiblyRetroArchParameters}¬${comment}¬0¬1¬<IPS>¬</IPS>¬¬¬`
    )
  }

  /*  1)  Display name, 2) _MAMEName, 3) _ParentName, 4) _ZipName, //Used Internally to store which file inside a zip file is the ROM
   *  5) _rom path //the path to the rom, 6) _emulator,7) _Company, 8) _Year, 9) _GameType, 10) )  _Rating 11)  _Language
   * 12)  _Parameters : String, 13)  _Comment, 14)_NumPlay 15) _ParamMode : TROMParametersMode,  16)  IPS start, 17)  IPS end,
   * 18) _MultiPlayer 19)_DefaultGoodMerge : String; //The user selected default GoodMerge ROM */

  /* For a system, takes the simple and homomorphic arrays: part/feature, info and sharedFeat
   *  (ie: they all have keys named the smae) and turns them into an array of comments to be printed */
  const createComment = commentCandidates => {
    const comments = []
    R.map(commentCandidate => {
      if (commentCandidate) {
        R.map(item => {
          const nonJapItem = item.value.replace(/[^\x00-\x7F]/g, '')
          comments.push(`${item.name}:${nonJapItem}`)
        }, commentCandidate)
      }
    }, commentCandidates)

    return comments
  }

  // in order to print a feature comment, we need to loop through the part array
  const makeFeature = partKey => {
    const featureComment = createComment(R.map(part => part.feature, partKey)).toString()
    // add a space separator only if we got something TODO: should only add space if createComment returned something, else we're starting the whole comment with space
    return featureComment.length ? ` ${featureComment}` : ``
  }

  /* Before we can decide whether we have a gamename conflict with another softlist for this system, we need to make
   *  a list of the other applicable softlists to check against. Done outside of the object loop in
   *  applyRomdata as we only want it to run once per softlist */
  // had to pass 'list' in here to retain info on which softlists have no hash files, TODO: tidy up: softlistParams and list contain duplicate info
  const originalOtherSoftlists = makeOtherSoftlists(softlistParams, list)

  // sets the variables for a line of romdata entry for later injection into a romdata printer
  const applyRomdata = (obj, settings) =>
    R.map(obj => {
      const calculatePath = () => {
        if (settings.mameFilePaths) {
          const weHaveMergedRoms =
            settings.mameFilePathsRomsType.toLowerCase() !== 'NonMerged'.toLowerCase()
          const zipType = settings.mameZipType.toLowerCase() === '7z'.toLowerCase() ? `7z` : `zip`
          const romName = weHaveMergedRoms && obj.cloneof ? obj.cloneof : obj.call
          // atm the best we can do is ask if the first thing in the box is a cdrom'
          if (obj.part[0] && obj.part[0].chdname && settings.mameRomPathTypeSoftlistChdsPath) {
            if (obj.part[1]) { console.log( `${obj.name} in ${ softlistParams.name } has other media, we're only printing the first chd: ${JSON.stringify( obj.part, null, 2)}`) }
            return path.join( settings.mameRomPathTypeSoftlistChdsPath, softlistParams.name, romName, `${obj.part[0].chdname}.chd`)
          } else if (settings.mameRomPathTypeSoftlistRomsPath) {
            return path.join( settings.mameRomPathTypeSoftlistRomsPath, softlistParams.name, `${romName}.${zipType}`)
          } else {
            return noPath
          }
        }
        return noPath
      }

      const emuWithRegionSet = setRegionalEmu(
        obj.name,
        softlistParams.thisEmulator,
        softlistParams.thisEmulator.regions
      )

      // TODO: to catch that situation where some c64 games have both a cart and a disk, you could send the part names of all the parts that make up the softlist item here, not just the first one
      const parameters = doWeNeedToSpecifyDevice(
        originalOtherSoftlists,
        obj.call,
        softlistParams
      )
        ? makeParameters(
          emuWithRegionSet.call,
          softlistParams.name,
          softlistParams.thisEmulator.loaderCall,
          obj.part[0].name
        )
        : ``

      const romParams = {
        name: obj.name.replace(/[^\x00-\x7F]/g, ''), // remove japanese
        MAMEName: obj.call,
        parentName: obj.cloneof ? obj.cloneof : ``,
        path: calculatePath(),
        emu: emuWithRegionSet.emulatorName, // we can't just use the default emu as many system's games are region locked. Hence all the regional code!
        company: obj.company.replace(/[^\x00-\x7F]/g, ''),
        year: obj.year,
        parameters,
        comment: `${createComment({
          // need to loop through info and shared feat to make comments, see the DTD, but also combine part/features to print
          info: obj.info,
          sharedFeat: obj.sharedFeat
        })}${makeFeature(obj[`part`])}`
      }
      return romdataLine(romParams, settings)
    }, softlist)

  const romdata = applyRomdata(softlist, settings)
  const romdataToPrint = R.prepend(romdataHeader, romdata)
  mkdirp.sync(softlistParams.outNamePath)

  /* I already did work to enable MAME icons in QuickPlay, so just print this folder config with each dat
   *   there are 2 systems which don't have icons in the set i want, so just write an icon file for everything */
  const iconTemplate = iconName => `[GoodMerge]
GoodMergeExclamationRoms=0
GoodMergeCompat=0
pref1=(U) 
pref2=(E) 
pref3=(J) 

[Mirror]
ChkMirror=0
TxtDir=
LstFilter=2A2E7A69700D0A2A2E7261720D0A2A2E6163650D0A2A2E377A0D0A

[RealIcon]
ChkRealIcons=1
ChkLargeIcons=0
Directory=${settings.winIconDir}

[BkGround]
ChkBk=0
TxtBKPath=

[Icon]
ChkIcon=1
CmbIcon=${iconName}.ico
`

  const machineMameName = softlistParams.thisEmulator.call

  fs.writeFileSync(`${softlistParams.outNamePath}/folders.ini`, iconTemplate(machineMameName))
  fs.writeFileSync(`${softlistParams.outTypePath}/folders.ini`, iconTemplate(machineMameName)) // last wins is fine
  const icon = settings.isItRetroArch ? `RetroArch` : `Mess`
  fs.writeFileSync(`${softlistParams.outRootDir}/folders.ini`, iconTemplate(icon)) // last wins is fine
  // now print the romdata itself
  fs.writeFileSync(softlistParams.outFullPath, romdataToPrint.join(`\n`), `latin1`) // utf8 isn't possible at this time

  return softlist
}
