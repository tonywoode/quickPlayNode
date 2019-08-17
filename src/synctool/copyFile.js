const fs = require('fs')
const { task } = require('folktale/concurrency/task')
const crypto = require('crypto')

// String -> Task String String
// https://github.com/h2non/jsHashes is an alternative
const fileHash = filePath =>
  task(r => {
    const hash = crypto.createHash(`md5`)
    const stream = fs.createReadStream(filePath, { autoClose: true })
    stream.on(`data`, data => hash.update(data, `utf8`))
    stream.on(`end`, () => r.resolve(hash.digest(`hex`)))
    stream.on(`error`, () => r.reject(`Could not read from ${filePath}`))
  })

// unfortunate: on windows, the recursive flag isn't stopping an error if leaf dir exists,
// which its really suppposed to. The fix is to continue in that case. hopefully you can remote this soon
const mkdirRecursive = folderPath =>
  task(r =>
    fs.mkdir(folderPath, { recursive: true }, err => 
      err.message.includes('already exists, mkdir')? 
          r.resolve(true) 
        : err? 
        r.reject(err) 
      : r.resolve(true)
    )
  )

// String -> Task Error Stream
const readFile = filePath =>
  task(r => {
    const stream = fs.createReadStream(filePath)
    stream.on(`error`, err => {
      r.reject(err)
    })
    r.resolve(stream) // nb: gets called at least once even in error condition
  })

// String -> Task Error, String
const writeFile = (filePath, stream) =>
  task(r => {
    const writeStream = fs.createWriteStream(filePath)
    writeStream.on('finish', () => {
      writeStream.close()
      r.resolve(filePath)
    })

    writeStream.on('error', err => {
      writeStream.end()
      r.reject(err)
    })
    stream.pipe(writeStream)
  })

// here's the old way of copying, its much slower and copies only file contents and loses all metadata!
const copyFileStream = (src, dest) => readFile(src).chain(stream => writeFile(dest, stream))

/* fs.copyfile uses native os copy, which seems initially the better plan
 * but forget about progress: https://github.com/nodejs/node/pull/15034#issuecomment-326092955
 * and forget about progress in anything that uses fs.copyFile https://github.com/sindresorhus/cp-file/issues/18#issuecomment-327860860 */
// String -> Task Error, String
const copyFile = (src, dest) =>
  task(r => fs.copyFile(src, dest, err => (err ? r.reject(err) : r.resolve(true))))

module.exports = { fileHash, copyFile, copyFileStream, mkdirRecursive }
