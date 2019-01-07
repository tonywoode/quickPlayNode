'use strict'

let fs               = require('fs') //rewired in test, don't try and destructure
const path = require('path')
const ini            = require('ini')
const R              = require('ramda')
const Maybe             = require('data.maybe')
const { Just, Nothing } = Maybe

const iniFlattener   = require('./iniFlattener.js')

//TODO - iniDir is static - it needs to be a lamda here

// need throw in statement position >=3 x ahead. https://stackoverflow.com/questions/9370606/
const _throw = m => { throw new Error(m) }

/* 
 * https://github.com/npm/ini/issues/60i, https://github.com/npm/ini/issues/22
 *  they are adament that dots are valid separators in ini file format, but is that 
 *  really borne by the spec? I tried some other ini libraries, best to stick with this
 *  ...and escape dots, always (there's lots of 'Misc.' in mame ini files)....
 */
const parseIni = bufferedIni => ini.parse(bufferedIni.replace(/\./g, `\\.`) )

// in order of preference find the ini by being in root, being in folderName, being in folder with own name or being somewhere in path breadth first
// getIniPath :: ( Path, Path, Path ) -> Maybe Path
const getIniPath = (file, inisFolder, folderName) => {
  if (!file || !inisFolder) return Nothing()
  //  fs.readdirSync(folder).forEach( file => {
  //     const subPath = path.join(folder, file)
  //    if(fs.lstatSync(subPath).isDirectory()){
  //      findIni(file,subPath)
  //    } else {
  const node = path.join(inisFolder, file)
  const folderNameNode = folderName ? path.join(inisFolder, folderName) : 'folderName not supplied'
  if (folderName && fs.existsSync(folderNameNode) && fs.lstatSync(folderNameNode).isDirectory()) {
    return fs.existsSync(path.join(inisFolder, folderName, file))
  } else {
    if (fs.lstatSync(node).isDirectory()) { //if the ini is in a folder named after itself
      return false
    } else {
      return fs.existsSync(node) ? Just(node) : Nothing()
    }
  }
}
//  })
//}

// this will load an ini file using the ini reader...
const loadGenericIni = (iniDir, iniName) => {
  try { return parseIni(fs.readFileSync(`${iniDir}/${iniName}.ini`, `utf-8`) ) }
  catch(err) { console.error(`PROBLEM: iniReader: "${iniName}" can't be read at "${iniDir}"`); return {}  }
}

// BUT, either that ini will have an annoying section header preventing it from being generic....
// (sectionName is the top-level-key to remove, since its unpredictably different to the filename..sigh...)
const loadKVIni = (
  iniDir, iniName, sectionName = _throw(`you didn't supply a section name`) 
) => R.prop(sectionName, loadGenericIni(iniDir, iniName) )

// OR it will have a header of only 'ROOT FOLDER' and then have just keys, this type of
//   ini needs a boolean value, and when used the key needs to be the name of the ini (which we do anyway)
const loadBareIni = (iniDir, iniName) =>
   R.map(game => !!game, loadKVIni(iniDir, iniName, `ROOT_FOLDER`) )

// OR, it will be section-to-key addressable, a nightmare to look up against....
const loadSectionIni = (iniDir, iniName) => iniFlattener(loadGenericIni(iniDir, iniName) )


// Main function which chooses between the above https://toddmotto.com/deprecating-the-switch-statement-for-object-literals/
const loadIni = (iniDir, ini) => {
  const iniTypes = {
      bare    : () => loadBareIni(iniDir, ini.iniName)
    , kv      : () => loadKVIni(iniDir, ini.iniName, ini.sectionName )
    , section : () => loadSectionIni(iniDir, ini.iniName)
  }

  return iniTypes[ini.iniType]? iniTypes[ini.iniType]() : 
    _throw(`iniType "${ini.iniType}" not defined, you need to supply a first param of e.g."bare"/"kv"/"section"`)

}

// most of these for unit tests only
module.exports = { getIniPath, loadIni, parseIni, loadGenericIni, loadKVIni, loadBareIni, loadSectionIni }
