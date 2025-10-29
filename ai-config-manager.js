// AI Config Manager - handles AI configuration file operations
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class AIConfigManager {
    constructor() {
        // Ayarların uygulamanın çalıştırıldığı klasöre kaydedilmesi için temel dizini belirle
        // Paketli uygulamada: exe dizini; geliştirmede: proje kökü
        const isPackaged = app && app.isPackaged;
        this.baseDir = isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..');

        this.configPath = path.join(this.baseDir, 'ai-config.json');
        this.secureConfigPath = path.join(this.baseDir, '.ai-secure-config.json');
    }

    // Get AI settings with secure API key handling
    getAISettings() {
        try {
            let settings = this.getDefaultSettings();
            
            // Load general settings
            if (fs.existsSync(this.configPath)) {
                try {
                    const data = fs.readFileSync(this.configPath, 'utf8');
                    const config = JSON.parse(data);
                    settings = { ...settings, ...config };
                } catch (e) {
                    console.warn('Config dosyası bozuk, varsayılan ayarlar kullanılıyor');
                }
            }
            
            // Load secure API key
            if (fs.existsSync(this.secureConfigPath)) {
                try {
                    const secureData = fs.readFileSync(this.secureConfigPath, 'utf8');
                    const secureConfig = JSON.parse(secureData);
                    if (secureConfig.apiKey && this.isValidAPIKey(secureConfig.apiKey)) {
                        settings.apiKey = secureConfig.apiKey;
                    }
                } catch (e) {
                    console.warn('Güvenli config dosyası bozuk');
                }
            }
            
            return settings;
        } catch (error) {
            console.error('Ayarları yükleme hatası:', error);
            return this.getDefaultSettings();
        }
    }

    // Save AI settings with validation
    async saveAISettings(settings) {
        try {
            // Validate settings
            this.validateSettings(settings);
            
            // Prepare settings for storage
            const maskedSettings = this.prepareMaskedSettings(settings);
            const secureSettings = this.prepareSecureSettings(settings);
            
            // Save configuration files
            this.saveConfigFile(this.configPath, maskedSettings);
            this.saveConfigFile(this.secureConfigPath, secureSettings);
            
            console.log('AI ayarları başarıyla kaydedildi');
            
            return { 
                success: true, 
                message: 'AI ayarları başarıyla kaydedildi',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Ayarları kaydetme hatası:', error);
            throw error;
        }
    }

    // Validate AI settings
    validateSettings(settings) {
        if (!settings) {
            throw new Error('Ayarlar boş olamaz');
        }
        
        if (!settings.apiKey || settings.apiKey.trim() === '') {
            throw new Error('API anahtarı gereklidir');
        }
        
        if (!this.isValidAPIKey(settings.apiKey)) {
            throw new Error('Geçerli bir Google AI API anahtarı girin (AIza... formatında)');
        }
        
        // Validate numeric settings
        const numericSettings = {
            temperature: { min: 0, max: 1, defaultValue: 0.7 },
            maxOutputTokens: { min: 100, max: 8192, defaultValue: 2048 },
            topP: { min: 0, max: 1, defaultValue: 0.8 },
            topK: { min: 1, max: 100, defaultValue: 40 }
        };
        
        for (const [key, config] of Object.entries(numericSettings)) {
            if (settings[key] !== undefined) {
                const value = parseFloat(settings[key]);
                if (isNaN(value) || value < config.min || value > config.max) {
                    settings[key] = config.defaultValue;
                }
            }
        }
    }

    // Check if API key is valid
    isValidAPIKey(apiKey) {
        return apiKey && apiKey.startsWith('AIza') && apiKey.length > 20;
    }

    // Prepare masked settings for public config file
    prepareMaskedSettings(settings) {
        return {
            model: settings.model || 'gemini-2.5-flash',
            temperature: parseFloat(settings.temperature) || 0.7,
            maxOutputTokens: parseInt(settings.maxOutputTokens) || 2048,
            topP: parseFloat(settings.topP) || 0.8,
            topK: parseInt(settings.topK) || 40,
            lastUpdated: new Date().toISOString()
        };
    }

    // Prepare secure settings for private config file
    prepareSecureSettings(settings) {
        return {
            apiKey: settings.apiKey,
            lastUpdated: new Date().toISOString()
        };
    }

    // Save config file with error handling
    saveConfigFile(filePath, data) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            throw new Error(`Config dosyası kaydedilemedi: ${error.message}`);
        }
    }

    // Get default AI settings
    getDefaultSettings() {
        return {
            apiKey: '',
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40
        };
    }

    // Backup current configuration
    backupConfig() {
        try {
            const backupPath = path.join(this.baseDir, 'ai-config-backup.json');
            const currentConfig = this.getAISettings();
            this.saveConfigFile(backupPath, currentConfig);
            return backupPath;
        } catch (error) {
            console.error('Backup oluşturulamadı:', error);
            return null;
        }
    }

    // Restore configuration from backup
    restoreConfig(backupPath) {
        try {
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup dosyası bulunamadı');
            }
            
            const backupData = fs.readFileSync(backupPath, 'utf8');
            const settings = JSON.parse(backupData);
            return this.saveAISettings(settings);
        } catch (error) {
            throw new Error(`Backup geri yüklenemedi: ${error.message}`);
        }
    }

    // Reset AI settings to factory defaults
    async resetAISettings() {
        try {
            const defaults = this.getDefaultSettings();
            // Persist defaults to both config files
            const maskedDefaults = this.prepareMaskedSettings(defaults);
            const secureDefaults = this.prepareSecureSettings(defaults);

            this.saveConfigFile(this.configPath, maskedDefaults);
            this.saveConfigFile(this.secureConfigPath, secureDefaults);

            return {
                success: true,
                message: 'AI ayarları varsayılana sıfırlandı',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Ayarları sıfırlama hatası:', error);
            throw error;
        }
    }
}

// Singleton instance
const configManager = new AIConfigManager();

// Export public methods
module.exports = {
    getAISettings: () => configManager.getAISettings(),
    saveAISettings: (settings) => configManager.saveAISettings(settings),
    backupConfig: () => configManager.backupConfig(),
    restoreConfig: (backupPath) => configManager.restoreConfig(backupPath),
    resetAISettings: () => configManager.resetAISettings()
};