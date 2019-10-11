const { app, BrowserWindow, dialog } = require('electron')

let win

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
}
