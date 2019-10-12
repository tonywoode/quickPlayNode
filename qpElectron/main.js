const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const configFileName = '../synctool_config.json'
const config = fs.existsSync(configFileName) ? require(configFileName) : makeConfigFile()

let win

function makeConfigFile () {
  const config = {
    localRoot: '',
    remoteRoot: '',
    timeout: 10000,
    timeTolerance: 1000,
    globalEnable: false,
    enableOnHostName: [],
    useCopyOrCopyStream: 'copy'
  }
  const content = JSON.stringify(config)
  fs.writeFile(
    configFileName,
    content,
    'utf8',
    err => (err ? process.exit(1) : require(configFileName))
  )
}

exports.getConfig = () => {
  return config
}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('index.html')
}

app.on('ready', () => {
  createWindow()
  win.webContents.openDevTools()
})

exports.showOpenDialog = () => {
  const result = dialog.showOpenDialogSync(win, {
    properties: ['openFile', 'openDirectory']
  })
  console.log(result)
  return result
}
