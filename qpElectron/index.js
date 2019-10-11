const remote = require('electron').remote
const main = remote.require('./main.js')

const config = main.getConfig()
document.getElementById('localPath').value = config.localRoot
document.getElementById('remotePath').value = config.remoteRoot
function cancelEvent () {
  var window = remote.getCurrentWindow()
  window.close()
}

function okEvent () {
  var window = remote.getCurrentWindow()
  window.close()
}

function openLocal () {
  const result = main.showOpenDialog()
}

function openRemote () {
  const result = main.showOpenDialog()
}

const array = []

const displayArray = () => {
  let e = '<hr/>'
  for (const val of array) e += `Enabled on Host: ${val}<br/>`
  document.getElementById('Result').innerHTML = e
}

function add_element_to_array () {
  const hostnameBox = document.getElementById('hostname')
  hostname.value && (array.push(hostnameBox.value), (hostnameBox.value = ''), displayArray())
}

function print_config () {
  alert(JSON.stringify(main.getConfig(), null, 2))
}
function delete_array () {
  array.length = 0
  displayArray()
}
