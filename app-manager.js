// Main application manager - handles window creation and lifetime management
const { app, BrowserWindow } = require('electron');
const { setupIPCHandlers } = require('./ipc-manager');
const { setupMenu } = require('./menu-manager');
const { setupAISettings } = require('./ai-settings-manager');

class AppManager {
    constructor() {
        this.mainWindow = null;
        this.aiSettingsWindow = null;
        this.helpWindow = null;
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    // Initialize the application
    async initialize() {
        try {
            // Wait for Electron to be ready
            await app.whenReady();
            
            // Create main window
            this.createMainWindow();
            
            // Setup IPC handlers
            setupIPCHandlers(this);
            
            // Setup application menu
            setupMenu(this);
            
            // Setup AI settings system
            setupAISettings(this);
            
            // Handle app activation (macOS)
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createMainWindow();
                }
            });

            // Handle app quitting
            app.on('window-all-closed', () => {
                if (process.platform !== 'darwin') {
                    app.quit();
                }
            });

            console.log('AccessiMind Browser initialized successfully');
            
        } catch (error) {
            console.error('Application initialization failed:', error);
            process.exit(1);
        }
    }

    // Create main browser window
    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            autoHideMenuBar: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                allowRunningInsecureContent: false,
                // Enable <webview> tag for in-app browser content
                webviewTag: true,
                preload: require('path').join(__dirname, '../preload.js')
            },
            title: 'AccessiMind Browser',
            icon: require('path').join(__dirname, '../assets/icon.png'),
            show: false // Show when ready
        });

        this.mainWindow.loadFile('src/index.html');

        // Show window when ready to prevent visual flash
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            if (this.isDevelopment) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        return this.mainWindow;
    }

    // Get main window instance
    getMainWindow() {
        return this.mainWindow;
    }

    // Get AI settings window instance
    getAISettingsWindow() {
        return this.aiSettingsWindow;
    }

    // Set AI settings window
    setAISettingsWindow(window) {
        this.aiSettingsWindow = window;
    }

    // Create Help (User Guide) window
    createHelpWindow() {
        if (this.helpWindow && !this.helpWindow.isDestroyed()) {
            this.helpWindow.focus();
            return this.helpWindow;
        }

        this.helpWindow = new BrowserWindow({
            width: 900,
            height: 900,
            parent: this.getMainWindow(),
            modal: true,
            resizable: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                preload: require('path').join(__dirname, '../preload.js')
            },
            title: 'AccessiMind Kullanıcı Kılavuzu',
            icon: require('path').join(__dirname, '../assets/icon.png'),
            show: false
        });

        this.helpWindow.loadFile('src/help.html');

        this.helpWindow.once('ready-to-show', () => {
            this.helpWindow.show();
        });

        this.helpWindow.on('closed', () => {
            this.helpWindow = null;
        });

        return this.helpWindow;
    }

    // Create AI settings window
    createAISettingsWindow() {
        const { createAISettingsWindow } = require('./ai-settings-manager');
        const window = createAISettingsWindow();
        this.setAISettingsWindow(window);
        return window;
    }

    // Close AI settings window
    closeAISettingsWindow() {
        const { closeAISettingsWindow } = require('./ai-settings-manager');
        closeAISettingsWindow();
    }

    // Check if app is in development mode
    isDevMode() {
        return this.isDevelopment;
    }
}

module.exports = AppManager;