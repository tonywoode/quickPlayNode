'use strict'

const path = require('path')
const {
  getMameIniRomPath,
  makeRomPathsAbs
} = require('../../src/printPaths/printPaths.js')


describe('printPaths', () => {

  describe('getMameIniRomPath', () => {
    const theRomPathInTheAbsolutIni = 'F:\\MAME\\ROMS'
    const theRomPathInTheRelativeIni = 'ROMS;CHDs'
    it('gets the contents of an absolute rompath string', () => {
      const result = getMameIniRomPath('./specs/printPaths/mameIniAbsolute/mame.ini', 'foobar')
      expect(result).to.equal(theRomPathInTheAbsolutIni)
    })

    it('gets the contents of a relative rompath string', () => {
      const result = getMameIniRomPath('./specs/printPaths/mameIniRelative/mame.ini', 'foobar')
      expect(result).to.include('foobar/ROMS') //see note following for why this is the best we can do
    })
  })


  describe('makeRomPathsAbs', () => {
    it('inserts absolute path from 2nd param if paths are relative', () => {
      const mameEmuDir = 'C:/Emulators/Mame'
      const filepath = 'ROMS;CHDs;Software List ROMS;Software List CHDs'
      const absoluteFilepath = makeRomPathsAbs(filepath, mameEmuDir)
      //we can't do this, because path.resolve works like this:
      // "If, after processing all given path segments, an absolute path has not yet been generated, the current working directory is used."
      // meaning on nix you'll get your path to this script appended to the front
      //const expected =   "C:/Emulators/Mame/ROMS;C:/Emulators/Mame/CHDs;C:/Emulators/Mame/Software List ROMS;C:/Emulators/Mame/Software List CHDs"
      //best we can do is check that we have the windows absolute path included in the output
      expect(absoluteFilepath).to.include(mameEmuDir)
    })
  })

})
