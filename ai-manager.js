// ai-manager.js - Production Ready AccessiMind AI Manager
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIManager {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;
        this.apiKey = '';
        this.modelName = 'gemini-2.5-flash';
        this.settings = {
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40
        };
        this.history = [];
    }

    // API anahtarını ayarla ve AI'yı başlat
    async setApiKey(apiKey) {
        if (!apiKey) {
            this.isInitialized = false;
            return false;
        }

        try {
            this.apiKey = apiKey;
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: this.modelName,
                generationConfig: this.settings
            });
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('AI initialization error:', error);
            this.isInitialized = false;
            throw new Error('API anahtarı geçersiz veya bağlantı hatası: ' + error.message);
        }
    }

    // Model ayarlarını güncelle
    async updateModelSettings(modelName, settings = {}) {
        if (!this.isInitialized) {
            throw new Error('Önce API anahtarı ayarlayın');
        }

        try {
            this.modelName = modelName;
            this.settings = { ...this.settings, ...settings };
            
            // Yeni ayarlarla modeli yeniden oluştur
            this.model = this.genAI.getGenerativeModel({
                model: this.modelName,
                generationConfig: this.settings
            });
            
            return true;
        } catch (error) {
            throw new Error('Model ayarları güncellenemedi: ' + error.message);
        }
    }

    // Sayfa özetleme - Production Ready
    async summarizePage(content, url) {
        if (!this.isInitialized) {
            throw new Error('API anahtarı gereklidir');
        }

        if (!content || content.trim().length === 0) {
            throw new Error('Sayfa içeriği boş');
        }

        const prompt = `
        Aşağıdaki web sayfası içeriğini özetleyin. Lütfen şu formatı takip edin:
        
        📍 SAYFA: ${url}
        
        📊 ÖZET:
        • Ana konu ve amaç
        • Önemli başlıklar (3-5 madde)
        • Kritik bilgiler
        • Sonuç/öneriler
        
        İçerik (ilk 8000 karakter):
        ${content.substring(0, 8000)}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Geçmişi güncelle
            this.history.push({
                type: 'summarize',
                url: url,
                timestamp: new Date().toISOString(),
                inputLength: content.length,
                output: text
            });
            
            return text;
        } catch (error) {
            console.error('Summarization error:', error);
            throw new Error('Özet oluşturulamadı: ' + error.message);
        }
    }

    // Soru sorma - Production Ready
    async askQuestion(content, question, url) {
        if (!this.isInitialized) {
            throw new Error('API anahtarı gereklidir');
        }

        if (!question || question.trim().length === 0) {
            throw new Error('Soru boş olamaz');
        }

        const prompt = `
        Aşağıdaki web sayfası içeriğine dayanarak soruyu yanıtlayın:
        
        URL: ${url}
        Soru: ${question}
        
        İçerik (ilk 8000 karakter):
        ${content.substring(0, 8000)}
        
        Lütfen:
        1. Sadece sayfa içeriğine dayalı yanıt verin
        2. Sayfada bilgi yoksa "Bu sayfada bu bilgi bulunmuyor" deyin
        3. Yanıtınızı net ve anlaşılır şekilde yapın
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Geçmişi güncelle
            this.history.push({
                type: 'ask',
                url: url,
                question: question,
                timestamp: new Date().toISOString(),
                inputLength: content.length,
                output: text
            });
            
            return text;
        } catch (error) {
            console.error('Question answering error:', error);
            throw new Error('Soru yanıtlanamadı: ' + error.message);
        }
    }

    // Sayfada işlem yapma - Production Ready
    async executeAction(content, action, url) {
        if (!this.isInitialized) {
            throw new Error('API anahtarı gereklidir');
        }

        if (!action || action.trim().length === 0) {
            throw new Error('İşlem tanımı boş olamaz');
        }

        const prompt = `
        Aşağıdaki web sayfası içeriği üzerinde belirtilen işlemi gerçekleştirin:
        
        URL: ${url}
        İstenen İşlem: ${action}
        
        İçerik (ilk 8000 karakter):
        ${content.substring(0, 8000)}
        
        Lütfen:
        1. İşlemi adım adım açıklamadan doğrudan sonucu verin
        2. Sayfada işlem yapılamıyorsa "Bu işlem sayfa içeriğiyle yapılamaz" deyin
        3. Sonucu net ve uygulanabilir şekilde sunun
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Geçmişi güncelle
            this.history.push({
                type: 'action',
                url: url,
                action: action,
                timestamp: new Date().toISOString(),
                inputLength: content.length,
                output: text
            });
            
            return text;
        } catch (error) {
            console.error('Action execution error:', error);
            throw new Error('İşlem gerçekleştirilemedi: ' + error.message);
        }
    }

    // İçerik analizi - Production Ready
    async analyzeContent(content, analysisType = 'general', url) {
        if (!this.isInitialized) {
            throw new Error('API anahtarı gereklidir');
        }

        const analysisPrompts = {
            general: `Bu içeriği genel olarak analiz edin ve ana noktaları özetleyin: ${content.substring(0, 5000)}`,
            sentiment: `Bu içeriğin duygu analizini yapın (pozitif/nötr/negatif): ${content.substring(0, 5000)}`,
            keypoints: `Bu içerikteki anahtar noktaları madde madde listeleyin: ${content.substring(0, 5000)}`,
            structure: `Bu içeriğin yapısal analizini yapın (başlıklar, paragraflar, vs.): ${content.substring(0, 5000)}`
        };

        const prompt = analysisPrompts[analysisType] || analysisPrompts.general;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Geçmişi güncelle
            this.history.push({
                type: 'analyze',
                url: url,
                analysisType: analysisType,
                timestamp: new Date().toISOString(),
                inputLength: content.length,
                output: text
            });
            
            return text;
        } catch (error) {
            console.error('Content analysis error:', error);
            throw new Error('İçerik analizi yapılamadı: ' + error.message);
        }
    }

    // Geçmiş işlemleri al
    getHistory() {
        return this.history.slice(-20); // Son 20 işlem
    }

    // Geçmişi temizle
    clearHistory() {
        this.history = [];
    }

    // Durum kontrolü
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            modelName: this.modelName,
            hasApiKey: !!this.apiKey,
            historyCount: this.history.length
        };
    }

    // Mevcut modeller
    getAvailableModels() {
        return [
            { name: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash', description: 'Önerilen, hızlı ve verimli' },
            { name: 'Gemini 2.0 Pro', value: 'gemini-2.0-pro', description: 'Gelişmiş yetenekler' },
            { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', description: 'Dengeli performans' },
            { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', description: 'En gelişmiş model' }
        ];
    }
}

// Global instance
window.aiManager = new AIManager();