const mock = require('mock-fs')
const path = require('path')
const join = (...paths) => path.join(...paths)
const { synctoolEnable } = require('../../../src/synctool/index.js')
const localRoot = 'the/local/root'
const os = require('os') //why is this necessary?
const remoteRoot = 'the/remote/root'
const pathToConfig = 'qpnode_config.json'
const newError = msg => {
  throw new Error(msg)
}
let fakeHostName = 'pepper'
describe('synctoolEnable', () => {
  // mockfs won't affect Module.resolveFilename in require calls:  //https://github.com/tschaub/mock-fs/issues/145
  // so config path here has to agree with config path on the file system (the contents of the file, however, are changeable here)
  // if this test runs after the synctool test, the below mock will be ignored, we already required a config, require is sticky....
  let sandbox
  beforeEach(() => {
    mock({
      [pathToConfig]: `{ "localRoot" : "the/local/root", "remoteRoot": "the/remote/root", "globalEnable": false, "enableOnHostName": ["pepper"] }`,
      [localRoot]: { directory: {} },
      [remoteRoot]: { directory: {} }
    })
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    mock.restore()
    sandbox.restore()
  })

  describe('NoFileGiven', () => {
    it('errors if a path to a file wasnt provided over cli', done => {
      synctoolEnable()
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/no config filename passed/) && done(),
          onResolved: res => newError(`synctoolEnable should have failed: ${res}`)
        })
    })
  })

  describe('NoConfigFile', () => {
    it('errors if config file isnt accessible', done => {
      synctoolEnable('any config file')
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/config file not found/) && done(),
          onResolved: res => newError(`synctoolEnable should have failed: ${res}`)
        })
    })
  })

  // TODO: once require has loaded some json, which it did in previous test, it won't let it go again, subsequent tests fail. Until i can fix, these tests have to be run in isolation
  describe('InvalidJson', () => {
    it.skip('errors if JSON config file isnt valid JSON', done => {
      mock({ 'qpnode_config.json': `{#!}` })
      synctoolEnable(pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/config file isn't valid json/)
            expect(rej).to.match(/in JSON at position/) && done()
          },
          onResolved: res => newError(`synctoolEnable should have failed: ${res}`)
        })
    })
  })

  // ditto
  describe('InvalidConfig', () => {
    it.skip('errors if Config file loads, but doesnt contain settings expected', done => {
      mock({ [pathToConfig]: `{ "random key" : "_"}` })
      synctoolEnable(pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(/config invalid/) && done()
          },
          onResolved: res => newError(`synctoolEnable should have failed: ${res}`)
        })
    })
  })

  describe('Reports config status', () => {
    it('reports as enabled if set in config', done => {
      synctoolEnable(pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(newError(`synctoolEnable should have succeeded: ${rej}`)) && done()
          },
          onResolved: res => expect(res).to.match(/SyncTool is Enabled/) && done()
        })
    })

    // maybe fails for the same reason as invalid config, once a valid config is required, it sticks?
    it.skip('reports as disabled if set in config', done => {
      mock.restore()
      mock({
        [pathToConfig]: `{ "localRoot" : "the/local/root", "remoteRoot": "the/remote/root", "globalEnable": false }`,
        [localRoot]: { directory: {} },
        [remoteRoot]: { directory: {} }
      })
      synctoolEnable(pathToConfig)
        .run()
        .listen({
          onRejected: rej => {
            expect(rej).to.match(newError(`synctoolEnable should have succeeded: ${rej}`)) && done()
          },
          onResolved: res => expect(res).to.match(/SyncTool is Disabled/) && done()
        })
    })
  })

  describe('EnableOnHostName key', () => {
    it.skip('is enabled if host key matches hostname', done => {
      sandbox.stub(os, `hostname`).returns(fakeHostName)
      synctoolEnable(pathToConfig)
        .run()
        .listen({
          onResolved: res => expect(res).to.match(/SyncTool is Enabled/) && done(),
          onRejected: rej => {
            expect(rej).to.match(newError(`synctoolEnable should have succeeded: ${rej}`)) && done()
          }
        })
    })
  })

  it.skip("is disabled if host key doesn't match hostname", done => {
    fakeHostName = 'popper'
    sandbox.stub(os, `hostname`).returns(fakeHostName)
    synctoolEnable(pathToConfig)
      .run()
      .listen({
        onResolved: res => expect(res).to.match(/SyncTool is Disabled/) && done(),
        onRejected: rej => {
          expect(rej).to.match(newError(`synctoolEnable should have succeeded: ${rej}`)) && done()
        }
      })
  })
})
