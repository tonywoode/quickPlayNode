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
      'some/valid/path/': {},
      'some/other/valid/path/file': 'hello'
    })
  })
  describe('NoFileGiven', () => {
    it('errors if No File Given', done => {
      synctool('', pathToConfig)
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/must supply a filepath/) && done(),
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  describe('NoConfigFile', () => {
    it('errors if No Config File', done => {
      synctool('_', 'any config file')
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/config file not found/) && done(),
          onResolved: res => newError('synctool should have failed')
        })
    })
  })

  describe('InvalidJson', () => {
    it('errors if Invalid Json', done => {
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

  //TODO: once require loads this invalid json, it won't let it go again, subsequent tests fail
  describe('InvalidConfig', () => {
    it.skip('errors if Config Invalid', done => {
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
    it('errors if File Outside Sync Paths', done => {
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

  describe('FileNotFound', () => {
    it('errors if File Not Found', done => {
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
    it.skip('errors if Stat is invalid', done => {
      // it was just protective programming, can't cause it by invoking synctool...
    })
  })
})
