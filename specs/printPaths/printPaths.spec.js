'use strict'

const path = require('path')
const {
  addMameFilePathsToSettings,
  fillRomPaths,
  checkForDupes,
  sanitiseRomPaths,
  rateADifferenceObject,
  rateAllRomPaths,
  rateUsersRompaths,
  rateEachFolderForEachType,
  getLowestDistanceForTypes
} = require('../../src/printPaths/printPaths.js')
const no = _ => false
const yes = console.log
global.log = global.log || {
  filePaths: yes // to keep test output clean feel free to change it
}

describe('printPaths', () => {
  const isItRetroArch = false // TODO: if true, things start to equal undefined?

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
      const romPath = 'F:\\MAME\\ROMS'
      const paths = fillRomPaths([romPath])
      expect(paths.mameRoms).to.equal(romPath)
      expect(paths.mameChds).to.equal('')
    })
    // now use the mame.ini in root, the one that has all 4 paths, quoted and absolute
    it('fills in individual paths to different content types if more than one rompath in mame ini', () => {
      const romPath1 = 'F:\\MAME\\ROMS'
      const romPath2 = 'F:\\MAME\\CHDs'
      const romPaths = [romPath1, romPath2]
      const paths = fillRomPaths(romPaths)
      expect(paths.mameRoms).to.equal(romPath1)
      expect(paths.mameChds).to.equal(romPath2)
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

  describe('sanitiseRomPath', () => {
    it('when supplied an array of paths, removes the string "mame" from the basename', () => {
      const pretendPaths = ['/mamechds', '/me/mine/romsmame']
      const sanitised = sanitiseRomPaths(pretendPaths)
      expect(sanitised).to.deep.equal([
        {
          basename: 'mamechds',
          basenameNoMame: 'chds',
          romPathAbs: '/mamechds'
        },
        {
          basename: 'romsmame',
          basenameNoMame: 'roms',
          romPathAbs: '/me/mine/romsmame'
        }
      ])
    })
  })

  describe('duplicateFoldernames', () => {
    it('removes duplicate basename in our santitised list, and alerts us', () => {
      // note arrays expected to always match arity/order
      //  const romPathsAbs = ['/pathA/roms', '/pathB/roms', '/pathC/mamechds', '/pathD/chds']
      //  const noMameString = ['roms', 'roms', 'chds', 'chds']

      const romPathsObjArr = [
        {
          basenameNoMame: 'roms',
          romPathAbs: '/pathA/roms'
        },
        {
          basenameNoMame: 'roms',
          romPathAbs: '/pathB/roms'
        },
        {
          basenameNoMame: 'chds',
          romPathAbs: '/pathC/mamechds'
        },
        {
          basenameNoMame: 'chds',
          romPathAbs: '/pathD/chds'
        }
      ]

      expect(checkForDupes(romPathsObjArr)).to.deep.equal([
        {
          basenameNoMame: 'roms',
          romPathAbs: '/pathA/roms'
        },
        {
          basenameNoMame: 'chds',
          romPathAbs: '/pathC/mamechds'
        }
      ])
    })
  })

  describe('distance', () => {
    const stoogesDiffObj = [
      {
        basenameNoMame: 'Mo'
      },
      {
        basenameNoMame: 'Larry'
      },
      {
        basenameNoMame: 'Curly'
      }
    ]

    it('rates a difference object', () => {
      const obj1 = stoogesDiffObj[0]
      const romPathTypes = ['Roms', 'Chds', 'SoftwareListRoms', 'SoftwareListChds']
      const rated = rateADifferenceObject(romPathTypes, obj1)
      expect(rated).to.deep.equal({
        basenameNoMame: 'Mo',
        Roms: 0,
        Chds: 0,
        SoftwareListRoms: 0,
        SoftwareListChds: 0
      })
    })

    it(`rates an Object Array of difference objects`, () => {
      const romPathTypes = ['Roms', 'Chds', 'SoftwareListRoms', 'SoftwareListChds']
      const rated = rateAllRomPaths(romPathTypes)(stoogesDiffObj)
      expect(rated).to.deep.equal([
        {
          basenameNoMame: 'Mo',
          Roms: 0,
          Chds: 0,
          SoftwareListRoms: 0,
          SoftwareListChds: 0
        },
        {
          basenameNoMame: 'Larry',
          Roms: 0,
          Chds: 0,
          SoftwareListRoms: 0.10526315789473684,
          SoftwareListChds: 0.10526315789473684
        },
        {
          basenameNoMame: 'Curly',
          Roms: 0,
          Chds: 0,
          SoftwareListRoms: 0,
          SoftwareListChds: 0
        }
      ])
    })

    it(`rates an Object Array of user difference objects`, () => {
      // these should be absolute paths
      const romPaths = ['mameRomFolders', 'mameChdFolder', 'mameSoftlists', 'mameSoftChds']
      const romPathTypes = ['Roms', 'Chds', 'SoftwareListRoms', 'SoftwareListChds']
      const result = rateUsersRompaths(romPathTypes, romPaths)
      expect(result).to.deep.equal([
        {
          romPathAbs: 'mameRomFolders',
          basename: 'mameRomFolders',
          basenameNoMame: 'RomFolders',
          Roms: 0.3333333333333333,
          Chds: 0,
          SoftwareListRoms: 0.16666666666666666,
          SoftwareListChds: 0
        },
        {
          romPathAbs: 'mameChdFolder',
          basename: 'mameChdFolder',
          basenameNoMame: 'ChdFolder',
          Roms: 0,
          Chds: 0.36363636363636365,
          SoftwareListRoms: 0,
          SoftwareListChds: 0.17391304347826086
        },
        {
          romPathAbs: 'mameSoftlists',
          basename: 'mameSoftlists',
          basenameNoMame: 'Softlists',
          Roms: 0,
          Chds: 0,
          SoftwareListRoms: 0.43478260869565216,
          SoftwareListChds: 0.43478260869565216
        },
        {
          romPathAbs: 'mameSoftChds',
          basename: 'mameSoftChds',
          basenameNoMame: 'SoftChds',
          Roms: 0,
          Chds: 0.6,
          SoftwareListRoms: 0.2727272727272727,
          SoftwareListChds: 0.6363636363636364
        }
      ])
    })

    it('when supplied a list of path types and a path, rates the path for the types', () => {
      const romPathTypes = [
        'C:/me/Roms',
        'D:/ROMS/SO_ROMS/Chds',
        'X:/Child/Chad/Ched/SoftwareListRoms',
        'P:/SoftwareListChds'
      ]
      const romPath = 'roms'
      const distances = rateEachFolderForEachType(romPath, romPathTypes)
      expect(distances)
        .to.be.an('array')
        .of.length(4)
    })
  })

  // we could do with snapshots now. Here's what distances i got with these inputs
  // 'roms' [ 1, 3, 12, 14 ]
  // 'chds' [ 3, 1, 15, 13 ]
  // 'softlist_roms' [ 10, 11, 9, 10 ]
  // 'softlist_chd' [ 10, 11, 10, 9 ]

  it('when supplied ratings for each folder, picks the best for a romtype', () => {
    const yourRomPathBasenames = ['roms', 'chds', 'softlist_roms', 'softlist_chd']
    const romPathTypes = ['Roms', 'Chds', 'SoftwareListRoms', 'SoftwareListChds']
    const allDistances = [[1, 3, 12, 14], [3, 1, 15, 13], [10, 11, 9, 10], [10, 11, 10, 9]]
    const allDistancesObj = [
      {
        name: 'Roms',
        roms: 1,
        chds: 3,
        softwareListRoms: 12,
        softwareListChds: 14
      },
      {
        name: 'Chds',
        roms: 3,
        chds: 1,
        softwareListRoms: 15,
        softwareListChds: 13
      },
      {
        name: 'SoftwareListRoms',
        roms: 10,
        chds: 11,
        softwareListRoms: 9,
        softwareListChds: 10
      },
      {
        name: 'mameSoftwareListChds',
        roms: 10,
        chds: 11,
        softwareListRoms: 10,
        softwareListChds: 9
      }
    ]

    // so we get an array of objects with the name of each basename
    const bases = yourRomPathBasenames.map(basename => ({ name: basename }))
    // now we need to give each object a field for each type
    //  const things = bases.map( base => ({ name: base.name, romPathTypes }))
    const addArrAsObjKeys = (arr, obj) =>
      arr.reduce((obj, key, idx) => ({ ...obj, [key]: '' }), obj)
    const inserted = bases.map(base => addArrAsObjKeys(romPathTypes, base))
    // now we use Object.keys to do our differences on....
    console.log(inserted)
    // process.exit()
    const answer = getLowestDistanceForTypes(romPathTypes, allDistances)
    // what answer do we want?
    console.log(answer)
  })
})
