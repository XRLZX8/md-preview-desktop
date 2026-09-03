const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store({
    defaults: {
        history: [],
        recentFiles: [],
        windowBounds: { width: 1200, height: 800 },
        theme: 'dark'
    }
});

let mainWindow;

function createWindow() {
    const bounds = store.get('windowBounds');
    
    mainWindow = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, '../assets/icon.png'),
        title: 'MD Preview'
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.on('resize', () => {
        store.set('windowBounds', mainWindow.getBounds());
    });

    mainWindow.on('close', () => {
        store.set('windowBounds', mainWindow.getBounds());
    });

    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open File',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => openFileDialog()
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow.webContents.send('save-file')
                },
                {
                    label: 'Save As',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => saveFileDialog()
                },
                { type: 'separator' },
                {
                    label: 'Recent Files',
                    submenu: getRecentFilesMenu()
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'About MD Preview',
                        message: 'MD Preview v0.1.0',
                        detail: 'A Markdown preview desktop app with history tracking.'
                    })
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function getRecentFilesMenu() {
    const history = store.get('history') || [];
    if (history.length === 0) {
        return [{ label: 'No Recent Files', enabled: false }];
    }
    return history.slice(0, 10).map(file => ({
        label: path.basename(file),
        click: () => loadFile(file)
    }));
}

function openFileDialog() {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            loadFile(result.filePaths[0]);
        }
    });
}

function saveFileDialog() {
    dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'Markdown', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    }).then(result => {
        if (!result.canceled) {
            mainWindow.webContents.send('save-file-as', result.filePath);
        }
    });
}

function loadFile(filePath) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        addToHistory(filePath);
        mainWindow.webContents.send('file-loaded', { filePath, content });
    }
}

function addToHistory(filePath) {
    let history = store.get('history') || [];
    history = history.filter(f => f !== filePath);
    history.unshift(filePath);
    if (history.length > 50) history = history.slice(0, 50);
    store.set('history', history);
}

// IPC Handlers
ipcMain.handle('open-file', openFileDialog);
ipcMain.handle('get-history', () => store.get('history') || []);
ipcMain.handle('get-theme', () => store.get('theme') || 'dark');
ipcMain.handle('set-theme', (event, theme) => store.set('theme', theme));

ipcMain.on('load-file', (event, filePath) => loadFile(filePath));

ipcMain.on('save-file-content', (event, { filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        event.reply('file-saved', { success: true, filePath });
    } catch (err) {
        event.reply('file-saved', { success: false, error: err.message });
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
