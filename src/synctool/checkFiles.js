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

// Stat follows symlinks, but other fs methods will need a real path
// don't switch on a returned error, the local file may very well not exist, we're only
// interested in changing the path if we find there's an existing symlink in the destination folder
// TODO: recursive version of this using path.dirname that will find a symlink on any level
// why not use fs.realpath? because the file needs to exist....
// Path -> Task Error Path
const getRealPath = filePath =>
  task(r => {
    const workingPath = filePath.split(/[\\/]/)
    const returnPath = []
    let outputPath = ''

    //i'm not sure reduce is best for this, as you can't bail out, yet we need to when either we find a non-existing but or we find a symlink
    const result = workingPath.reduce((returnPath, currentValue, index, array) => {
      //if (filePath.includes(returnPath) === false) { return returnPath} //we already changed our path because of a symlink
      console.log("checking " + path.join(returnPath, currentValue))
      //const bitOfPath = workingPath.shift()
      //returnPath.push(bitOfPath)
 //     if (fs.existsSync(path.join(returnPath, currentValue)) === false) {
 //         console.log(currentValue + " does not exist")
 //       if (outputPath === '') {
 //         outputPath = filePath // some part of this path isn’t real, we’re done, but since we can't exit a reduce early, do this
 //         return returnPath
 //       }
 //     } else {
        console.log("checking if " + path.join(returnPath, currentValue) + " is a symlink")
        //is it a symlink
        try {
        const realPath = fs.readlinkSync( path.join(returnPath, currentValue))
              console.log("I ONLY WENT AND FOUND A FUCKING SYMLINK " + currentValue)
              //array = []
              if (outputPath === '') return path.join(realPath) //outputPath = (path.join(realPath, workingPath.toString()))
        } catch {
          console.log(path.join(returnPath, currentValue) + "isnt a symlink")
      return path.join(returnPath, currentValue)
        }
         })
    if (outputPath === '') outputPath = filePath
    console.log('real output path is ' + result)
    //process.exit()
    r.resolve(result)
  })

// const getRealPath = filePath =>
//  task(r => {
//    // first check the target itself is a symlink
//    fs.readlink(filePath, (err, target) => {
//      err
//        ? // if not, check the targets parent dir is a symlink, handy for mame chds
//        fs.readlink(path.dirname(filePath), (err, parentTarget) => {
//          err
//            ? r.resolve(filePath) // assume its not a symlink
//            : (console.log(
//              `[synctool] - destination's parent dir is a symlink real path set to ${path.join(
//                parentTarget,
//                path.basename(filePath)
//              )}`
//            ),
//            r.resolve(path.join(parentTarget, path.basename(filePath))))
//        })
//        : (console.log(`[synctool] - destination is a symlink real path set to ${target}`),
//        r.resolve(target))
//    })
//  })

module.exports = { stat, isDir, isFile, getRealPath }
