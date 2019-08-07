const mock = require('mock-fs')
const path = require('path')
const join = (...paths) => path.join(...paths)
const { synctool } = require('../../src/synctool/index.js')
const root = 'root/path/on/my/pc'
const pathToConfig = 'dir/dir/dir/config'
const pathToSrcDir = join(root, `source`)
const pathToTextFile = join(root, `source/textFile`)
const pathToEmptyFile = join(root, `source/emptyFile`)



describe('synctool: codeCurrentlyInIndex.js', () => {
  //mockfs won't affect Module.resolveFilename in require calls:  //https://github.com/tschaub/mock-fs/issues/145
  //so config path here has to agree with config path on the file system (the contents of the file, however, are changable here)
beforeEach(() => {
    mock({ "synctool_config.json": `{ "localRoot" : "/some/valid/path", "remoteRoot": "/some/other/valid/path" }` })
})
  describe('synctool states', () => {
    it('errors if No File Given', done => {
      synctool('', pathToConfig)
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/must supply a filepath/) && done(),
          onResolved: res => newError('synctool should have failed')
        })
    })

    it('errors if No Config File', done => {
      synctool('_', 'any config file')
        .run()
        .listen({
          onRejected: rej =>
            expect(rej).to.match(/config file not found/) && done(),
          onResolved: res => newError('synctool should have failed')
        })
    })

    it('errors if Invalid Json', done => {
    mock({ "synctool_config.json": `{ "localRoot" : "/some/valid/path",}` })
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
})
