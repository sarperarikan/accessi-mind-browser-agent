// IPC Manager - handles all inter-process communication
const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { saveAISettings, getAISettings, resetAISettings } = require('./ai-config-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class IPCManager {
    constructor() {
        this.handlersSetup = false;
    }

    // Setup all IPC handlers
    setup(appManager) {
        if (this.handlersSetup) return;

        // AI Settings IPC Handlers
        this.setupAISettingsHandlers(appManager);
        
        // Browser IPC Handlers
        this.setupBrowserHandlers(appManager);
        
        // Application IPC Handlers
        this.setupAppHandlers(appManager);

        this.handlersSetup = true;
        console.log('IPC handlers setup completed');
    }

    // AI Settings related IPC handlers
    setupAISettingsHandlers(appManager) {
        // Request current AI settings
        ipcMain.handle('request-ai-settings', async () => {
            try {
                return getAISettings();
            } catch (error) {
                console.error('Error getting AI settings:', error);
                return { error: error.message };
            }
        });

        // Save AI settings
        ipcMain.handle('save-ai-settings', async (event, settings) => {
            try {
                const result = await saveAISettings(settings);
                
                // Notify main window
                const mainWindow = appManager.getMainWindow();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ai-settings-updated', result);
                }
                
                return result;
            } catch (error) {
                console.error('Error saving AI settings:', error);
                return { success: false, error: error.message };
            }
        });

        // Reset AI settings to defaults
        ipcMain.handle('reset-ai-settings', async () => {
            try {
                const result = await resetAISettings();

                // Notify main window
                const mainWindow = appManager.getMainWindow();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ai-settings-updated', result);
                }

                // Return updated settings as part of response
                const settings = getAISettings();
                return { ...result, settings };
            } catch (error) {
                console.error('Error resetting AI settings:', error);
                return { success: false, error: error.message };
            }
        });

        // Open AI settings window
        ipcMain.on('open-ai-settings', (event) => {
            appManager.createAISettingsWindow();
        });

        // Close AI settings window
        ipcMain.on('close-ai-settings', (event) => {
            appManager.closeAISettingsWindow();
        });
    }

    // Browser related IPC handlers
    setupBrowserHandlers(appManager) {
        // Summarize current page (production-ready)
        ipcMain.handle('summarize-current-page', async (event, payload) => {
            try {
                const settings = getAISettings();
                if (!settings.apiKey) {
                    return { success: false, error: 'API anahtarı gerekli' };
                }

                const client = new GoogleGenerativeAI(settings.apiKey);
                const model = client.getGenerativeModel({ model: settings.model || 'gemini-2.5-flash' });

                const summaryType = typeof payload === 'string' ? payload : (payload?.summaryType || payload?.type || 'brief');
                const content = typeof payload === 'object' ? (payload.content || '') : '';
                const url = typeof payload === 'object' ? (payload.url || '') : '';

                if (!content || content.trim().length === 0) {
                    return { success: false, error: 'Sayfa içeriği alınamadı' };
                }

                const prompt = buildSummaryPrompt(summaryType, content, url);
                const { text } = await generateContentWithResilience(settings, prompt);

                return { success: true, summary: text || 'Özet oluşturuldu' };
            } catch (error) {
                console.error('Summarize error:', error);
                const msg = isTransientAIError(error)
                    ? 'Özet oluşturulamadı: Servis geçici olarak yoğun, lütfen biraz bekleyip tekrar deneyin.'
                    : 'Özet oluşturulamadı: ' + error.message;
                return { success: false, error: msg };
            }
        });

        // Ask question about current page (production-ready)
        ipcMain.handle('ask-question-on-page', async (event, payload) => {
            try {
                const settings = getAISettings();
                if (!settings.apiKey) {
                    return { success: false, error: 'API anahtarı gerekli' };
                }

                const client = new GoogleGenerativeAI(settings.apiKey);
                const model = client.getGenerativeModel({ model: settings.model || 'gemini-2.5-flash' });

                const question = typeof payload === 'string' ? payload : (payload?.question || '');
                const content = typeof payload === 'object' ? (payload.content || '') : '';
                const url = typeof payload === 'object' ? (payload.url || '') : '';

                if (!question || !question.trim()) {
                    return { success: false, error: 'Soru metni gerekli' };
                }
                if (!content || !content.trim()) {
                    return { success: false, error: 'Sayfa içeriği alınamadı' };
                }

                const prompt = buildQuestionPrompt(question, content, url);
                const { text } = await generateContentWithResilience(settings, prompt);

                return { success: true, answer: text || 'Yanıt oluşturuldu' };
            } catch (error) {
                console.error('Ask error:', error);
                const msg = isTransientAIError(error)
                    ? 'Yanıt oluşturulamadı: Servis geçici olarak yoğun, lütfen biraz bekleyip tekrar deneyin.'
                    : 'Yanıt oluşturulamadı: ' + error.message;
                return { success: false, error: msg };
            }
        });

        // Analyze current page (production-ready)
        ipcMain.handle('analyze-page', async (event, payload) => {
            try {
                const settings = getAISettings();
                if (!settings.apiKey) {
                    return { success: false, error: 'API anahtarı gerekli' };
                }

                const client = new GoogleGenerativeAI(settings.apiKey);
                const model = client.getGenerativeModel({ model: settings.model || 'gemini-2.5-flash' });

                const analysisType = typeof payload === 'string' ? payload : (payload?.analysisType || 'general');
                const content = typeof payload === 'object' ? (payload.content || '') : '';
                const url = typeof payload === 'object' ? (payload.url || '') : '';

                if (!content || !content.trim()) {
                    return { success: false, error: 'Sayfa içeriği alınamadı' };
                }

                const prompt = buildAnalysisPrompt(analysisType, content, url);
                const { text } = await generateContentWithResilience(settings, prompt);

                return { success: true, analysis: text || 'Analiz oluşturuldu' };
            } catch (error) {
                console.error('Analyze error:', error);
                const msg = isTransientAIError(error)
                    ? 'Analiz oluşturulamadı: Servis geçici olarak yoğun, lütfen biraz bekleyip tekrar deneyin.'
                    : 'Analiz oluşturulamadı: ' + error.message;
                return { success: false, error: msg };
            }
        });

        // WCAG element-based analysis and improvement suggestions
        ipcMain.handle('analyze-wcag', async (event, payload) => {
            try {
                const settings = getAISettings();
                if (!settings.apiKey) {
                    return { success: false, error: 'API anahtarı gerekli' };
                }

                const client = new GoogleGenerativeAI(settings.apiKey);
                const model = client.getGenerativeModel({ model: settings.model || 'gemini-2.5-flash' });

                const url = typeof payload === 'object' ? (payload.url || '') : '';
                const html = typeof payload === 'object' ? String(payload.html || '').substring(0, 8000) : '';
                const text = typeof payload === 'object' ? String(payload.text || '').substring(0, 6000) : '';
                const snapshot = typeof payload === 'object' ? (payload.snapshot || {}) : {};
                const mode = typeof payload === 'object' ? (payload.mode || 'elements') : 'elements';

                if ((!html && !text) || (!url)) {
                    return { success: false, error: 'Analiz için sayfa verileri alınamadı' };
                }

                const prompt = buildWCAGPrompt({ url, html, text, snapshot, mode });
                const { text: aiText } = await generateContentWithResilience(settings, prompt);
                return { success: true, analysis: aiText || 'WCAG analizi oluşturuldu' };
            } catch (error) {
                console.error('WCAG analyze error:', error);
                const msg = isTransientAIError(error)
                    ? 'WCAG analizi oluşturulamadı: Servis geçici olarak yoğun, lütfen biraz bekleyip tekrar deneyin.'
                    : 'WCAG analizi oluşturulamadı: ' + error.message;
                return { success: false, error: msg };
            }
        });

        // Agentic browse step: plan next action based on current page context
        ipcMain.handle('agent-browse-step', async (event, context) => {
            try {
                const settings = getAISettings();
                if (!settings.apiKey) {
                    return { success: false, error: 'API anahtarı gerekli' };
                }

                const goal = (context && context.goal) ? String(context.goal) : '';
                const url = (context && context.url) ? String(context.url) : '';
                const text = (context && context.text) ? String(context.text).slice(0, 5000) : '';
                const links = Array.isArray(context?.links) ? context.links.slice(0, 30) : [];
                if (!goal) {
                    return { success: false, error: 'Hedef gerekli' };
                }

                const prompt = buildAgentStepPrompt({ goal, url, text, links });
                const { text: aiText } = await generateContentWithResilience(settings, prompt);

                const parsed = safeParseAgentJson(aiText);
                if (!parsed) {
                    return { success: false, error: 'Agent yanıtı çözümlenemedi' };
                }

                const action = String(parsed.action || '').toUpperCase();
                const params = parsed.params || {};
                const explanation = parsed.explanation || '';

                // Validate allowed actions
                const allowed = ['CLICK_LINK_BY_TEXT','SCROLL_DOWN','SCROLL_UP','TYPE_IN_INPUT_AND_SUBMIT','WAIT','DONE'];
                if (!allowed.includes(action)) {
                    return { success: false, error: 'Geçersiz eylem', raw: aiText };
                }

                return { success: true, action, params, explanation };
            } catch (error) {
                console.error('Agent browse step error:', error);
                const msg = isTransientAIError(error)
                    ? 'Agent adımı alınamadı: Servis geçici olarak yoğun, lütfen tekrar deneyin.'
                    : 'Agent adımı alınamadı: ' + error.message;
                return { success: false, error: msg };
            }
        });
    }

    // Application related IPC handlers
    setupAppHandlers(appManager) {
        // Send message to main window
        ipcMain.on('message-to-main', (event, message) => {
            const mainWindow = appManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('main-window-message', message);
            }
        });

        // Get application info
        ipcMain.handle('get-app-info', () => {
            return {
                version: require('../package.json').version,
                platform: process.platform,
                isDev: appManager.isDevMode()
            };
        });

        // Save webpage to disk (renderer provides content)
        ipcMain.handle('save-webpage', async (event, payload) => {
            try {
                const html = String(payload?.html || '');
                const text = String(payload?.text || '');
                const url = String(payload?.url || '');
                const title = String(payload?.title || 'Sayfa');
                if (!html && !text) {
                    return { success: false, error: 'Kaydedilecek içerik bulunamadı' };
                }

                const suggestedName = suggestFileName(title, url);
                const { canceled, filePath } = await dialog.showSaveDialog({
                    title: 'Sayfayı Kaydet',
                    defaultPath: suggestedName,
                    filters: [
                        { name: 'HTML', extensions: ['html'] },
                        { name: 'Metin', extensions: ['txt'] }
                    ]
                });

                if (canceled || !filePath) {
                    return { success: false, canceled: true };
                }

                const isTxt = filePath.toLowerCase().endsWith('.txt');
                const data = isTxt ? (text || stripHtmlToText(html)) : html;
                await fs.promises.writeFile(filePath, data, 'utf-8');
                return { success: true, path: filePath };
            } catch (error) {
                console.error('Save webpage error:', error);
                return { success: false, error: error.message };
            }
        });

        // Bookmarks: save current page
        ipcMain.handle('save-bookmark', async (event, payload) => {
            try {
                const url = String(payload?.url || '').trim();
                const title = String(payload?.title || '').trim() || url;
                if (!url) {
                    return { success: false, error: 'Geçerli bir URL gerekli' };
                }
                const bookmarks = loadBookmarks();
                const existingIdx = bookmarks.findIndex(b => b.url === url);
                const now = new Date().toISOString();
                if (existingIdx >= 0) {
                    bookmarks[existingIdx] = { ...bookmarks[existingIdx], title, updatedAt: now };
                } else {
                    bookmarks.push({ id: url, url, title, createdAt: now });
                }
                saveBookmarks(bookmarks);
                const mainWindow = appManager.getMainWindow();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('bookmarks-updated', { bookmarks });
                }
                return { success: true, bookmarks };
            } catch (error) {
                console.error('Save bookmark error:', error);
                return { success: false, error: error.message };
            }
        });

        // Bookmarks: list
        ipcMain.handle('get-bookmarks', async () => {
            try {
                const bookmarks = loadBookmarks();
                return { success: true, bookmarks };
            } catch (error) {
                console.error('Get bookmarks error:', error);
                return { success: false, error: error.message };
            }
        });

        // Bookmarks: remove
        ipcMain.handle('remove-bookmark', async (event, payload) => {
            try {
                const url = String(payload?.url || '').trim();
                if (!url) {
                    return { success: false, error: 'Silmek için URL gerekli' };
                }
                const bookmarks = loadBookmarks();
                const filtered = bookmarks.filter(b => b.url !== url);
                saveBookmarks(filtered);
                const mainWindow = appManager.getMainWindow();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('bookmarks-updated', { bookmarks: filtered });
                }
                return { success: true, bookmarks: filtered };
            } catch (error) {
                console.error('Remove bookmark error:', error);
                return { success: false, error: error.message };
            }
        });
    }
}

