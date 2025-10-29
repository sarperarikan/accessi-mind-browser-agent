// Browser Manager - handles browser functionality (Modüler Versiyon)
class BrowserManager {
    constructor() {
        this.currentUrl = '';
        this.isLoading = false;
        this.webview = null;
        this.aiEnabled = false;
        
        this.init();
    }

    // Initialize browser
    init() {
        console.log('Browser Manager initializing...');
        this.setupDOMReferences();
        this.setupEventListeners();
        this.setupAccessibility();
        
        // Load default page
        this.loadUrl('https://www.google.com');
    }

    // Setup DOM references
    setupDOMReferences() {
        this.elements = {
            addressBar: document.getElementById('address-bar'),
            goButton: document.getElementById('go-button'),
            backButton: document.getElementById('back-button'),
            forwardButton: document.getElementById('forward-button'),
            reloadButton: document.getElementById('reload-button'),
            homeButton: document.getElementById('home-button'),
            aiButton: document.getElementById('ai-button'),
            aiSettingsButton: document.getElementById('ai-settings-button'),
            aiPanel: document.getElementById('ai-panel'),
            aiClose: document.getElementById('ai-close'),
            webviewContainer: document.getElementById('webview-container'),
            welcomeScreen: document.getElementById('welcome-screen'),
            statusText: document.getElementById('status-text'),
            loadingIndicator: document.getElementById('loading-indicator'),
            errorState: document.getElementById('error-state')
        };
        
        this.webview = document.getElementById('browser-webview');
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation events
        this.elements.addressBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.navigate();
        });
        this.elements.goButton.addEventListener('click', () => this.navigate());
        
        // Browser controls
        this.elements.backButton.addEventListener('click', () => this.goBack());
        this.elements.forwardButton.addEventListener('click', () => this.goForward());
        this.elements.reloadButton.addEventListener('click', () => this.reload());
        this.elements.homeButton.addEventListener('click', () => this.goHome());
        
        // AI controls
        this.elements.aiButton.addEventListener('click', () => this.toggleAIPanel());
        this.elements.aiSettingsButton.addEventListener('click', () => this.openAISettings());
        this.elements.aiClose.addEventListener('click', () => this.closeAIPanel());
        
        // Tab switching
        document.querySelectorAll('.ai-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAITab(e.target.getAttribute('data-tab')));
        });
        
        // AI action buttons
        document.getElementById('summarize-button').addEventListener('click', () => this.summarizePage());
        document.getElementById('ask-button').addEventListener('click', () => this.askQuestion());
        document.getElementById('analyze-button').addEventListener('click', () => this.analyzePage());
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup webview events
        this.setupWebviewEvents();
    }

    // Setup accessibility features
    setupAccessibility() {
        // Screen reader support
        this.announce('Browser başlatıldı');
        
        // High contrast mode detection
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }
        
        // Reduced motion detection
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
        }
    }

    // Setup webview events
    setupWebviewEvents() {
        if (!this.webview) return;
        
        this.webview.addEventListener('did-start-loading', () => {
            this.setLoading(true, 'Sayfa yükleniyor...');
            this.announce('Sayfa yükleniyor');
        });

        this.webview.addEventListener('did-finish-load', () => {
            this.setLoading(false);
            this.currentUrl = this.webview.getURL();
            this.elements.addressBar.value = this.currentUrl;
            this.updateStatus('Sayfa yüklendi');
            this.announce('Sayfa yüklendi');
        });

        this.webview.addEventListener('did-fail-load', (event) => {
            this.setLoading(false);
            this.showError(`Yükleme hatası: ${event.errorDescription}`);
            this.announce('Sayfa yüklenirken hata oluştu');
        });
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Address bar focus
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.focusAddressBar();
            }
            
            // Reload page
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.reload();
            }
            
            // Toggle AI panel
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                this.toggleAIPanel();
            }
            
            // Navigation
            if (e.altKey) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.goBack();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.goForward();
                }
            }
        });
    }

    // Navigation methods
    navigate() {
        const url = this.elements.addressBar.value.trim();
        if (!url) {
            this.showError('Lütfen bir adres girin');
            return;
        }
        this.loadUrl(url);
    }

    loadUrl(url) {
        let finalUrl = this.validateUrl(url);
        if (!finalUrl) {
            this.showError('Geçersiz URL formatı');
            return;
        }

        this.setLoading(true, `Yükleniyor: ${this.getDomain(finalUrl)}`);
        this.hideWelcome();
        this.showWebview();
        this.currentUrl = finalUrl;
        this.elements.addressBar.value = finalUrl;
        
        if (this.webview) {
            this.webview.src = finalUrl;
        }
        
        this.announce(`Sayfa yükleniyor: ${this.getDomain(finalUrl)}`);
    }

    validateUrl(url) {
        try {
            if (!url.startsWith('http')) url = 'https://' + url;
            new URL(url);
            return url;
        } catch {
            return null;
        }
    }

    goBack() {
        if (this.webview?.canGoBack()) {
            this.webview.goBack();
            this.announce('Geri dönüldü');
        } else {
            this.announce('Geri dönülecek sayfa yok');
        }
    }

    goForward() {
        if (this.webview?.canGoForward()) {
            this.webview.goForward();
            this.announce('İleri gidildi');
        } else {
            this.announce('İleri gidilecek sayfa yok');
        }
    }

    reload() {
        if (this.webview) {
            this.webview.reload();
            this.announce('Sayfa yenileniyor');
        }
    }

    goHome() {
        this.loadUrl('https://www.google.com');
        this.announce('Anasayfaya dönüldü');
    }

    // AI Panel methods
    toggleAIPanel() {
        const isVisible = this.elements.aiPanel.style.display === 'block';
        
        if (isVisible) {
            this.closeAIPanel();
        } else {
            this.openAIPanel();
        }
    }

    openAIPanel() {
        this.elements.aiPanel.style.display = 'block';
        this.elements.aiPanel.setAttribute('aria-hidden', 'false');
        this.announce('AI paneli açıldı');
    }

    closeAIPanel() {
        this.elements.aiPanel.style.display = 'none';
        this.elements.aiPanel.setAttribute('aria-hidden', 'true');
        this.announce('AI paneli kapandı');
    }

    switchAITab(tabName) {
        // Deactivate all tabs
        document.querySelectorAll('.ai-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.ai-tab-content').forEach(content => content.classList.remove('active'));
        
        // Activate selected tab
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.announce(`${tabName.replace('-', ' ')} sekmesi açıldı`);
    }

    openAISettings() {
        if (window.electronAPI) {
            window.electronAPI.openAISettings();
        }
    }

    // AI Action methods
    async summarizePage() {
        const summaryType = document.getElementById('summary-type').value;
        const loading = document.getElementById('summarize-loading');
        const response = document.getElementById('summarize-response');
        
        try {
            loading.style.display = 'block';
            response.innerHTML = '';
            
            if (window.electronAPI) {
                const result = await window.electronAPI.summarizeCurrentPage(summaryType);
                response.innerHTML = this.formatAIResponse(result.summary || 'Özet oluşturuldu');
            } else {
                response.innerHTML = this.formatAIResponse('AI özelliği kullanılamıyor', 'error');
            }
        } catch (error) {
            response.innerHTML = this.formatAIResponse(`Hata: ${error.message}`, 'error');
        } finally {
            loading.style.display = 'none';
        }
    }

    async askQuestion() {
        const question = document.getElementById('question-input').value.trim();
        const loading = document.getElementById('ask-loading');
        const response = document.getElementById('ask-response');
        
        if (!question) {
            response.innerHTML = this.formatAIResponse('Lütfen bir soru girin', 'error');
            return;
        }
        
        try {
            loading.style.display = 'block';
            response.innerHTML = '';
            
            if (window.electronAPI) {
                const result = await window.electronAPI.askQuestionOnPage(question);
                response.innerHTML = this.formatAIResponse(result.answer || 'Soru cevaplandı');
            } else {
                response.innerHTML = this.formatAIResponse('AI özelliği kullanılamıyor', 'error');
            }
        } catch (error) {
            response.innerHTML = this.formatAIResponse(`Hata: ${error.message}`, 'error');
        } finally {
            loading.style.display = 'none';
        }
    }

    async analyzePage() {
        const analysisType = document.getElementById('analysis-type').value;
        const loading = document.getElementById('analyze-loading');
        const response = document.getElementById('analyze-response');
        
        try {
            loading.style.display = 'block';
            response.innerHTML = '';
            
            if (window.electronAPI) {
                const result = await window.electronAPI.analyzePage(analysisType);
                response.innerHTML = this.formatAIResponse(result.analysis || 'Analiz tamamlandı');
            } else {
                response.innerHTML = this.formatAIResponse('AI özelliği kullanılamıyor', 'error');
            }
        } catch (error) {
            response.innerHTML = this.formatAIResponse(`Hata: ${error.message}`, 'error');
        } finally {
            loading.style.display = 'none';
        }
    }

    // Utility methods
    renderMarkdown(text) {
        if (!text) return '';
        const escapeHtml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const lines = String(text).split('\n');
        let html = '';
        let inCode = false;
        let listType = null; // 'ul' or 'ol'
        let listBuffer = [];
        const flushList = () => {
            if (listType) {
                html += `<${listType}>` + listBuffer.map(it => `<li>${it}</li>`).join('') + `</${listType}>`;
                listType = null;
                listBuffer = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            const line = raw;
            // Code block fences
            if (line.trim().startsWith('```')) {
                if (!inCode) {
                    flushList();
                    inCode = true;
                    html += '<pre><code>';
                } else {
                    inCode = false;
                    html += '</code></pre>';
                }
                continue;
            }
            if (inCode) {
                html += escapeHtml(line) + '\n';
                continue;
            }
            // Headings
            const hm = line.match(/^(#{1,6})\s+(.*)/);
            if (hm) {
                flushList();
                const level = hm[1].length;
                const content = hm[2];
                html += `<h${level}>${escapeHtml(content)}</h${level}>`;
                continue;
            }
            // Ordered list
            if (/^\s*\d+\.\s+/.test(line)) {
                const item = line.replace(/^\s*\d+\.\s+/, '');
                if (listType && listType !== 'ol') flushList();
                listType = 'ol';
                listBuffer.push(escapeHtml(item));
                continue;
            }
            // Unordered list
            if (/^\s*[-*]\s+/.test(line)) {
                const item = line.replace(/^\s*[-*]\s+/, '');
                if (listType && listType !== 'ul') flushList();
                listType = 'ul';
                listBuffer.push(escapeHtml(item));
                continue;
            }
            // Horizontal rule
            if (/^\s*[-*_]{3,}\s*$/.test(line)) {
                flushList();
                html += '<hr>';
                continue;
            }
            // Blockquote
            if (/^\s*>\s+/.test(line)) {
                flushList();
                const quote = line.replace(/^\s*>\s+/, '');
                html += `<blockquote>${escapeHtml(quote)}</blockquote>`;
                continue;
            }
            // Empty line -> paragraph separator
            if (line.trim() === '') {
                flushList();
                continue;
            }
            // Paragraph with inline formatting
            flushList();
            let p = escapeHtml(line)
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
            html += `<p>${p}</p>`;
        }
        flushList();
        return html;
    }

    formatAIResponse(text, type = 'success') {
        const rendered = this.renderMarkdown(text);
        return `<div class="ai-response ${type}">${rendered}</div>`;
    }

    hideWelcome() {
        this.elements.welcomeScreen.style.display = 'none';
        this.elements.webviewContainer.style.display = 'block';
    }

    showWebview() {
        this.elements.webviewContainer.style.display = 'block';
    }

    showWelcome() {
        this.elements.welcomeScreen.style.display = 'flex';
        this.elements.webviewContainer.style.display = 'none';
    }

    focusAddressBar() {
        this.elements.addressBar.focus();
        this.elements.addressBar.select();
        this.announce('Adres çubuğuna odaklanıldı');
    }

    setLoading(loading, message = '') {
        this.isLoading = loading;
        
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.toggle('visible', loading);
        }
        
        this.updateStatus(loading ? message : 'Hazır');
    }

    showError(message) {
        if (this.elements.errorState) {
            this.elements.errorState.classList.add('visible');
        }
        this.announce(`Hata: ${message}`);
    }

    updateStatus(message) {
        if (this.elements.statusText) {
            this.elements.statusText.textContent = message;
        }
    }

    announce(message) {
        const region = document.getElementById('screen-reader-announce');
        if (region) {
            region.textContent = message;
            setTimeout(() => region.textContent = '', 3000);
        }
    }

    getDomain(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    }
}

// Initialize browser when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.browserManager = new BrowserManager();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserManager;
}