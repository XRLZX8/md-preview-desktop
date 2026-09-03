const { ipcRenderer, webUtils } = require('electron');
const path = require('path');
const markdownIt = require('markdown-it');
const hljs = require('highlight.js');

const md = markdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    '</code></pre>';
            } catch (__) {}
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
});

let currentFile = null;
let currentContent = '';
let isDirty = false;

// DOM Elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const historyList = document.getElementById('history-list');
const currentFileEl = document.getElementById('current-file');
const btnOpen = document.getElementById('btn-open');
const btnSave = document.getElementById('btn-save');
const btnTheme = document.getElementById('btn-theme');
const clearHistoryBtn = document.getElementById('clear-history');

// Initialize
async function init() {
    const theme = await ipcRenderer.invoke('get-theme');
    applyTheme(theme);
    await refreshHistory();
    setupEventListeners();
}

function setupEventListeners() {
    // Editor input
    editor.addEventListener('input', () => {
        currentContent = editor.value;
        renderPreview();
        isDirty = true;
        updateTitle();
    });

    // Toolbar buttons
    btnOpen.addEventListener('click', () => ipcRenderer.invoke('open-file'));
    btnSave.addEventListener('click', saveCurrentFile);
    btnTheme.addEventListener('click', toggleTheme);
    clearHistoryBtn.addEventListener('click', clearHistory);

    // IPC events
    ipcRenderer.on('file-loaded', (event, { filePath, content }) => {
        currentFile = filePath;
        currentContent = content;
        editor.value = content;
        renderPreview();
        currentFileEl.textContent = path.basename(filePath);
        isDirty = false;
        updateTitle();
        refreshHistory();
    });

    ipcRenderer.on('save-file', saveCurrentFile);
    ipcRenderer.on('save-file-as', (event, filePath) => {
        ipcRenderer.send('save-file-content', { filePath, content: editor.value });
    });

    ipcRenderer.on('file-saved', (event, { success, filePath, error }) => {
        if (success) {
            currentFile = filePath;
            isDirty = false;
            updateTitle();
            refreshHistory();
        } else {
            alert('Save failed: ' + error);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            ipcRenderer.invoke('open-file');
        }
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCurrentFile();
        }
    });

    // ===== Drag & Drop 文件拖入 =====
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        document.body.classList.add('drag-over');
    });
    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        document.body.classList.remove('drag-over');
    });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        document.body.classList.remove('drag-over');
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            let filePath = null;
            try {
                // Electron 28+: webUtils.getPathForFile
                filePath = webUtils.getPathForFile(file);
            } catch (err) {
                // 旧版本回退: file.path
                filePath = file.path || null;
            }
            if (filePath) {
                ipcRenderer.send('load-file', filePath);
            }
        }
    });
}

function renderPreview() {
    preview.innerHTML = md.render(currentContent);
}

function saveCurrentFile() {
    if (!currentFile) {
        ipcRenderer.invoke('save-file-as');
        return;
    }
    ipcRenderer.send('save-file-content', { filePath: currentFile, content: editor.value });
}

async function refreshHistory() {
    const history = await ipcRenderer.invoke('get-history');
    historyList.innerHTML = '';
    history.forEach(filePath => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = path.basename(filePath);
        item.title = filePath;
        item.addEventListener('click', () => {
            ipcRenderer.send('load-file', filePath);
        });
        historyList.appendChild(item);
    });
}

async function clearHistory() {
    // This would need an IPC handler, simplified for now
    historyList.innerHTML = '';
}

function toggleTheme() {
    const current = document.body.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    ipcRenderer.invoke('set-theme', next);
}

function applyTheme(theme) {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
    btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function updateTitle() {
    const dirty = isDirty ? '● ' : '';
    const file = currentFile ? path.basename(currentFile) : 'Untitled';
    document.title = `${dirty}${file} - MD Preview`;
}

// Start
init();