// Build prompt for agentic browsing step
function buildAgentStepPrompt({ goal, url, text, links }) {
    const linksStr = (Array.isArray(links) ? links : [])
        .map((l, i) => `- [${i+1}] ${sanitizeForPrompt(l.text)} => ${sanitizeForPrompt(l.href)}`)
        .slice(0, 30)
        .join('\n');
    const textExcerpt = (text || '').slice(0, 2000);
    return (
        `Sen bir erişilebilirlik odaklı web gezgini agentsin. Görev: "${sanitizeForPrompt(goal)}".
URL: ${sanitizeForPrompt(url)}
Metin Özeti (ilk ~2000 karakter):\n${sanitizeForPrompt(textExcerpt)}\n\nUygun Linkler (ilk 30):\n${linksStr || '- (link bulunamadı)'}\n\nSadece bir sonraki eylemi planla ve JSON olarak DÖN. KESİNLİKLE ek metin ekleme.
Kullanılabilir eylemler ve params:
- CLICK_LINK_BY_TEXT { "text": "..." }
- SCROLL_DOWN {}
- SCROLL_UP {}
- TYPE_IN_INPUT_AND_SUBMIT { "query": "alan adı/placeholder/etiket", "value": "..." }
- WAIT { "ms": 800 }
- DONE {}
Yanıt şeması:
{ "action": "...", "params": { ... }, "explanation": "(kısa neden ve beklenen sonuç)" }
Seçim kriteri: Hedefe ilerlemeyi en çok artıracak tek adımı seç.`
    );
}

