const mock = require('mock-fs')
const path = require('path')
const join = (...paths) => path.join(...paths)
const newError = msg => {
  throw new Error(msg)
}
const localRoot = 'the/local/root'
const remoteRoot = 'the/remote/root'

describe('synctool: romdataFlip', () => {
  beforeEach(() => {
    mock({
      [localRoot]: { directory: {} },
      [remoteRoot]: { directory: { AFile: 'Hi im a file' } }
    })
  })

  afterEach(() => mock.restore())

  describe('romdataFlip', () => {
    it.skip('errors if config invalid')
    it.skip('does nothing if romdata.dat files not found')
    it.skip('does nothing if either root dir not found in romdata.dats')
    it.skip('changes the local root path into the remote root path on all romdata.dat files in dir passed')
    it.skip('changes the remote root path into the local root path on all romdata.dat files in dir passed')
  })
})
