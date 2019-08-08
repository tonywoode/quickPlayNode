const mock = require('mock-fs')
const path = require('path')
const join = (...paths) => path.join(...paths)
const { synctool } = require('../../src/synctool/index.js')
const root = 'root/path/on/my/pc'
const pathToConfig = 'dir/dir/dir/config'
const pathToSrcDir = join(root, `source`)
const pathToTextFile = join(root, `source/textFile`)
const pathToEmptyFile = join(root, `source/emptyFile`)
const newError = msg => {
  throw new Error(msg)
}

describe.only('synctool: states', () => {
  // mockfs won't affect Module.resolveFilename in require calls:  //https://github.com/tschaub/mock-fs/issues/145
  // so config path here has to agree with config path on the file system (the contents of the file, however, are changable here)
  beforeEach(() => {
    mock({
      'synctool_config.json': `{ "localRoot" : "some/valid/path", "remoteRoot": "some/other/valid/path" }`,
      'some/valid/path/': { directory: {} },
      'some/other/valid/path/': { directory: {} }
    })
  })
  describe('NoFileGiven', () => {
    it('errors if a path to a file wasnt provided over cli', done => {
      synctool('', pathToConfig)
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/must supply a filepath/) && done(),
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  describe('NoConfigFile', () => {
    it('errors if config file isnt accessible', done => {
      synctool('_', 'any config file')
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/config file not found/) && done(),
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  describe('InvalidJson', () => {
    it('errors if JSON config file isnt valid JSON', done => {
      mock({ 'synctool_config.json': `{ "localRoot" : "some/valid/path",}` })
      synctool('_', 'synctool_config.json')
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/config file isn't valid json/)
            expect(rej).to.match(/in JSON at position/) && done()
          },
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  // TODO: once require loads this invalid json, it won't let it go again, subsequent tests fail
  describe('InvalidConfig', () => {
    it.skip('errors if Config file loads, but doesnt contain settings expected', done => {
      mock({ 'synctool_config.json': `{ "random key" : "_"}` })
      synctool('_', 'synctool_config.json')
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/Problems with config/) && done()
          },
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  describe('FileOutsideSyncPaths', () => {
    it('errors if the filename provided over cli isnt a subpath of the local root specified in config', done => {
      synctool('definitely outside sync paths', 'synctool_config.json')
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/is not a subpath of/) && done()
          },
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  describe('RootDirNotFound', () => {
    it('errors if either of the root dirs doesnt exist', done => {
      mock.restore() // require should still have our config file
      mock({
        'synctool_config.json': `{ "localRoot" : "some/valid/path", "remoteRoot": "some/other/valid/path" }`,
        'some/other/valid/path/': { directory: {} }
      })
      synctool('some/valid/path/file', 'synctool_config.json')
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/sync path can\'t be accessed/) && done()
          },
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  describe('FileNotFound', () => {
    it('errors if file path provided doesnt exist in one of the roots', done => {
      synctool('some/valid/path/file', 'synctool_config.json')
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/no such file or directory/) && done()
          },
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  describe('InvalidStat', () => {
    it.skip('errors if Stat passed to fns that expect a stat, is not a valid stat', done => {
      // it was just protective programming, can't cause it by invoking synctool...
    })
  })

  describe('NotAFile', () => {
    it('errors if we pass Synctool a directory', done => {
      // note that, despite passing in the local path,
      // we should error that the REMOTE path doesn't exist
      synctool('some/valid/path/directory', 'synctool_config.json')
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/only files can be synced/) && done()
          },
          onResolved: res => newError('synctool should have failed')
        })
    })
  })
})
