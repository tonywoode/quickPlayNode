const { synctool } = require('../../src/synctool/index.js')

describe('synctool: codeCurrentlyInIndex.js', () => {
  
describe('synctool', () => {
     it.only('errors if no file was given', done => {
  //     expect(synctool('', './synctool_config_template.json').to.equal("hi") )
  //    done()
  //      })
  //   })
synctool('',  './synctool_config_template.json', "testing")
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/you must supply/) && done(),
          onResolved: res => newError('synctool should have failed')
        })
     })
    
})
})
