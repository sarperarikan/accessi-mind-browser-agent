// AI Settings Manager - handles AI settings window management
const { BrowserWindow } = require('electron');
const path = require('path');
const { getAISettings } = require('./ai-config-manager');

class AISettingsManager {
    constructor() {
        this.aiSettingsWindow = null;
    }

    // Setup AI settings system
    setup(appManager) {
        this.appManager = appManager;
        console.log('AI settings manager setup completed');
    }

    // Create AI settings window
    createAISettingsWindow() {
        // Check if window already exists
        if (this.aiSettingsWindow && !this.aiSettingsWindow.isDestroyed()) {
            this.aiSettingsWindow.focus();
            return this.aiSettingsWindow;
        }

        // Create new AI settings window
        this.aiSettingsWindow = new BrowserWindow({
            width: 600,
            height: 700,
            parent: this.appManager.getMainWindow(),
            modal: true,
            resizable: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                preload: path.join(__dirname, '../preload.js')
            },
            title: 'AccessiMind AI Ayarları',
            icon: path.join(__dirname, '../assets/icon.png'),
            show: false // Show when ready
        });

        this.aiSettingsWindow.loadFile('src/ai-settings.html');
        
        // Setup window event handlers
        this.setupWindowHandlers();
        
        // Show window when ready
        this.aiSettingsWindow.once('ready-to-show', () => {
            this.aiSettingsWindow.show();
            
            // Send current settings to the window
            this.sendCurrentSettings();
        });

        return this.aiSettingsWindow;
    }

    // Setup window event handlers
    setupWindowHandlers() {
        if (!this.aiSettingsWindow) return;

        // ESC key to close window
        this.aiSettingsWindow.webContents.on('before-input-event', (event, input) => {
            if (input.key === 'Escape') {
                this.closeAISettingsWindow();
                event.preventDefault();
            }
        });

        // Window closed event
        this.aiSettingsWindow.on('closed', () => {
            this.aiSettingsWindow = null;
            this.appManager.setAISettingsWindow(null);
        });

        // Handle messages from AI settings window
        this.aiSettingsWindow.webContents.on('ipc-message', (event, channel, data) => {
            this.handleIPCMessage(channel, data);
        });
    }

    // Close AI settings window
    closeAISettingsWindow() {
        if (this.aiSettingsWindow && !this.aiSettingsWindow.isDestroyed()) {
            this.aiSettingsWindow.close();
            this.aiSettingsWindow = null;
            this.appManager.setAISettingsWindow(null);
            
            // Focus main window
            const mainWindow = this.appManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.focus();
            }
        }
    }

    // Send current settings to AI settings window
    sendCurrentSettings() {
        if (this.aiSettingsWindow && !this.aiSettingsWindow.isDestroyed()) {
            const settings = getAISettings();
            this.aiSettingsWindow.webContents.send('current-ai-settings', settings);
        }
    }

    // Handle IPC messages from AI settings window
    handleIPCMessage(channel, data) {
        switch (channel) {
            case 'ai-settings-saved':
                this.handleSettingsSaved(data);
                break;
            case 'ai-settings-validation':
                this.handleSettingsValidation(data);
                break;
            case 'ai-settings-close':
                this.closeAISettingsWindow();
                break;
            case 'close-ai-settings':
                // Renderer may send this generic close message via preload bridge
                this.closeAISettingsWindow();
                break;
            default:
                console.log('Unhandled IPC message:', channel, data);
        }
    }

    // Handle settings saved event
    handleSettingsSaved(data) {
        console.log('AI settings saved:', data);
        
        // Notify main window
        const mainWindow = this.appManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-settings-updated', data);
        }
        
        // Close settings window after successful save
        if (data.success) {
            setTimeout(() => {
                this.closeAISettingsWindow();
            }, 1000);
        }
    }

    // Handle settings validation
    handleSettingsValidation(data) {
        // Could implement real-time validation feedback
        console.log('Settings validation:', data);
    }

    // Get AI settings window instance
    getAISettingsWindow() {
        return this.aiSettingsWindow;
    }

    // Check if AI settings window is open
    isAISettingsWindowOpen() {
        return this.aiSettingsWindow && !this.aiSettingsWindow.isDestroyed();
    }

    // Update AI settings window title
    updateWindowTitle(title) {
        if (this.aiSettingsWindow && !this.aiSettingsWindow.isDestroyed()) {
            this.aiSettingsWindow.setTitle(title);
        }
    }

    // Show settings validation dialog
    showValidationDialog(message, type = 'error') {
        if (this.aiSettingsWindow && !this.aiSettingsWindow.isDestroyed()) {
            this.aiSettingsWindow.webContents.send('show-validation-dialog', {
                message,
                type
            });
        }
    }
}

// Singleton instance
const aiSettingsManager = new AISettingsManager();

// Export setup function and public methods
module.exports = {
    setupAISettings: (appManager) => aiSettingsManager.setup(appManager),
    createAISettingsWindow: () => aiSettingsManager.createAISettingsWindow(),
    closeAISettingsWindow: () => aiSettingsManager.closeAISettingsWindow(),
    getAISettingsWindow: () => aiSettingsManager.getAISettingsWindow(),
    isAISettingsWindowOpen: () => aiSettingsManager.isAISettingsWindowOpen()
};

// Also export the manager instance for advanced usage
module.exports.AISettingsManager = AISettingsManager;