function sanitizeForPrompt(s) {
    try { return String(s).replace(/[\n\r]+/g, ' ').slice(0, 500); } catch { return ''; }
}

function safeParseAgentJson(text) {
    if (!text) return null;
    let raw = String(text).trim();
    // Try to extract JSON block if the model wrapped it in code fences
    const fenceMatch = raw.match(/```json[\s\S]*?```/i) || raw.match(/```[\s\S]*?```/);
    if (fenceMatch) {
        raw = fenceMatch[0].replace(/```json|```/gi, '').trim();
    }
    try {
        const obj = JSON.parse(raw);
        return obj && typeof obj === 'object' ? obj : null;
    } catch {
        // Fallback: attempt to find action and params with regex
        try {
            const act = (raw.match(/"action"\s*:\s*"([^"]+)"/) || [])[1];
            const paramsStr = (raw.match(/"params"\s*:\s*(\{[\s\S]*?\})/) || [])[1] || '{}';
            const explanation = (raw.match(/"explanation"\s*:\s*"([\s\S]*?)"/) || [])[1] || '';
            const params = JSON.parse(paramsStr);
            if (act) return { action: act, params, explanation };
        } catch {}
        return null;
    }
}

function suggestFileName(title, url) {
    try {
        const u = new URL(url);
        const host = (u.hostname || 'site').replace(/^www\./, '');
        const base = (title || u.pathname || 'sayfa').trim().slice(0, 60)
            .replace(/[^a-zA-Z0-9-_ ]/g, '')
            .replace(/\s+/g, '-');
        const name = base || host || 'sayfa';
        return path.join(process.env.USERPROFILE || process.cwd(), `${name}.html`);
    } catch {
        const base = (title || 'sayfa').trim().slice(0, 60)
            .replace(/[^a-zA-Z0-9-_ ]/g, '')
            .replace(/\s+/g, '-') || 'sayfa';
        return path.join(process.env.USERPROFILE || process.cwd(), `${base}.html`);
    }
}

