const { isEmpty, isNil, compose, chain, reduce } = require('ramda')
const { relative, isAbsolute } = require('path')
const Result = require('folktale/result')

const isString = str => typeof str === 'string' || str instanceof String
const strEmpty = str => isNil(str) || str === ''
const inputEmpty = str => !isString(str) || strEmpty(str)
const isObj = obj => typeof obj === 'object' // null is object tho
const objEmpty = obj => isNil(obj) || isEmpty(obj)
// string -> Result Error cjsModule
const checkRequire = module => {
  try {
    // stackoverflow.com/a/13214660/3536094
    const mod = require(module)
    return Result.Ok(mod)
  } catch (e) {
    return Result.Error(e)
  }
}
// Object -> Result Error Object
const checkParamPassed = param =>
  (param && Result.Ok(param)) || Result.Error(`nothing was passed to me`)
// Object -> Result Error Object
const checkObjType = obj => (!isObj(obj) && Result.Error(`not an object`)) || Result.Ok(obj)
// Object -> Result Error Object
const checkObjEmpty = obj => (objEmpty(obj) && Result.Error(`object is empty`)) || Result.Ok(obj)
// String -> Object -> Result Error Object
const checkKey = key => config =>
  (config.hasOwnProperty(key) && !strEmpty(config[key]) && Result.Ok(config)) ||
  Result.Error(`${key} is not set`)

// Object -> Result Error Object
const checkConfigKeys = config => {
  const checkKeys = (problems, key) => {
    checkKey(key)(config).orElse(error => problems.push(error))
    return problems
  }
  const issues = reduce(checkKeys, [], ['remoteRoot', 'localRoot', 'timeout'])
  return issues.length ? Result.Error(issues.toString()) : Result.Ok(config)
}

// Object -> Result Error Object
// const checkConfigKeys = config => {
//  const remote = checkKey('remoteRoot')(config)
//  const local = checkKey('localRoot')(config)
//  return local
//    .orElse(
//      noLocal =>
//        remote
//          .orElse(noRemote => Result.Error(`Problems with config:\n ${noRemote} \n ${noLocal}`))
//          .chain(_ => Result.Error(noLocal)) // there was a remote, but there still is no local
//    )
//    .chain(_ => remote) // there is a local, but there still may be no remote
// }

// Object -> Result Error Maybe Object
const isConfigValid = config =>
  compose(chain(checkConfigKeys), chain(checkObjEmpty), chain(checkObjType), checkParamPassed)(
    config
  )

// Path -> Path -> Result Error RelativePath
const getSubDir = child => parent => {
  // stackoverflow.com/a/45242825/3536094
  const pathFromTo = relative(parent, child)
  if (!pathFromTo) {
    return Result.Error(`${child} and ${parent} are the same path`)
  }
  const result = !isAbsolute(pathFromTo) && !pathFromTo.startsWith('..')
  // console.log(`[getSubDir] is "${child}" a child of "${parent}": ${result}`)
  // console.log(`[getSubDir] path from child to parent is ${pathFromTo}`)
  return result ? Result.Ok(pathFromTo) : Result.Error(`${child} is not in ${parent}`)
}

module.exports = {
  inputEmpty,
  checkRequire,
  isConfigValid,
  getSubDir
}
