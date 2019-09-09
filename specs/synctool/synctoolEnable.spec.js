const mock = require('mock-fs')
const path = require('path')
const join = (...paths) => path.join(...paths)
const { synctoolEnable } = require('../../src/synctool/index.js')
const localRoot = 'the/local/root'
const remoteRoot = 'the/remote/root'
const pathToConfig = 'synctool_config.json'
const newError = msg => {
  throw new Error(msg)
}

describe('synctoolEnable', () => {
  // mockfs won't affect Module.resolveFilename in require calls:  //https://github.com/tschaub/mock-fs/issues/145
  // so config path here has to agree with config path on the file system (the contents of the file, however, are changeable here)
  // if this test runs after the synctool test, the below mock will be ignored, we already required a config, require is sticky....
  beforeEach(() => {
    mock({
      [pathToConfig]: `{ "localRoot" : "the/local/root", "remoteRoot": "the/remote/root", "globalEnable": true }`,
      [localRoot]: { directory: {} },
      [remoteRoot]: { directory: {} }
    })
  })

  afterEach(() => mock.restore())

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

  // TODO: once require has loaded some json, which it did in previous test, it won't let it go again, subsequent tests fail
  describe('InvalidJson', () => {
    it.skip('errors if JSON config file isnt valid JSON', done => {
      mock({ 'synctool_config.json': `{#!}` })
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
    it.skip('is enabled if host key matches hostname')
    it.skip("is disabled if host key doesn't match hostname")
  })
})
