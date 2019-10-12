const remote = require('electron').remote
const main = remote.require('./main.js')

const config = main.getConfig()

let enabledOnMachines = []

document.getElementById('globalEnable').checked = config.globalEnable
document.getElementById('localPath').value = config.localRoot
document.getElementById('remotePath').value = config.remoteRoot
Array.isArray(config.enableOnHostName) && (enabledOnMachines = config.enableOnHostName)
displayArray()

function cancelEvent () {
  var window = remote.getCurrentWindow()
  window.close()
}

function okEvent () {
  config.globalEnable = document.getElementById('globalEnable').checked
  config.localRoot = document.getElementById('localPath').value
  config.remoteRoot = document.getElementById('remotePath').value
  config.enableOnHostName = enabledOnMachines //in case it wasn't an array when we started
  var window = remote.getCurrentWindow()
  window.close()
}

function openLocal () {
  const result = main.showOpenDialog()
  result && (document.getElementById('localPath').value = result)
}

function openRemote () {
  const result = main.showOpenDialog()
  result && (document.getElementById('remotePath').value = result)
}

function displayArray () {
  let e = '<hr/>'
  for (const val of enabledOnMachines) e += `Enabled on Host: ${val}<br/>`
  document.getElementById('Result').innerHTML = e
}

function add_element_to_array () {
  const hostnameBox = document.getElementById('hostname')
  hostname.value &&
    (enabledOnMachines.push(hostnameBox.value), (hostnameBox.value = ''), displayArray())
}

function print_config () {
  alert(JSON.stringify(main.getConfig(), null, 2))
}
function delete_array () {
  enabledOnMachines.length = 0
  displayArray()
}
