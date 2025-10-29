// Menu Manager - handles application menu creation
const { Menu, dialog } = require('electron');
const { getAISettings } = require('./ai-config-manager');

class MenuManager {
    constructor() {
        this.menuTemplate = null;
    }

    // Setup application menu
    setup(appManager) {
        this.menuTemplate = this.createMenuTemplate(appManager);
        const menu = Menu.buildFromTemplate(this.menuTemplate);
        Menu.setApplicationMenu(menu);
        
        console.log('Application menu setup completed');
    }

    // Create menu template
    createMenuTemplate(appManager) {
        return [
            {
                label: '&Dosya',
                submenu: [
                    {
                        label: 'Yeni Pencere',
                        accelerator: 'Ctrl+N',
                        click: () => {
                            appManager.createMainWindow();
                        }
                    },
                    {
                        label: 'Pencereyi Kapat',
                        accelerator: 'Ctrl+W',
                        click: () => {
                            const window = appManager.getMainWindow();
                            if (window) {
                                window.close();
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Sayfayı Kaydet',
                        accelerator: 'Ctrl+S',
                        click: () => {
                            const mainWindow = appManager.getMainWindow();
                            if (mainWindow) {
                                mainWindow.webContents.send('execute-file-action', { type: 'save' });
                            }
                        }
                    },
                    {
                        label: 'Farklı Kaydet...',
                        accelerator: 'Ctrl+Alt+S',
                        click: () => {
                            const mainWindow = appManager.getMainWindow();
                            if (mainWindow) {
                                mainWindow.webContents.send('execute-file-action', { type: 'save-as' });
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Çıkış',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: '&Düzenle',
                submenu: [
                    { role: 'undo', label: 'Geri Al' },
                    { role: 'redo', label: 'İleri Al' },
                    { type: 'separator' },
                    { role: 'cut', label: 'Kes' },
                    { role: 'copy', label: 'Kopyala' },
                    { role: 'paste', label: 'Yapıştır' },
                    { role: 'selectall', label: 'Tümünü Seç' }
                ]
            },
            {
                label: '&Görünüm',
                submenu: [
                    { role: 'reload', label: 'Yenile' },
                    { role: 'forcereload', label: 'Zorla Yenile' },
                    { role: 'toggledevtools', label: 'Geliştirici Araçları' },
                    { type: 'separator' },
                    { role: 'resetzoom', label: 'Yakınlaştırmayı Sıfırla' },
                    { role: 'zoomin', label: 'Yakınlaştır' },
                    { role: 'zoomout', label: 'Uzaklaştır' },
                    { type: 'separator' },
                    { role: 'togglefullscreen', label: 'Tam Ekran' }
                ]
            },
            {
                label: '&Yerimleri',
                submenu: [
                    {
                        label: 'Yerimi Ekle',
                        accelerator: 'Ctrl+D',
                        click: () => {
                            const mainWindow = appManager.getMainWindow();
                            if (mainWindow) {
                                mainWindow.webContents.send('execute-bookmark-action', { type: 'add' });
                            }
                        }
                    },
                    {
                        label: 'Yerimi Yöneticisi',
                        accelerator: 'Ctrl+Shift+D',
                        click: () => {
                            const mainWindow = appManager.getMainWindow();
                            if (mainWindow) {
                                mainWindow.webContents.send('execute-bookmark-action', { type: 'open-manager' });
                            }
                        }
                    }
                ]
            },
            {
                label: '🤖 &AI',
                submenu: this.createAIMenu(appManager)
            },
            {
                label: '&Erişilebilirlik',
                submenu: this.createAccessibilityMenu(appManager)
            },
            {
                label: '&Yardım',
                submenu: this.createHelpMenu(appManager)
            }
        ];
    }

    // Create AI menu section
    createAIMenu(appManager) {
        return [
            {
                label: 'AI Ayarları',
                accelerator: 'Ctrl+Shift+A',
                click: () => {
                    appManager.createAISettingsWindow();
                }
            },
            {
                label: 'Sayfayı Özetle',
                accelerator: 'Ctrl+Shift+S',
                click: () => {
                    const mainWindow = appManager.getMainWindow();
                    if (mainWindow) {
                        mainWindow.webContents.send('execute-ai-action', { type: 'summarize' });
                    }
                }
            },
            {
                label: 'Soru Sor',
                accelerator: 'Ctrl+Shift+Q',
                click: () => {
                    const mainWindow = appManager.getMainWindow();
                    if (mainWindow) {
                        mainWindow.webContents.send('execute-ai-action', { type: 'ask' });
                    }
                }
            },
            {
                label: 'Dolaşım',
                accelerator: 'Ctrl+Shift+B',
                click: () => {
                    const mainWindow = appManager.getMainWindow();
                    if (mainWindow) {
                        mainWindow.webContents.send('execute-ai-action', { type: 'agent' });
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'AI Durumu',
                click: () => {
                    this.showAIStatus();
                }
            }
        ];
    }

    // Create accessibility menu section
    createAccessibilityMenu(appManager) {
        return [
            {
                label: 'Yüksek Karşıtlık',
                type: 'checkbox',
                click: (menuItem) => {
                    const mainWindow = appManager.getMainWindow();
                    if (mainWindow) {
                        mainWindow.webContents.send('toggle-accessibility', { 
                            feature: 'high-contrast', 
                            enabled: menuItem.checked 
                        });
                    }
                }
            },
            {
                label: 'Büyük Yazı Tipi',
                type: 'checkbox',
                click: (menuItem) => {
                    const mainWindow = appManager.getMainWindow();
                    if (mainWindow) {
                        mainWindow.webContents.send('toggle-accessibility', { 
                            feature: 'large-font', 
                            enabled: menuItem.checked 
                        });
                    }
                }
            },
            {
                label: 'Ekran Okuyucu Desteği',
                type: 'checkbox',
                checked: true,
                click: (menuItem) => {
                    const mainWindow = appManager.getMainWindow();
                    if (mainWindow) {
                        mainWindow.webContents.send('toggle-accessibility', { 
                            feature: 'screen-reader', 
                            enabled: menuItem.checked 
                        });
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'WCAG Element Analizi',
                accelerator: 'Ctrl+Alt+W',
                click: () => {
                    const mainWindow = appManager.getMainWindow();
                    if (mainWindow) {
                        mainWindow.webContents.send('execute-accessibility-action', { 
                            type: 'wcag-elements' 
                        });
                    }
                }
            },
            {
                label: 'WCAG İyileştirme Önerileri',
                accelerator: 'Ctrl+Alt+Shift+W',
                click: () => {
                    const mainWindow = appManager.getMainWindow();
                    if (mainWindow) {
                        mainWindow.webContents.send('execute-accessibility-action', { 
                            type: 'wcag-improvements' 
                        });
                    }
                }
            }
        ];
    }

    // Create help menu section
    createHelpMenu(appManager) {
        return [
            {
                label: 'Kullanıcı Kılavuzu',
                click: () => {
                    if (appManager) {
                        appManager.createHelpWindow();
                    }
                }
            },
            {
                label: 'Hakkında',
                click: () => {
                    const pkg = require('../package.json');
                    dialog.showMessageBox({
                        type: 'info',
                        title: 'AccessiMind Browser Hakkında',
                        message: 'AccessiMind Browser',
                        detail: `AI destekli, tam erişilebilir web tarayıcısı\nVersiyon: ${pkg.version}\nHazırlayan: Sarper Arıkan\nE-posta: sarperarikan@gmail.com\nWeb: https://sarperarikan.net`
                    });
                }
            },
            {
                label: 'Kısayollar',
                click: () => {
                    this.showKeyboardShortcuts();
                }
            },
            {
                label: 'AI API Dokümantasyonu',
                click: () => {
                    require('electron').shell.openExternal('https://ai.google.dev/');
                }
            }
        ];
    }

    // Show AI status dialog
    showAIStatus() {
        const settings = getAISettings();
        const status = settings.apiKey ? 'Bağlı' : 'Bağlantı yok';
        
        dialog.showMessageBox({
            type: 'info',
            title: 'AI Durumu',
            message: `AI Bağlantı Durumu: ${status}`,
            detail: settings.apiKey ? 
                `Model: ${settings.model}\nAPI: Aktif` : 
                'AI ayarlarını yapılandırmak için AI Ayarları menüsünü kullanın.'
        });
    }

    // Show keyboard shortcuts
    showKeyboardShortcuts() {
        const shortcuts = [
            'Ctrl+Shift+A: AI Ayarları',
            'Ctrl+Shift+S: Sayfayı Özetle',
            'Ctrl+Shift+Q: Soru Sor',
            'Ctrl+R: Sayfayı Yenile',
            'Ctrl+N: Yeni Pencere',
            'Ctrl+W: Pencereyi Kapat'
        ].join('\n');
        
        dialog.showMessageBox({
            type: 'info',
            title: 'Klavye Kısayolları',
            message: 'AccessiMind Browser Kısayolları',
            detail: shortcuts
        });
    }

    // Update menu items dynamically
    updateMenuItem(label, options) {
        if (!this.menuTemplate) return;
        
        // Find and update menu item
        // This is a simplified implementation
        console.log('Menu item update requested:', label, options);
    }
}

// Singleton instance
const menuManager = new MenuManager();

// Export setup function
module.exports = {
    setupMenu: (appManager) => menuManager.setup(appManager)
};