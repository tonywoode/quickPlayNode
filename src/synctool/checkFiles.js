const fs = require('fs')
const { task } = require('folktale/concurrency/task')
const Maybe = require('folktale/maybe')
const { Just, Nothing } = Maybe
const path = require('path')
// Path -> Task Error String
const stat = file =>
  task(r => {
    fs.stat(file, (err, stats) => {
      // https://github.com/origamitower/folktale/issues/153#issuecomment-452928871
      // we have a race condition in a Task's 'or', so the timeout I 'or' in the
      // main runner behaves correctly, but causes a stack print, without this check
      if (r.isCancelled) return
      err ? r.reject(err.message) : r.resolve(stats)
    })
  })

const isObject = obj => obj === Object(obj) // stackoverflow.com/a/22482737/3536094

// Object -> Maybe Boolean
const isDir = stat => (isObject(stat) ? Just(stat.isDirectory()) : Nothing())

// Object -> Maybe Boolean
const isFile = stat => (isObject(stat) ? Just(stat.isFile()) : Nothing())

// I don't think we need this because 0kb is just less than...
// Object -> Object -> Maybe Boolean
// const fileIsNotEmpty = stat =>
// isObject(stat) ? Maybe.Just(stat.size === 0) : Nothing() //folders have size 1

/* Stat follows symlinks, but other fs methods will need a real path don't switch on a returned
 * error, the local file may very well not exist, we're only interested in changing the path if we
 * find there's an existing symlink in the destination folder (why not use fs.realpath? because the
 * file needs to exist)
 * TODO: recurse (using path.dirname?): reduce isn't efficient here: you can't bailout, yet we
 * should when we find a non-existing dir in the tree */
// Path -> Task Path
const getRealPath = filePath =>
  task(r => {
    const workingPath = filePath.split(/[\\/]/)
    const realPath = workingPath.reduce((node, pathSoFar) => {
      const pathAtThisPoint = path.join(node, pathSoFar)
      // console.log('[synctool] checking if ' + pathPart + ' is a symlink')
      try {
        const realPathAtThisPoint = fs.readlinkSync(pathAtThisPoint)
        console.log(
          `[synctool] - output path part ${pathAtThisPoint} is a symlink, altering to ${realPathAtThisPoint}`
        )
        return path.join(realPathAtThisPoint)
      } catch {
        // console.log(`${pathPart} isnt a symlink`)
        return pathAtThisPoint
      }
    })
    console.log(`[synctool] - real output path is ${realPath}`)
    r.resolve(realPath)
  })

module.exports = { stat, isDir, isFile, getRealPath }
