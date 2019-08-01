const {
  inputEmpty,
  checkRequire,
  isConfigValid,
  getSubDir
} = require('../../src/synctool/processInput.js')

const newError = msg => {
  throw new Error(msg)
}

describe('synctool: processInput', () => {
  describe('inputEmpty', () => {
    it('return true on empty String', () => {
      expect(inputEmpty()).to.be.true
      expect(inputEmpty(null)).to.be.true
      expect(inputEmpty(undefined)).to.be.true
      expect(inputEmpty('')).to.be.true
    })
    it('return false on non-empty string', () => {
      expect(inputEmpty('hello')).to.be.false
    })
  })

  describe('checkRequire', () => {
    it('should load a native module', () => {
      expect(checkRequire('fs').merge()).to.have.property('appendFile')
    })

    it('should not load a non-existent module', () => {
      expect(checkRequire('f').merge()).to.match(/Cannot find module/)
    })
  })

  describe('isConfigValid', () => {
    it('errors when not passed a config oject', () => {
      isConfigValid().matchWith({
        Ok: _ => newError('should not get an OK'),
        Error: ({ value }) => expect(value).to.equal('nothing was passed to me')
      })
    })
    it('errors when passed a string instead of a config object', () => {
      isConfigValid("here's a string").matchWith({
        Ok: _ => newError('should not get an OK'),
        Error: ({ value }) => expect(value).to.equal('not an object')
      })
    })

    it('error when passed an empty config oject', () => {
      isConfigValid({}).matchWith({
        Ok: _ => newError('should not get an OK'),
        Error: ({ value }) => expect(value).to.equal('object is empty')
      })
    })

    it('when passed a non-empty config, return it', () => {
      const nonEmptyObj = { someKey: 'some value' }
      isConfigValid(nonEmptyObj).matchWith({
        Ok: _ => newError('should not get an OK'),
        Error: ({ value }) => {
          expect(value).to.match(/remotePath is not set/)
          expect(value).to.match(/localPath is not set/)
        }
      })
    })
  })

  describe('getSubDir', () => {
    it('errors if child is not a subpath of parent', () => {
      expect(getSubDir('bar')('foo').merge(), 'should have failed').to.match(/is not in/)
    })

    it('errors if child and parent paths are the same', () => {
      const samePath = 'foo/bar/'
      expect(getSubDir(samePath)(samePath).merge(), 'should have failed').to.match(
        /are the same path/
      )
    })

    it('returns relative path if child is a subpath of parent', () => {
      expect(getSubDir('foo/bar/baz')('foo/bar').merge(), 'should have succeeded').to.equal('baz')
    })

    it("node's path module lets paths use leading dots/trailing slashes", () => {
      expect(
        getSubDir('foo/bar/baz/')('././foo/bar/baz').merge(),
        'should say paths are the same'
      ).to.match(/are the same path/)
    })
  })
})
