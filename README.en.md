# AccessiMind Browser

AI-powered, fully accessible web browser for Windows.

## 🚀 Overview
- Focuses on keyboard-first navigation and screen reader support.
- Integrates with Google Gemini API for summarization, Q&A, actions, and analysis.
- Lightweight architecture optimized for low resource usage.

## 📁 Project Structure

```
accessimind-browser/
├── main.js              # Electron main process and menu
├── package.json         # Dependencies and scripts
├── README.md            # Documentation (Turkish)
├── README.en.md         # Documentation (English)
└── src/
    ├── index.html       # Main UI and AI panel
    └── ai-manager.js    # Production-ready AI manager
```

## 🔌 API Integration

### Google Gemini API Setup
1. Go to https://aistudio.google.com
2. Sign up for a free account
3. Create a new API key
4. Open "AI Settings" in AccessiMind Browser
5. Enter and save your API key

### Supported AI Features
1. Summarize page content and key points
2. Question–Answer about page-specific content
3. Apply actions on page data
4. Content analysis (sentiment, structure, key points)

## 🛠️ Development

### Adding a New AI Feature
1. Create a new function in `src/ai-manager.js`
2. Add a new tab/section in HTML
3. Register event listeners in JavaScript
4. Add menu entries in the main process as needed

### Accessibility Improvements
- Add ARIA labels and roles where applicable
- Test keyboard navigation thoroughly
- Optimize screen reader announcements
- Verify color contrast ratios

## 🧪 Test Scenarios

### AI Features
- [ ] Connect using a valid API key
- [ ] Summarization quality
- [ ] Q&A consistency
- [ ] Action execution success
- [ ] Error handling

### Accessibility
- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] High contrast mode
- [ ] Large font mode
- [ ] ARIA label correctness

## 📦 Installation (Windows)

- Installer (EXE, NSIS): `dist/AccessiMind Browser-Setup-1.0.0-x64.exe`
  - Guided setup, desktop shortcut creation enabled.
- Installer (MSI): `dist/AccessiMind Browser-Setup-1.0.0-x64.msi`
  - Traditional MSI installer; desktop/start menu shortcuts currently disabled.
- Portable: `dist/win-unpacked/AccessiMind Browser.exe`
  - No installation required; runs directly from the folder.

Notes:
- System-wide installation to `Program Files` may require admin privileges.
- AI settings files are saved next to the executable:
  - `ai-config.json` (non-sensitive settings)
  - `.ai-secure-config.json` (secure API key)
- In AI Settings UI, the API input field is shown empty for privacy; you must enter the key to save.

## 🔧 Scripts

- Start dev: `npm run start`
- Build installers: `npm run build`
- Pack directory only: `npm run pack`

## 📄 License

MIT License — AccessiMind AI Solutions

## 🆘 Support

- Google AI: https://ai.google.dev/docs
- Accessibility (WCAG 2.1): https://www.w3.org/WAI/WCAG21/quickref
- Electron: https://www.electronjs.org/docs

---

AccessiMind Browser — Smart Navigation, Accessibility for Everyone 🧠🌐