function stripHtmlToText(html) {
    try {
        let s = String(html);
        s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
        s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
        s = s.replace(/<[^>]+>/g, ' ');
        s = s.replace(/&nbsp;/g, ' ');
        s = s.replace(/&amp;/g, '&');
        s = s.replace(/&lt;/g, '<');
        s = s.replace(/&gt;/g, '>');
        return s.replace(/[ \t]+/g, ' ').replace(/[\n\r]+/g, '\n').trim();
    } catch {
        return '';
    }
}

function getBookmarksFilePath() {
    const base = process.env.USERPROFILE || process.cwd();
    return path.join(base, 'accessimind-bookmarks.json');
}

function loadBookmarks() {
    try {
        const file = getBookmarksFilePath();
        if (!fs.existsSync(file)) return [];
        const raw = fs.readFileSync(file, 'utf-8');
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function saveBookmarks(bookmarks) {
    try {
        const file = getBookmarksFilePath();
        fs.writeFileSync(file, JSON.stringify(bookmarks, null, 2), 'utf-8');
    } catch (e) {
        console.error('Bookmarks write error:', e);
        throw e;
    }
}

// Singleton instance
const ipcManager = new IPCManager();

// Export setup function
module.exports = {
    setupIPCHandlers: (appManager) => ipcManager.setup(appManager)
};

// Resilience helpers for Google Generative AI
function isTransientAIError(error) {
    const status = error?.status || error?.code;
    const msg = (error?.message || '').toLowerCase();
    return (
        status === 503 ||
        msg.includes('503') ||
        msg.includes('overloaded') ||
        msg.includes('service unavailable') ||
        msg.includes('temporarily') ||
        msg.includes('timeout') ||
        msg.includes('rate limit')
    );
}

function shouldSkipModel(error) {
    const status = error?.status || error?.code;
    const msg = (error?.message || '').toLowerCase();
    return (
        status === 403 ||
        msg.includes('permission') ||
        msg.includes('unregistered') ||
        msg.includes('not found') ||
        msg.includes("doesn't exist") ||
        msg.includes('invalid model')
    );
}

function buildModelList(preferred) {
    const fallbacks = ['gemini-2.5-flash', 'gemini-2.0-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    const list = [];
    const seen = new Set();
    if (preferred) {
        list.push(preferred);
        seen.add(preferred);
    }
    for (const m of fallbacks) {
        if (!seen.has(m)) list.push(m);
    }
    return list;
}

function getGenerationConfig(settings, tighten = false) {
    const cfg = {
        temperature: parseFloat(settings.temperature) || 0.7,
        maxOutputTokens: parseInt(settings.maxOutputTokens) || 2048,
        topP: parseFloat(settings.topP) || 0.8,
        topK: parseInt(settings.topK) || 40,
    };
    if (tighten) {
        cfg.maxOutputTokens = Math.max(256, Math.min(cfg.maxOutputTokens, 1024));
    }
    return cfg;
}

async function generateContentWithResilience(settings, prompt) {
    const apiKey = settings.apiKey;
    const models = buildModelList(settings.model || 'gemini-2.5-flash');
    const baseDelayMs = 800;
    const maxAttemptsPerModel = 3;

    for (let i = 0; i < models.length; i++) {
        const modelName = models[i];
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: modelName });

        for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                const text = result?.response?.text ? result.response.text() : '';
                return { text, modelUsed: modelName };
            } catch (error) {
                if (!isTransientAIError(error)) {
                    if (shouldSkipModel(error)) {
                        break; // move to next model
                    }
                    throw error; // Non-transient and not skippable: do not retry
                }
                // Transient error: exponential backoff with jitter
                const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
                await new Promise((res) => setTimeout(res, delay));
                // Continue retrying; if max attempts, move to next model
            }
        }
        // Move to next model if all attempts failed
    }

    throw new Error('Servis yoğun veya geçici hata. Otomatik tekrar denemeleri başarısız oldu. Lütfen biraz bekleyip tekrar deneyin.');
}

