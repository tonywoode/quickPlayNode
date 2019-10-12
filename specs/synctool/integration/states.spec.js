const mock = require('mock-fs')
const path = require('path')
const join = (...paths) => path.join(...paths)
const { synctool } = require('../../../src/synctool/index.js')
const localRoot = 'the/local/root'
const remoteRoot = 'the/remote/root'
const pathToConfig = 'qpnode_config.json'
const newError = msg => {
  throw new Error(msg)
}

describe('synctool: states', () => {
  // mockfs won't affect Module.resolveFilename in require calls:  //https://github.com/tschaub/mock-fs/issues/145
  // so config path here has to agree with config path on the file system (the contents of the file, however, are changeable here)
  // the mock config here will get used for the synctoolEnable test too, since require is sticky
  beforeEach(() => {
    mock({
      [pathToConfig]: `{ "localRoot" : "the/local/root", "remoteRoot": "the/remote/root",  "globalEnable": true }`,
      [localRoot]: { directory: {} },
      [remoteRoot]: { directory: {} }
    })
  })

  afterEach(() => mock.restore())

  describe('NoFileGiven', () => {
    it('errors if a path to a file wasnt provided over cli', done => {
      synctool('', pathToConfig)
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/must supply a filepath/) && done(),
          onResolved: res => newError(`synctool should have failed: ${res}`)
        })
    })
  })

  describe('NoConfigFile', () => {
    it('errors if config file isnt accessible', done => {
      synctool('_', 'any config file')
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/config file not found/) && done(),
          onResolved: res => newError(`synctool should have failed: ${res}`)
        })
    })
  })

  describe('InvalidJson', () => {
    it('errors if JSON config file isnt valid JSON', done => {
      mock({ 'qpnode_config.json': `{#!}` })
      synctool('_', pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/config file isn't valid json/)
            expect(rej).to.match(/in JSON at position/) && done()
          },
          onResolved: res => newError(`synctool should have failed: ${res}`)
        })
    })
  })

  // TODO: once require loads this invalid json, it won't let it go again, subsequent tests fail
  describe('InvalidConfig', () => {
    it.skip('errors if Config file loads, but doesnt contain settings expected', done => {
      mock({ [pathToConfig]: `{ "random key" : "_"}` })
      synctool('_', pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/config invalid/) && done()
          },
          onResolved: res => newError(`synctool should have failed: ${res}`)
        })
    })
  })

  describe('FileOutsideSyncPaths', () => {
    it('errors if the filename provided over cli isnt a subpath of the local root specified in config', done => {
      synctool('definitely outside sync paths', pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/is not a subpath of/) && done()
          },
          onResolved: res => newError(`synctool should have failed: ${res}`)
        })
    })
  })

  describe('RootDirNotFound', () => {
    it('errors if either of the root dirs doesnt exist', done => {
      mock.restore() // require should still have our config file
      mock({
        [pathToConfig]: `{ "localRoot" : "the/local/root", "remoteRoot": "the/remote/root" }`,
        // no local root
        [remoteRoot]: { directory: {} }
      })
      synctool(join(localRoot, 'file'), pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/sync path can\'t be accessed/) && done()
          },
          onResolved: res => newError(`synctool should have failed: ${res}`)
        })
    })
  })

  describe('FileNotFound', () => {
    it('errors if file path provided doesnt exist in one of the roots', done => {
      synctool(join(localRoot, 'file'), pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            // here's a lesson for you, i was regexing on /no such file or directory/ but a node update made me
            // have to rege on ENOENT - its ENOENT that will last...
            expect(rej).to.match(/ENOENT/) && done()
          },
          onResolved: res => newError(`synctool should have failed: ${res}`)
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
      synctool(join(localRoot, 'directory'), pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/only files can be synced/) && done()
          },
          onResolved: res => newError(`synctool should have failed: ${res}`)
        })
    })
  })
})
