'use strict'

const fs        = require('fs')
const XmlStream = require('xml-stream')
const R         = require('ramda')
const _throw    = m => { throw new Error(m) }

const readGameNamesFromXML = require('../readGameNamesFromXML.js')

module.exports = (hashDir, softlist, list, callback) => {
  const otherSoftlistDevices = []
  //todo: actually we aren't taking the game names from ALL softlists - maybe that would be quicker?
  const thisSoftlistsOtherGameNames = {}
  //make a list of the other softlists for this system, but don't bother including softlists already filtered out
  R.map( emu => emu.name in list && otherSoftlistDevices.push(emu.name), softlist.otherSoftlists)
  if (otherSoftlistDevices.length) { 
    log.otherSoftlists(`${softlist.name} on same system: ${JSON.stringify(otherSoftlistDevices)}`)
    var num = 0
    R.map( name => {
      //since we're now adhering to 'list' the filter that created that already did the below check
      //fs.existsSync(`${hashDir}${name}.xml`) || 
        //_throw(`was asked to read names from invalid softlist ${hashDir}${name}.xml - these should have been filtered out before this point?`)
      const stream = fs.createReadStream(`${hashDir}${name}.xml`)
      const xml    = new XmlStream(stream)
      readGameNamesFromXML(xml, name, softlist, (err, names) => {
        err && console.error(err)
        //console.log(`some other games of ${emulator.name}: ${JSON.stringify(names)}`)
        thisSoftlistsOtherGameNames[name] = names 
        num++
        //maybe this is the best way you're gonna get to manually code a Promise.all with callbacks
        //https://stackoverflow.com/a/36879062/3536094
        num === otherSoftlistDevices.length && callback(thisSoftlistsOtherGameNames)
      })
    }, otherSoftlistDevices)
  }
  else { callback(thisSoftlistsOtherGameNames) }
}  

