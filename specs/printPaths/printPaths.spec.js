'use strict'

const path = require('path')
const {addMameFilePathsToSettings, getBasename} = require('../../src/printPaths/printPaths.js')
const no = _ => false
const yes = console.log
global.log = global.log || {
  filePaths: yes // to keep test output clean feel free to change it
}

describe('printPaths', () => {
  const isItRetroArch = false // TODO: if true, things start to equl undefined?

  describe('rompath splitting', () => {
    // internally, we later will get the foldername of this exe, that's why we pass in a nonexistent exe
    const mameEmuDir = './specs/printPaths/mameIniAbsolute'

   it('looks up a real ini file from the filesystem', () => {
      const devMode = false // regrettable, otherwise we look at test mame.ini in root
      const paths = addMameFilePathsToSettings(mameEmuDir, isItRetroArch, devMode)
      expect(paths.mameRoms).to.equal('F:\\MAME\\ROMS')
      expect(paths.mameChds).to.equal('')
    })

    it('fills in just settings.mameRoms if mame.ini has only one rompath', () => {
      const devMode = false // regrettable, otherwise we look at test mame.ini in root
      const paths = addMameFilePathsToSettings(mameEmuDir, isItRetroArch, devMode)
      expect(paths.mameRoms).to.equal('F:\\MAME\\ROMS')
      expect(paths.mameChds).to.equal('')
    })
    // now use the mame.ini in root, the one that has all 4 paths, quoted and absolute
    it('fills in individual paths to different content types if more than one rompath in mame ini', () => {
      const devMode = true
      const paths = addMameFilePathsToSettings(mameEmuDir, isItRetroArch, devMode)
      expect(paths.mameRoms).to.equal('F:\\MAME\\ROMS')
      expect(paths.mameChds).to.equal('F:\\MAME\\CHDs')
    })
    // it('detects if one rompath is of the expected type but others are not, and tries to use them as appropriate', () => {
    //   expect(false).to.equal(true)
    // })
  })
  // test for adding the absolute path if the mame.ini only contains a relative path
  describe('absolute path', () => {
    // this is a bit contrived, we're relying on this:
    // path.win32.isAbsolute(romPathPart) to be false here for this test to pass, without the win32 it woule be false anyway, but the tests above would fail as they would see windows paths as not absolute
    it('changes a single path to absolute if relative', () => {
      const relativeExePath = `./specs/printPaths/mameIniRelative`
      const absoluteExePath = path.resolve(relativeExePath)
      const mameEmuDir = `${relativeExePath}`
      let devMode = false
      const paths = addMameFilePathsToSettings(mameEmuDir, isItRetroArch, devMode)
      expect(paths.mameRoms).to.equal(path.join(absoluteExePath, 'ROMS'))
      expect(paths.mameChds).to.equal(path.join(absoluteExePath, 'CHDs'))
    })

    it('does not alter a windows absolute path, despite the tests possibly running on nix', () => {
      const relativeExePath = `./specs/printPaths/mameIniAbsolute`
      const absoluteExePath = path.resolve(relativeExePath)
      const expectedWinPath = 'F:\\MAME'
      const mameEmuDir = `${absoluteExePath}`
      let devMode = false
      const paths = addMameFilePathsToSettings(mameEmuDir, isItRetroArch, devMode)
      // win32 join because otherwise our path separator would be nix
      expect(paths.mameRoms).to.equal(path.win32.join(expectedWinPath, 'ROMS'))
      // ideally we'd have 4 mame.inis so we can check all combos of single path, all paths, and abs relative
    })
  })

  describe('distance', () => {
    it.skip('removes the string "mame" from anywhere in a rompath, so that we disregard it for any comparisons', () => {
      expect(false).to.equal(true)
    })
  })
})
