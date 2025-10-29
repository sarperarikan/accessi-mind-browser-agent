const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // AI Settings: load/save and window control
  requestAISettings: () => ipcRenderer.invoke('request-ai-settings'),
  saveAISettings: (settings) => ipcRenderer.invoke('save-ai-settings', settings),
  resetAISettings: () => ipcRenderer.invoke('reset-ai-settings'),
  openAISettings: () => ipcRenderer.send('open-ai-settings'),
  closeAISettings: () => ipcRenderer.send('close-ai-settings'),

  // AI Actions on current page (handled in main via IPC)
  summarizeCurrentPage: (summaryType) => ipcRenderer.invoke('summarize-current-page', summaryType),
  askQuestionOnPage: (question) => ipcRenderer.invoke('ask-question-on-page', question),
  analyzePage: (analysisType) => ipcRenderer.invoke('analyze-page', analysisType),

  // Agentic browsing step
  agentBrowseStep: (context) => ipcRenderer.invoke('agent-browse-step', context),

  // Listen for settings updates on main window
  onAISettingsUpdated: (callback) => {
    ipcRenderer.on('ai-settings-updated', (_event, result) => {
      try { callback(result); } catch {}
    });
  },

  // Generic listener used by ai-settings.html for window-bound messages
  onMainWindowMessage: (callback) => {
    const channels = ['current-ai-settings', 'show-validation-dialog', 'close-window'];
    channels.forEach((channel) => {
      ipcRenderer.on(channel, (_event, payload) => {
        const eventObj = { type: channel, ...(payload || {}) };
        try { callback(eventObj); } catch {}
      });
    });
  },

  // Listen for AI actions triggered from the application menu
  onExecuteAIAction: (callback) => {
    ipcRenderer.on('execute-ai-action', (_event, payload) => {
      try { callback(payload || {}); } catch {}
    });
  },

  // Listen for File menu actions
  onExecuteFileAction: (callback) => {
    ipcRenderer.on('execute-file-action', (_event, payload) => {
      try { callback(payload || {}); } catch {}
    });
  },

  // Listen for Bookmark menu actions
  onExecuteBookmarkAction: (callback) => {
    ipcRenderer.on('execute-bookmark-action', (_event, payload) => {
      try { callback(payload || {}); } catch {}
    });
  },

  // Listen for Accessibility menu actions
  onExecuteAccessibilityAction: (callback) => {
    ipcRenderer.on('execute-accessibility-action', (_event, payload) => {
      try { callback(payload || {}); } catch {}
    });
  },

  // Bookmarks APIs
  saveBookmark: (payload) => ipcRenderer.invoke('save-bookmark', payload),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  removeBookmark: (payload) => ipcRenderer.invoke('remove-bookmark', payload),

  // Save webpage (renderer provides html/text/title/url)
  saveWebPage: (payload) => ipcRenderer.invoke('save-webpage', payload),

  // WCAG analysis API
  analyzeWCAG: (payload) => ipcRenderer.invoke('analyze-wcag', payload)
});