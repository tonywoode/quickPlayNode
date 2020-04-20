'use strict'

const  addMameFilePathsToSettings = require('../../src/printPaths/printPaths.js')

const log = {
  filePaths : false //to keep test output clean feel free to change it
}
let devMode = false //regrettable, otherwise we look at test mame.ini in root
const settings = {
  mameExePath : './specs/printPaths/mame.ini'
}

 describe('printPaths', () => {
    it('fills in just settings.mameRoms if mame.ini has only one rompath', () => {
      addMameFilePathsToSettings(settings, devMode,log)
      expect(settings.mameRoms).to.equal('roms')
      expect(settings.mameChds).to.equal('')
    })
   //now use the mame.ini in root, the one that has all 4 paths, quoted and absolute
   devMode = true
  it.only('fills in just settings.mameRoms if mame.ini has only one rompath', () => {
      addMameFilePathsToSettings(settings, devMode,log)
      expect(settings.mameRoms).to.equal('F:\\MAME\\ROMS')
      expect(settings.mameChds).to.equal('F:\\MAME\\CHDs')
    })
  // TODO: now we need to code and test for adding the absolute path if the mame.ini only contains a relative path
 })