// Prompt builders
function buildSummaryPrompt(summaryType, content, url) {
    const header = url ? `URL: ${url}\n\n` : '';
    switch (summaryType) {
        case 'detailed':
            return `${header}Aşağıdaki web sayfası içeriğini detaylı şekilde özetle.\n\nİçerik (ilk 8000 karakter):\n${content.substring(0, 8000)}\n\nGereklilikler:\n- Bölümlere ayır\n- Önemli noktaları vurgula\n- Örnekler ve açıklamalar ekle`;
        case 'key-points':
            return `${header}Aşağıdaki içeriğin anahtar noktalarını madde madde çıkar.\n\nİçerik (ilk 8000 karakter):\n${content.substring(0, 8000)}\n\nGereklilikler:\n- Kısa ve net maddeler\n- En fazla 10 madde`;
        case 'brief':
        default:
            return `${header}Aşağıdaki web sayfasını kısa ve anlaşılır şekilde özetle.\n\nİçerik (ilk 8000 karakter):\n${content.substring(0, 8000)}\n\nGereklilikler:\n- 3-5 cümle\n- Türkçe, sade dil`;
    }
}

function buildQuestionPrompt(question, content, url) {
    const header = url ? `URL: ${url}\n\n` : '';
    return `${header}Aşağıdaki web sayfası içeriğine dayanarak soruyu yanıtla.\n\nSoru:\n${question}\n\nİçerik (ilk 8000 karakter):\n${content.substring(0, 8000)}\n\nGereklilikler:\n- Net ve doğru cevap\n- İçerikten kanıt veya alıntı kullan`;
}

