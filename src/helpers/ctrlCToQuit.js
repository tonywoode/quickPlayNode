// https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js/14861513#14861513
// its said SIGINT should work on any platform now, i didn't find that to be true, the below finally makes terminal quit,
// but doesn't print the message
module.exports = () => {
  const message = '[QPNode] exiting (you asked me to...)'
  if (process.platform === 'win32') {
    require('readline')
      .createInterface({
        input: process.stdin,
        output: process.stdout
      })
      .on('SIGINT', () => console.log(message) || process.emit('SIGINT'))

    //TODO: what code to exit with, and anyway is windows receiving this?
    process.on('SIGINT', () => console.log(message) || process.exit(0))
  }
}
