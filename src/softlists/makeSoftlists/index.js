'use strict'

// see 'checkoOtherSoftlistNames.js` for notes about what happens here (TODO: why not move those notes here or somewhere else)
const cleanSoftlist        = require('./cleanSoftlist.js')
const makeParams           = require('./makeParams.js')
const printSoftlistRomdata = require('./printSoftlistRomdata.js')
const printEmbeddedRomdata = require('./printEmbeddedRomdata.js')
const readSoftlistXML      = require('./readSoftlistXML.js')
const readOtherSoftlistNames = require('./otherGameNames/readOtherSoftlistNames.js')

module.exports = {
    cleanSoftlist       
  , makeParams          
  , printSoftlistRomdata
  , printEmbeddedRomdata
  , readSoftlistXML     
  , readOtherSoftlistNames
}
