'use strict'

const path = require('path')
const addMameFilePathsToSettings = require('../../src/printPaths/printPaths.js')

const log = {
  filePaths: false // to keep test output clean feel free to change it
}

describe('printPaths', () => {
  describe('rompath splitting', () => {
    const settings = {
      mameExePath: './specs/printPaths/mameIniAbsolute/mame.exe'
    }

    it('fills in just settings.mameRoms if mame.ini has only one rompath', () => {
      const devMode = false // regrettable, otherwise we look at test mame.ini in root
      addMameFilePathsToSettings(settings, devMode, log)
      expect(settings.mameRoms).to.equal('F:\\MAME\\ROMS')
      expect(settings.mameChds).to.equal('')
    })
    // now use the mame.ini in root, the one that has all 4 paths, quoted and absolute
    it('fills in individual paths to different content types if more than one rompath in mame ini', () => {
      const devMode = true
      addMameFilePathsToSettings(settings, devMode, log)
      expect(settings.mameRoms).to.equal('F:\\MAME\\ROMS')
      expect(settings.mameChds).to.equal('F:\\MAME\\CHDs')
    })
  })

  // test for adding the absolute path if the mame.ini only contains a relative path
  describe('absolute path', () => {
    // this is a bit contrived, we're relying on this:
    // path.win32.isAbsolute(romPathPart) to be false here for this test to pass, without the win32 it woule be false anyway, but the tests above would fail as they would see windows paths as not absolute
    it('changes a single path to absolute if relative', () => {
      const relativeExePath = `./specs/printPaths/mameIniRelative`
      const absoluteExePath = path.resolve(relativeExePath)
      const settings = { mameExePath: `${relativeExePath}/mame.exe` }
      let devMode = false
      addMameFilePathsToSettings(settings, devMode, log)
      expect(settings.mameRoms).to.equal(path.join(absoluteExePath, 'ROMS'))
      expect(settings.mameChds).to.equal(path.join(absoluteExePath, 'CHDs'))
    })

    it('does not alter a windows absolute path, despite the tests possibly running on nix', () => {
      const relativeExePath = `./specs/printPaths/mameIniAbsolute`
      const absoluteExePath = path.resolve(relativeExePath)
      const expectedWinPath = 'F:\\MAME'
      const settings = { mameExePath: `${absoluteExePath}/mame.exe` }
      let devMode = false
      addMameFilePathsToSettings(settings, devMode, log)
      // win32 join because otherwise our path separator would be nix
      expect(settings.mameRoms).to.equal(path.win32.join(expectedWinPath, 'ROMS'))
      // ideally we'd have 4 mame.inis so we can check all combos of single path, all paths, and abs relative
    })
  })
})
