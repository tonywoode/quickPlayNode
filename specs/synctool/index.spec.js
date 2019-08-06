const { synctool } = require('../../src/synctool/index.js')

describe('synctool: codeCurrentlyInIndex.js', () => {
  describe('synctool states', () => {
      it.only('errors if No File Given', done => {
        synctool('', './synctool_config_template.json')
          .run()
          .listen({
            onRejected: rej =>
              expect(rej).to.match(/you must supply/) && done(),
            onResolved: res => newError('synctool should have failed')
          })
    })


it.only('errors if No Config File', done => {
        synctool('hi', '')
          .run()
          .listen({
            onRejected: rej =>
              expect(rej).to.match(/config file not found/) && done(),
            onResolved: res => newError('synctool should have failed')
          })
    })
  })
})
