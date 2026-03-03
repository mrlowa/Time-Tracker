const electron = require('electron');
console.log('Electron require result:', electron);
const { app, BrowserWindow } = electron;
const path = require('path');

function createWindow() {
    const isDev = !app.isPackaged; // 'app' might be undefined if we aren't in electron
    console.log('App is:', app);

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0F0F0F',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../public/icon.png')
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