function buildAnalysisPrompt(analysisType, content, url) {
    const header = url ? `URL: ${url}\n\n` : '';
    switch (analysisType) {
        case 'sentiment':
            return `${header}Aşağıdaki içeriğin duygu analizini yap (pozitif/negatif/nötr).\n\nİçerik (ilk 8000 karakter):\n${content.substring(0, 8000)}\n\nGereklilikler:\n- Duygu sınıflandırması\n- Kısa açıklama`;
        case 'keypoints':
            return `${header}Aşağıdaki içeriğin anahtar noktalarını çıkar.\n\nİçerik (ilk 8000 karakter):\n${content.substring(0, 8000)}\n\nGereklilikler:\n- Madde madde, kısa ve öz`;
        case 'structure':
            return `${header}Aşağıdaki içeriğin yapısını analiz et (başlıklar, bölümler, akış).\n\nİçerik (ilk 8000 karakter):\n${content.substring(0, 8000)}\n\nGereklilikler:\n- Yapısal özet\n- Mantıksal akış değerlendirmesi`;
        case 'general':
        default:
            return `${header}Aşağıdaki web sayfası içeriği için genel bir analiz yap.\n\nİçerik (ilk 8000 karakter):\n${content.substring(0, 8000)}\n\nGereklilikler:\n- Konu, amaç, önemli noktalar`;
    }
}

// Build WCAG prompt (element-based analysis and improvement suggestions)
function buildWCAGPrompt({ url, html, text, snapshot, mode }) {
    const header = `URL: ${sanitizeForPrompt(url)}\nWCAG Hedef Seviyesi: AA\n\n`;
    const modeDesc = mode === 'improvements'
        ? 'Eleman bazlı sorunlar için uygulanabilir iyileştirme önerileri üret.'
        : 'Eleman bazlı WCAG 2.1 denetimi yap ve sorunları tespit et.';
    const htmlPart = html ? `HTML (ilk 8000):\n${html}\n\n` : '';
    const textPart = text ? `Metin (ilk 6000):\n${text}\n\n` : '';
    let snapshotStr = '';
    try { snapshotStr = JSON.stringify(snapshot).substring(0, 8000); } catch { snapshotStr = ''; }
    const snapshotPart = snapshotStr ? `Erişilebilirlik Snapshot (özet):\n${snapshotStr}\n\n` : '';

    return (
        `${header}` +
        `Görev: ${modeDesc}\n` +
        `Bağlam: Bu bir erişilebilirlik odaklı tarayıcıdır. Sonuçları TÜRKÇE ver.\n\n` +
        `${htmlPart}${textPart}${snapshotPart}` +
        `İstenen Çıktı Formatı:\n` +
        `- Başlık: "WCAG Element Analizi" veya "WCAG İyileştirme Önerileri"\n` +
        `- Madde madde sorun/öneri listesi\n` +
        `- Her madde için: Eleman(etiket/rol/id veya metin), İlgili WCAG kriteri (ör. 1.1.1, 2.4.4), Etki (Yüksek/Orta/Düşük), Açıklama, Öneri\n` +
        `- Kısa özet ve öncelikli yapılacaklar\n` +
        `Sınırlamalar: Renk kontrastı için net değer yoksa tahmin verme; metin ve snapshot üzerinden değerlendir.`
    );
}