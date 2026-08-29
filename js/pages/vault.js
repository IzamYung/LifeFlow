/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\pages\vault.js */

const VaultPage = {
    currentFolderId: null, // null means root '/'
    searchQuery: '',
    folders: [],
    files: [],
    settings: {},

    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="vault-page">
                <!-- Header -->
                <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center; padding-bottom: 12px;">
                    <div class="welcome-section">
                        <h2>My Vault</h2>
                        <p>Store files, photos, and class documents in Telegram.</p>
                    </div>
                </div>

                <!-- Action Controls Bar -->
                <div class="finance-controls" style="margin-bottom: 16px;">
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="vault-search-input" placeholder="Search files, folders..." value="${this.searchQuery}">
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-secondary" id="vault-reload-btn" style="display: flex; align-items: center; gap: 6px; padding: 10px 14px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            Sync Cloud
                        </button>
                        
                        <button class="btn btn-primary" id="vault-new-folder-btn" style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: linear-gradient(135deg, #f59f00, #f08c00);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            + Folder
                        </button>
                        
                        <button class="btn btn-primary" id="vault-upload-file-btn" style="display: flex; align-items: center; gap: 6px; padding: 10px 14px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            + File
                        </button>

                        <button class="btn btn-primary" id="vault-camera-btn" style="display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: linear-gradient(135deg, #10b981, #059669);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            Photo
                        </button>
                    </div>
                </div>

                <!-- Breadcrumbs Directory Path Bar -->
                <div class="card" id="vault-breadcrumbs" style="padding: 10px 16px; margin-bottom: 16px; font-size: 13px; font-weight: 700; color: var(--text-secondary); display: flex; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 4px; line-height: 1;">
                    <!-- Rendered dynamically -->
                </div>

                <!-- Explorer Content Viewport -->
                <div class="assignments-grid" id="vault-explorer-grid" style="min-height: 250px; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px;">
                    <!-- Folders & Files Rendered dynamically -->
                </div>

                <!-- Hidden Input hooks for file upload & camera -->
                <input type="file" id="vault-hidden-file-input" style="display:none;"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/bmp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/html,text/css,text/javascript,text/csv,application/json,application/xml,.md,.ts,.py,.java,.c,.cpp,.h,.php,.rb,.go,.swift,.kt,.rs,.vue,.jsx,.tsx,.scss,.sass,.yaml,.yml,.toml,.sh,.sql,.txt,.csv">
                <input type="file" accept="image/*" capture="environment" id="vault-hidden-camera-input" style="display:none;">
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('vault-page');
            if (page) page.classList.add('active');
        }, 50);

        // Load credentials and vault content
        await this.loadCredentials();
        await this.loadVaultData(false); // loads from cache initially
        this.bindEvents();
    },

    async loadCredentials() {
        try {
            const list = await API.query("SELECT key_name, value_val FROM settings WHERE key_name IN ('telegram_bot_token', 'telegram_chat_id')");
            this.settings = {};
            list.forEach(s => this.settings[s.key_name] = s.value_val);
        } catch (err) {
            console.error("Failed to load telegram settings:", err);
        }
    },

    async loadVaultData(forceReload = false) {
        const grid = document.getElementById('vault-explorer-grid');
        if (!grid) return;

        if (forceReload) {
            grid.innerHTML = `
                <div style="grid-column: span 4; text-align: center; padding: 40px 0; color: var(--text-secondary);">
                    <div style="margin-bottom: 12px; font-weight: 700;">Syncing cloud data...</div>
                    <div class="skeleton-text skeleton" style="width: 40%; margin: 10px auto;"></div>
                    <div class="skeleton-text skeleton" style="width: 25%; margin: 10px auto;"></div>
                </div>
            `;
            try {
                await API.forceSync();
            } catch (err) {
                console.error("Cloud database sync failed:", err);
            }
        }

        try {
            this.folders = await API.query('SELECT id, name, parent_id, path FROM folders ORDER BY name ASC');
            this.files   = await API.query('SELECT id, name, type, folder_id, size, telegram_file_id, telegram_message_id, file_url, notes_content, created_at FROM files ORDER BY created_at DESC');
            this.renderExplorer();
            this.renderBreadcrumbs();
        } catch (err) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: span 4; padding: 40px 16px;">
                    <h5>Database Error</h5>
                    <p>${err.message}</p>
                    <button class="btn btn-primary" style="margin-top:10px;" onclick="VaultPage.loadVaultData(true)">Sync Again</button>
                </div>
            `;
        }
    },

    renderExplorer() {
        const grid = document.getElementById('vault-explorer-grid');
        if (!grid) return;

        // Filter by Current Directory Folder
        let filteredFolders = this.folders.filter(f => f.parent_id === this.currentFolderId);
        let filteredFiles = this.files.filter(f => f.folder_id === this.currentFolderId);

        // Apply Search query filter if query is present
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            // Search filters files/folders globally
            filteredFolders = this.folders.filter(f => f.name.toLowerCase().includes(q));
            filteredFiles = this.files.filter(f => f.name.toLowerCase().includes(q));
        }

        if (filteredFolders.length === 0 && filteredFiles.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: span 5; padding: 50px 16px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:48px; height:48px; opacity:0.6;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <h5>Folder is empty</h5>
                    <p>Upload a file, take a camera snap, or create a new subfolder.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // 1. Render Folders List
        html += filteredFolders.map(folder => {
            return `
                <div class="card ripple-container vault-folder-card"
                     style="padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 110px; cursor: pointer; border-bottom: 3px solid #f59f00; position: relative; overflow: hidden;"
                     onclick="VaultPage.navigateToFolder(${folder.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f59f00" stroke-width="2" style="width: 38px; height: 38px; margin-bottom: 8px;">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; width: 100%;">${folder.name}</div>

                    <!-- Delete button — always visible, brighter on hover -->
                    <button class="vault-folder-delete-btn" onclick="event.stopPropagation(); VaultPage.confirmDeleteFolder(${folder.id})"
                        style="position: absolute; top: 6px; right: 6px; background: rgba(239,68,68,0.12); border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.55; transition: opacity 0.2s, background 0.2s;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" style="width:14px; height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                </div>
            `;
        }).join('');

        // 2. Render Files List
        html += filteredFiles.map(file => {
            const isImage = file.type.startsWith('image/');
            const iconColor = isImage ? '#10b981' : '#3b5bdb';
            const iconHTML = isImage ? 
                `<svg viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" style="width:32px; height:32px; margin-bottom:8px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>` :
                `<svg viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" style="width:32px; height:32px; margin-bottom:8px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;

            const sizeKB = (file.size / 1024).toFixed(1) + ' KB';

            return `
                <div class="card ripple-container" 
                     style="padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; height: 110px; cursor: pointer; border-bottom: 3px solid ${iconColor};"
                     onclick="VaultPage.showFileDetails(${JSON.stringify(file).replace(/"/g, '&quot;')})">
                    <div style="display: flex; flex-direction: column; align-items: center; overflow: hidden; width: 100%;">
                        ${iconHTML}
                        <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; width: 100%;">${file.name}</div>
                    </div>
                    <div style="font-size: 10px; font-weight: 600; color: var(--text-tertiary); margin-top: 4px;">${sizeKB}</div>
                </div>
            `;
        }).join('');

        grid.innerHTML = html;
    },

    renderBreadcrumbs() {
        const bar = document.getElementById('vault-breadcrumbs');
        if (!bar) return;

        // Build as array of nodes to avoid whitespace gaps
        let html = `<span style="cursor:pointer; color:var(--primary); white-space:nowrap;" onclick="VaultPage.navigateToFolder(null)">Root</span>`;

        if (this.currentFolderId !== null) {
            const crumbs = [];
            let current = this.folders.find(f => f.id === this.currentFolderId);

            while (current) {
                crumbs.unshift(current);
                current = this.folders.find(f => f.id === current.parent_id);
            }

            crumbs.forEach(c => {
                html += `<span style="opacity:0.4; padding:0 2px;">/</span><span style="cursor:pointer; color:var(--primary); white-space:nowrap;" onclick="VaultPage.navigateToFolder(${c.id})">${c.name}</span>`;
            });
        }

        bar.innerHTML = html;
    },

    navigateToFolder(folderId) {
        this.currentFolderId = folderId;
        this.renderExplorer();
        this.renderBreadcrumbs();
    },

    showFolderOptions(e, folderId) {
        e.preventDefault();
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        if (confirm(`Delete folder "${folder.name}"? This will recursively remove all items inside it from your database.`)) {
            this.deleteFolder(folderId);
        }
    },

    confirmDeleteFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;
        if (confirm(`Delete folder "${folder.name}"?\nAll files inside will be removed from the database too.`)) {
            this.deleteFolder(folderId);
        }
    },

    async deleteFolder(folderId) {
        try {
            await API.execute('DELETE FROM folders WHERE id = ?', [folderId]);
            await API.execute('DELETE FROM files WHERE folder_id = ?', [folderId]);
            await this.loadVaultData();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    },

    showFileDetails(file) {
        const t = file.type || '';
        const isImage  = t.startsWith('image/');
        const isVideo  = t.startsWith('video/');
        const isAudio  = t.startsWith('audio/');
        const isPDF    = t === 'application/pdf';
        const isWord   = t.includes('word') || t.includes('msword') || file.name.match(/\.docx?$/i);
        const isExcel  = t.includes('excel') || t.includes('spreadsheet') || file.name.match(/\.xlsx?$/i);
        const isPPT    = t.includes('powerpoint') || t.includes('presentation') || file.name.match(/\.pptx?$/i);
        const isOffice = isWord || isExcel || isPPT;
        const isText   = t.startsWith('text/') || file.name.match(/\.(txt|md|csv|json|xml|html|css|js|ts)$/i);

        // Detect if the stored URL is a Telegram message deep link (file > 20MB)
        const isTelegramLink = file.file_url && file.file_url.startsWith('https://t.me/');
        const isDirectUrl    = file.file_url && !isTelegramLink;

        const formattedDate = new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const sizeStr = file.size >= 1048576
            ? (file.size / 1048576).toFixed(2) + ' MB'
            : (file.size / 1024).toFixed(1) + ' KB';

        // ── Viewer URLs (only useful for direct Telegram CDN links)
        const encoded       = isDirectUrl ? encodeURIComponent(file.file_url) : '';
        const googleViewerUrl = encoded ? `https://docs.google.com/viewer?url=${encoded}&embedded=true` : '';
        const officeViewerUrl = encoded ? `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}` : '';

        // ── Build preview block ────────────────────────────────────────
        let previewHTML = '';
        let viewerLabel = '';

        // Large file (>20MB) — Telegram deep link only, no preview possible
        if (isTelegramLink) {
            previewHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px 16px; background:var(--surface-variant); border-radius:var(--radius-md); border:1px solid var(--border-color); gap:12px; text-align:center;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2AABEE" stroke-width="1.5" style="width:44px; height:44px;"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                    <div>
                        <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">File stored in Telegram</div>
                        <div style="display:inline-block; background:rgba(42,171,238,0.15); color:#2AABEE; font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px; margin-bottom:6px;">${sizeStr}</div>
                        <div style="font-size:11px; color:var(--text-secondary); line-height:1.5;">File melebihi 20MB — preview tidak tersedia.<br>Buka terus dalam Telegram untuk download.</div>
                    </div>
                    <a href="${file.file_url}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px; background:#2AABEE; color:#fff; border-radius:var(--radius-sm); font-weight:700; font-size:13px; text-decoration:none;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                        Open in Telegram
                    </a>
                </div>`;

        } else if (isImage && file.file_url) {
            previewHTML = `
                <div id="vault-img-wrap" style="width:100%; border-radius:var(--radius-md); overflow:hidden; background:#000; display:flex; justify-content:center; align-items:center; max-height:58vh; cursor:zoom-in; position:relative;">
                    <img id="vault-preview-img" src="${file.file_url}" alt="${file.name}"
                        style="max-width:100%; max-height:58vh; object-fit:contain; transition:transform 0.3s ease; display:block; user-select:none;">
                    <div style="position:absolute; bottom:8px; left:10px; background:rgba(0,0,0,0.55); color:#fff; font-size:10px; padding:3px 9px; border-radius:20px; backdrop-filter:blur(6px); pointer-events:none; font-weight:700;">
                        ${sizeStr}
                    </div>
                    <div style="position:absolute; bottom:8px; right:10px; background:rgba(0,0,0,0.55); color:#fff; font-size:10px; padding:3px 9px; border-radius:20px; backdrop-filter:blur(6px); pointer-events:none;">
                        Tap to zoom
                    </div>
                </div>`;

        } else if (isPDF && file.file_url) {
            viewerLabel = '📄 PDF — Google Docs Viewer';
            previewHTML = `
                <div style="width:100%; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border-color);">
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--surface-variant); border-bottom:1px solid var(--border-color);">
                        <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">${viewerLabel}</span>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:11px; color:var(--text-tertiary); font-weight:600;">${sizeStr}</span>
                            <a href="${googleViewerUrl}" target="_blank" style="font-size:11px; color:var(--primary); font-weight:700;">Open Full ↗</a>
                        </div>
                    </div>
                    <iframe id="vault-doc-iframe" src="${googleViewerUrl}"
                        style="width:100%; height:55vh; border:none; display:block; background:var(--surface-variant);"
                        title="${file.name}" sandbox="allow-scripts allow-same-origin allow-popups">
                    </iframe>
                </div>`;

        } else if (isOffice && file.file_url) {
            const label = isWord ? '📝 Word' : isExcel ? '📊 Excel' : '📊 PowerPoint';
            viewerLabel = `${label} — Office Online Viewer`;
            previewHTML = `
                <div style="width:100%; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border-color);">
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--surface-variant); border-bottom:1px solid var(--border-color);">
                        <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">${viewerLabel}</span>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:11px; color:var(--text-tertiary); font-weight:600;">${sizeStr}</span>
                            <a href="${officeViewerUrl}" target="_blank" style="font-size:11px; color:var(--primary); font-weight:700;">Open Full ↗</a>
                        </div>
                    </div>
                    <iframe id="vault-doc-iframe" src="${officeViewerUrl}"
                        style="width:100%; height:55vh; border:none; display:block; background:var(--surface-variant);"
                        title="${file.name}" sandbox="allow-scripts allow-same-origin allow-popups allow-forms">
                    </iframe>
                </div>`;

        } else if (isVideo && file.file_url) {
            previewHTML = `
                <video controls style="width:100%; border-radius:var(--radius-md); max-height:50vh; background:#000; display:block;" src="${file.file_url}">
                    Video format not supported.
                </video>`;

        } else if (isAudio && file.file_url) {
            previewHTML = `
                <div style="padding:16px; background:var(--surface-variant); border-radius:var(--radius-md); border:1px solid var(--border-color);">
                    <audio controls style="width:100%;" src="${file.file_url}">
                        Audio format not supported.
                    </audio>
                </div>`;

        } else if (isText && file.file_url) {
            // Text files — will be fetched and rendered inline via JS
            previewHTML = `
                <div id="vault-text-preview" style="width:100%; max-height:50vh; overflow:auto; border-radius:var(--radius-md); border:1px solid var(--border-color); background:var(--surface-variant);">
                    <div style="padding:12px; font-size:11px; color:var(--text-tertiary); text-align:center;">Loading text preview...</div>
                </div>`;

        } else if (file.file_url) {
            // Unknown type placeholder
            previewHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 16px; background:var(--surface-variant); border-radius:var(--radius-md); border:1px solid var(--border-color); gap:10px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" style="width:52px; height:52px; opacity:0.6;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span style="font-size:12px; color:var(--text-secondary); font-weight:600;">${t || 'Unknown file type'}</span>
                    <span style="font-size:13px; font-weight:700; color:var(--text-primary);">${sizeStr}</span>
                    <span style="font-size:11px; color:var(--text-tertiary);">Preview not available — use Download below</span>
                </div>`;
        }

        // ── Action buttons ─────────────────────────────────────────────
        let actionButtons = '';

        if (isTelegramLink) {
            // Large file >20MB: Telegram deep link only
            actionButtons = `
            <a href="${file.file_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"
               style="display:flex; justify-content:center; align-items:center; gap:8px; padding:12px 0; text-decoration:none; font-size:13px; background:#2AABEE;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                Open in Telegram
            </a>`;

        } else if (isDirectUrl) {
            // File ≤20MB: Download only (browser handles preview natively)
            actionButtons = `
            <a href="${file.file_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"
               style="display:flex; justify-content:center; align-items:center; gap:8px; padding:12px 0; text-decoration:none; font-size:13px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
            </a>`;
        }


        const html = `
            <div style="display:flex; flex-direction:column; gap:12px;">
                ${previewHTML}

                <div style="font-size:12px; display:flex; flex-direction:column; gap:7px; background:var(--surface-variant); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
                    <div style="display:flex; justify-content:space-between; gap:8px;"><span style="color:var(--text-tertiary); font-weight:700; flex-shrink:0;">NAME</span><b style="color:var(--text-primary); word-break:break-all; text-align:right;">${file.name}</b></div>
                    <div style="display:flex; justify-content:space-between; gap:8px;"><span style="color:var(--text-tertiary); font-weight:700; flex-shrink:0;">TYPE</span><b style="color:var(--text-primary);">${t || '—'}</b></div>
                    <div style="display:flex; justify-content:space-between; gap:8px;"><span style="color:var(--text-tertiary); font-weight:700; flex-shrink:0;">SIZE</span><b style="color:var(--text-primary);">${sizeStr}</b></div>
                    <div style="display:flex; justify-content:space-between; gap:8px;"><span style="color:var(--text-tertiary); font-weight:700; flex-shrink:0;">UPLOADED</span><b style="color:var(--text-primary);">${formattedDate}</b></div>
                </div>

                ${actionButtons}

                <button class="btn btn-danger" id="btn-delete-file-vault" style="padding:11px 0; font-size:13px;">🗑 Delete File</button>
                <button class="btn btn-secondary" onclick="Modal.close()" style="padding:11px 0; font-size:13px;">Cancel</button>
            </div>
        `;

        Modal.open(file.name, html, (container) => {
            // Delete button
            const btnDelete = container.querySelector('#btn-delete-file-vault');
            if (btnDelete) {
                btnDelete.addEventListener('click', async () => {
                    if (confirm(`Remove "${file.name}" from Turso and Telegram?`)) {
                        Modal.close();
                        await this.deleteFile(file);
                    }
                });
            }

            // Image zoom toggle
            if (isImage) {
                const imgWrap = container.querySelector('#vault-img-wrap');
                const img     = container.querySelector('#vault-preview-img');
                if (imgWrap && img) {
                    let zoomed = false;
                    imgWrap.addEventListener('click', () => {
                        zoomed = !zoomed;
                        img.style.transform       = zoomed ? 'scale(2.2)' : 'scale(1)';
                        imgWrap.style.overflow    = zoomed ? 'auto'       : 'hidden';
                        imgWrap.style.cursor      = zoomed ? 'zoom-out'   : 'zoom-in';
                    });
                }
            }

            // Fetch and render plain text inline
            if (isText && file.file_url) {
                const box = container.querySelector('#vault-text-preview');
                fetch(file.file_url)
                    .then(r => r.text())
                    .then(text => {
                        if (box) box.innerHTML = `<pre style="padding:14px; font-size:11px; font-family:monospace; color:var(--text-primary); white-space:pre-wrap; word-break:break-all; margin:0;">${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
                    })
                    .catch(() => {
                        if (box) box.innerHTML = `<div style="padding:14px; font-size:12px; color:var(--text-tertiary); text-align:center;">Could not load text preview.</div>`;
                    });
            }

            // Stop media on modal close
            if (isVideo || isAudio) {
                const onClose = () => {
                    const media = container.querySelector('video, audio');
                    if (media) { media.pause(); media.src = ''; }
                };
                document.getElementById('sheet-close-btn')?.addEventListener('click', onClose, { once: true });
                document.getElementById('global-modal-overlay')?.addEventListener('click', onClose, { once: true });
            }
        });
    },


    async deleteFile(file) {
        const botToken = this.settings.telegram_bot_token;
        const chatId   = this.settings.telegram_chat_id;

        // Try to delete the Telegram message too
        if (botToken && chatId && file.telegram_message_id) {
            try {
                await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage?chat_id=${chatId}&message_id=${file.telegram_message_id}`, { method: 'POST' });
            } catch (e) {
                console.warn('Failed to delete Telegram message:', e);
            }
        }

        try {
            await API.execute('DELETE FROM files WHERE id = ?', [file.id]);
            await this.loadVaultData();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    },

    showNewFolderModal() {
        const html = `
            <form id="form-new-folder" class="settings-form">
                <div class="form-group">
                    <label for="fld-name">Folder Name</label>
                    <input type="text" id="fld-name" placeholder="e.g. Study Notes, Homework" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Folder</button>
                </div>
            </form>
        `;

        Modal.open('Create New Folder', html, (container) => {
            const form = container.querySelector('#form-new-folder');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const folderName = document.getElementById('fld-name').value.trim();
                if (!folderName) return;

                // Reconstruct parent paths
                let parentPath = '';
                if (this.currentFolderId !== null) {
                    const parent = this.folders.find(f => f.id === this.currentFolderId);
                    if (parent) parentPath = parent.path;
                }
                const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

                try {
                    await API.execute('INSERT INTO folders (name, parent_id, path) VALUES (?, ?, ?)', [folderName, this.currentFolderId, folderPath]);
                    Modal.close();
                    await this.loadVaultData();
                } catch (err) {
                    alert('Folder creation failed: ' + err.message);
                }
            });
        });
    },

    showUploadDetailsModal(fileBlob, suggestedName) {
        // Build folder list for dropdown
        const rootOption = `<li class="dropdown-item active" data-id="null">/ (Root)</li>`;
        const folderOptions = this.folders.map(f => {
            return `<li class="dropdown-item" data-id="${f.id}">/${f.path}</li>`;
        }).join('');

        const html = `
            <form id="form-upload-vault" class="settings-form" style="display: flex; flex-direction: column; gap: 14px;">
                <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
                    <label for="upl-filename">File Name</label>
                    <input type="text" id="upl-filename" value="${suggestedName}" required style="padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background-color: var(--surface-variant); color: var(--text-primary); font-size:14px;">
                </div>

                <!-- Custom Searchable Dropdown Selector -->
                <div class="form-group" style="display: flex; flex-direction: column; gap: 6px; position: relative;">
                    <label>Destination Folder</label>
                    <div id="dropdown-select-box" style="padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background-color: var(--surface-variant); color: var(--text-primary); font-size: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span id="selected-folder-label">/ (Root)</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    
                    <input type="hidden" id="upl-folder-id" value="${this.currentFolderId || ''}">

                    <!-- Dropdown Options List Container -->
                    <div id="dropdown-options-container" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background-color: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-sm); z-index: 10; box-shadow: var(--modal-shadow); margin-top: 4px; padding: 8px;">
                        <input type="text" id="dropdown-search-input" placeholder="Search folder..." style="width: 100%; padding: 8px; margin-bottom: 8px; border-radius: var(--radius-xs); border: 1px solid var(--border-color); background-color: var(--surface-variant); color: var(--text-primary); font-size: 12px;">
                        <ul id="dropdown-items-list" style="list-style: none; margin: 0; padding: 0; max-height: 150px; overflow-y: auto; font-size: 13px;">
                            ${rootOption}
                            ${folderOptions}
                        </ul>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 10px;">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="vault-submit-upload-btn">Upload to Telegram</button>
                </div>
            </form>
        `;

        Modal.open('Vault Upload Settings', html, (container) => {
            const form = container.querySelector('#form-upload-vault');
            const selectBox = container.querySelector('#dropdown-select-box');
            const optionsContainer = container.querySelector('#dropdown-options-container');
            const searchInput = container.querySelector('#dropdown-search-input');
            const itemsList = container.querySelector('#dropdown-items-list');
            const folderIdInput = container.querySelector('#upl-folder-id');
            const selectedLabel = container.querySelector('#selected-folder-label');

            // Pre-select current folder if active
            if (this.currentFolderId !== null) {
                const activeFolder = this.folders.find(f => f.id === this.currentFolderId);
                if (activeFolder) {
                    selectedLabel.textContent = '/' + activeFolder.path;
                    // Highlight selected item
                    itemsList.querySelectorAll('.dropdown-item').forEach(el => {
                        if (el.dataset.id === this.currentFolderId.toString()) el.classList.add('active');
                        else el.classList.remove('active');
                    });
                }
            }

            // Toggle dropdown options open/close
            selectBox.addEventListener('click', () => {
                const isOpen = optionsContainer.style.display === 'block';
                optionsContainer.style.display = isOpen ? 'none' : 'block';
                if (!isOpen) searchInput.focus();
            });

            // Filter folders dynamically on search input typing
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const items = itemsList.querySelectorAll('.dropdown-item');
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    if (text.includes(query)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });

            // Select item and populate hidden inputs
            itemsList.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (!item) return;

                itemsList.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');

                const folderId = item.dataset.id === 'null' ? '' : item.dataset.id;
                folderIdInput.value = folderId;
                selectedLabel.textContent = item.textContent;
                optionsContainer.style.display = 'none';
            });

            // Close dropdown if clicked outside
            document.addEventListener('click', function closeDropdown(evt) {
                if (!selectBox.contains(evt.target) && !optionsContainer.contains(evt.target)) {
                    optionsContainer.style.display = 'none';
                    document.removeEventListener('click', closeDropdown);
                }
            });

            // Handle Form Upload Submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const finalFilename = document.getElementById('upl-filename').value.trim();
                const folderIdVal = folderIdInput.value ? parseInt(folderIdInput.value, 10) : null;

                if (!finalFilename) return;

                Modal.close();
                this.uploadFileToTelegram(fileBlob, finalFilename, folderIdVal);
            });
        });
    },

    // ── Allowed file types ─────────────────────────────────────────────────────
    _ALLOWED_MIMES: [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Text / code
        'text/plain', 'text/html', 'text/css', 'text/javascript',
        'text/csv', 'text/xml', 'application/json', 'application/xml',
    ],
    _ALLOWED_EXTS: /\.(jpg|jpeg|png|gif|webp|svg|bmp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|csv|json|xml|html|htm|css|js|ts|py|java|c|cpp|h|php|rb|go|swift|kt|rs|vue|jsx|tsx|scss|sass|yaml|yml|toml|sh|bash|sql)$/i,

    isAllowedFileType(file) {
        const mime = (file.type || '').toLowerCase();
        const name = (file.name || '').toLowerCase();
        return this._ALLOWED_MIMES.includes(mime) || this._ALLOWED_EXTS.test(name);
    },

    showFileTypeToast(file) {
        const ext  = file.name.split('.').pop().toUpperCase() || '?';
        const mime = file.type || 'unknown';

        // Remove existing toast if any
        const existing = document.getElementById('vault-type-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'vault-type-toast';
        toast.innerHTML = `
            <div style="display:flex; align-items:flex-start; gap:12px;">
                <div style="font-size:24px; line-height:1;">🚫</div>
                <div>
                    <div style="font-weight:700; font-size:13px; margin-bottom:3px;">File type not allowed</div>
                    <div style="font-size:11px; opacity:0.8;">.${ext} (${mime})</div>
                    <div style="font-size:11px; opacity:0.65; margin-top:4px;">Allowed: Images · PDF · Word · Excel · PPT · Code files · Text</div>
                </div>
                <button onclick="this.closest('#vault-type-toast').remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:18px;line-height:1;margin-left:auto;opacity:0.7;">×</button>
            </div>
        `;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            color: '#fff',
            padding: '14px 18px',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: '99999',
            minWidth: '280px',
            maxWidth: '90vw',
            fontFamily: 'var(--font-body)',
            animation: 'slideUp 0.3s ease',
        });

        // Add animation if not present
        if (!document.getElementById('vault-toast-style')) {
            const style = document.createElement('style');
            style.id = 'vault-toast-style';
            style.textContent = '@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
    },


    // ── Upload to Telegram with non-blocking floating progress bar ────────────
    async uploadFileToTelegram(fileBlob, filename, folderId) {
        const botToken = this.settings.telegram_bot_token;
        const chatId   = this.settings.telegram_chat_id;
        const MAX      = 20 * 1024 * 1024;

        if (!botToken || !chatId) {
            alert('Upload failed: Please configure Telegram credentials in Settings first.');
            return;
        }

        // ── Show floating progress bar (non-blocking) ─────────────────────────
        const barId = 'vault-upload-bar';
        let bar = document.getElementById(barId);
        if (bar) bar.remove();

        bar = document.createElement('div');
        bar.id = barId;
        bar.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; padding:10px 16px;">
                <div id="upload-bar-icon" style="width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.9s infinite linear;flex-shrink:0;"></div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="upload-bar-title">Uploading...</div>
                    <div style="margin-top:4px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;">
                        <div id="upload-bar-fill" style="height:100%;width:0%;background:#fff;border-radius:2px;transition:width 0.2s ease;"></div>
                    </div>
                </div>
                <div id="upload-bar-pct" style="font-size:11px;color:rgba(255,255,255,0.8);flex-shrink:0;">0%</div>
            </div>
            <style>
                #vault-upload-bar{position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,var(--primary,#6366f1),#8b5cf6);box-shadow:0 2px 16px rgba(0,0,0,0.3);font-family:var(--font-body);}
                @keyframes spin{to{transform:rotate(360deg)}}
            </style>
        `;
        document.body.appendChild(bar);

        const setBar = (title, pct, done = false, error = false) => {
            const t = document.getElementById('upload-bar-title');
            const f = document.getElementById('upload-bar-fill');
            const p = document.getElementById('upload-bar-pct');
            const i = document.getElementById('upload-bar-icon');
            if (t) t.textContent = title;
            if (f) f.style.width = pct + '%';
            if (p) p.textContent = pct + '%';
            if (done && i) {
                i.style.animation = 'none';
                i.style.border = 'none';
                i.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" style="width:18px;height:18px;"><polyline points="20 6 9 17 4 12"/></svg>';
                bar.style.background = 'linear-gradient(135deg,#10b981,#059669)';
            }
            if (error && i) {
                i.style.animation = 'none';
                i.style.border = 'none';
                i.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" style="width:18px;height:18px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                bar.style.background = 'linear-gradient(135deg,#dc2626,#b91c1c)';
            }
        };

        const removeBar = (delay = 3000) => setTimeout(() => { if (bar.parentNode) bar.remove(); }, delay);

        try {
            const sizeStr = s => s >= 1048576 ? (s / 1048576).toFixed(1) + ' MB' : (s / 1024).toFixed(0) + ' KB';

            // ── Upload via XHR for real progress ─────────────────────────────
            setBar(`Uploading ${filename}`, 0);

            const uploadResult = await new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('chat_id', chatId);
                formData.append('document', fileBlob, filename);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', `https://api.telegram.org/bot${botToken}/sendDocument`);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.round((e.loaded / e.total) * 100);
                        setBar(`Uploading ${filename} — ${sizeStr(e.loaded)} / ${sizeStr(e.total)}`, pct);
                    }
                };

                xhr.onload = () => {
                    try { resolve(JSON.parse(xhr.responseText)); }
                    catch (e) { reject(new Error('Invalid response from Telegram')); }
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(formData);
            });

            if (!uploadResult.ok) throw new Error(uploadResult.description || 'Telegram rejected the upload.');

            const result    = uploadResult.result;
            const messageId = result.message_id;

            // ── Extract file_id ───────────────────────────────────────────────
            const fileId = result.document?.file_id
                        || result.video?.file_id
                        || result.audio?.file_id
                        || result.voice?.file_id
                        || result.animation?.file_id
                        || result.photo?.[result.photo.length - 1]?.file_id
                        || null;

            if (!fileId) throw new Error('Could not extract file_id from Telegram response.');

            // ── Try getFile for direct URL (only ≤20MB) ───────────────────────
            setBar(`Finalising ${filename}...`, 100);
            let downloadUrl = null;
            try {
                const fr = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
                if (fr.ok) {
                    const fd = await fr.json();
                    if (fd.ok && fd.result.file_path) {
                        downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fd.result.file_path}`;
                    }
                }
            } catch (e) { /* file >20MB, fall through */ }

            // ── Fallback to Telegram deep link for >20MB ──────────────────────
            if (!downloadUrl && chatId) {
                const channelId = String(chatId).replace(/^-100/, '');
                downloadUrl = `https://t.me/c/${channelId}/${messageId}`;
            }

            // ── Save to Turso ─────────────────────────────────────────────────
            await API.execute(
                'INSERT INTO files (name, type, folder_id, size, telegram_file_id, telegram_message_id, file_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [filename, fileBlob.type || 'application/octet-stream', folderId, fileBlob.size, fileId, messageId, downloadUrl]
            );

            await this.loadVaultData();

            setBar(`✓ ${filename} uploaded!`, 100, true);
            removeBar(3000);

        } catch (err) {
            setBar(`Upload failed: ${err.message}`, 0, false, true);
            removeBar(5000);
        }
    },


    bindEvents() {

        // Search Filter input keyup
        const searchInput = document.getElementById('vault-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                if (this.searchTimeout) clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => this.renderExplorer(), 300);
            });
        }

        // Reload/Sync database cache button
        const reloadBtn = document.getElementById('vault-reload-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', async () => {
                await this.loadVaultData(true); // force reload from Turso Cloud
            });
        }

        // Create Folder button
        const newFolderBtn = document.getElementById('vault-new-folder-btn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                this.showNewFolderModal();
            });
        }

        // Hidden file & camera triggers
        const hiddenFileInput = document.getElementById('vault-hidden-file-input');
        const hiddenCameraInput = document.getElementById('vault-hidden-camera-input');

        const uploadFileBtn = document.getElementById('vault-upload-file-btn');
        if (uploadFileBtn && hiddenFileInput) {
            uploadFileBtn.addEventListener('click', () => {
                hiddenFileInput.click();
            });
        }

        const cameraBtn = document.getElementById('vault-camera-btn');
        if (cameraBtn) {
            cameraBtn.addEventListener('click', () => {
                // Try desktop webcam first via getUserMedia, fallback to native file picker
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    this.showCameraModal();
                } else if (hiddenCameraInput) {
                    hiddenCameraInput.click();
                }
            });
        }

        // When a file is selected via hidden picker
        if (hiddenFileInput) {
            hiddenFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                hiddenFileInput.value = '';

                if (!this.isAllowedFileType(file)) {
                    this.showFileTypeToast(file);
                    return;
                }

                this.showUploadDetailsModal(file, file.name);
            });
        }

        // When a photo is taken via hidden camera
        if (hiddenCameraInput) {
            hiddenCameraInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                // Generate a generic timestamped filename for the photo
                const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
                const suggestedName = `photo_${timestamp}.jpg`;
                this.showUploadDetailsModal(file, suggestedName);
                // reset camera input
                hiddenCameraInput.value = '';
            });
        }
    },

    showCameraModal() {
        let stream = null;
        let facingMode = 'environment'; // start with back camera

        const html = `
            <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">

                <!-- Live Video Preview -->
                <div style="position: relative; width: 100%; border-radius: var(--radius-md); overflow: hidden; background: #000; aspect-ratio: 4/3;">
                    <video id="vault-cam-video" autoplay playsinline muted
                        style="width: 100%; height: 100%; object-fit: cover; display: block;"></video>
                    <canvas id="vault-cam-canvas" style="display: none;"></canvas>

                    <!-- Flip Camera button (top-right) -->
                    <button id="vault-cam-flip" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 38px; height: 38px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; backdrop-filter: blur(4px);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px; height:18px;"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                    </button>

                    <!-- Countdown / Shutter flash overlay -->
                    <div id="vault-cam-flash" style="position:absolute; inset:0; background:white; opacity:0; pointer-events:none; transition: opacity 0.05s;"></div>
                </div>

                <!-- Shutter Button -->
                <button id="vault-cam-snap" style="width: 64px; height: 64px; border-radius: 50%; border: 4px solid var(--primary); background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(99,102,241,0.3); transition: transform 0.1s;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--primary);"></div>
                </button>

                <p style="font-size: 11px; color: var(--text-secondary); text-align: center;">Click the button to take a photo. Flip to switch camera.</p>

                <button class="btn btn-secondary" id="vault-cam-cancel" style="width: 100%; padding: 12px;">Cancel</button>
            </div>
        `;

        Modal.open('Take a Photo', html, async (container) => {
            const video = container.querySelector('#vault-cam-video');
            const canvas = container.querySelector('#vault-cam-canvas');
            const snapBtn = container.querySelector('#vault-cam-snap');
            const flipBtn = container.querySelector('#vault-cam-flip');
            const cancelBtn = container.querySelector('#vault-cam-cancel');
            const flash = container.querySelector('#vault-cam-flash');

            const startStream = async () => {
                // Stop any existing stream first
                if (stream) stream.getTracks().forEach(t => t.stop());
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                        audio: false
                    });
                    video.srcObject = stream;
                } catch (err) {
                    // If back camera fails, try any camera
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                        video.srcObject = stream;
                    } catch (e) {
                        Modal.close();
                        alert('Camera access denied or not available on this device.');
                    }
                }
            };

            await startStream();

            // Flip camera between front and back
            if (flipBtn) {
                flipBtn.addEventListener('click', async () => {
                    facingMode = facingMode === 'environment' ? 'user' : 'environment';
                    await startStream();
                });
            }

            // Take photo snapshot
            if (snapBtn) {
                snapBtn.addEventListener('click', async () => {
                    // Shutter flash animation
                    flash.style.opacity = '1';
                    setTimeout(() => { flash.style.opacity = '0'; }, 80);

                    // Draw current video frame onto canvas
                    canvas.width = video.videoWidth || 1280;
                    canvas.height = video.videoHeight || 720;
                    const ctx = canvas.getContext('2d');

                    // Mirror front camera horizontally
                    if (facingMode === 'user') {
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                    }
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Stop stream and close modal before upload dialog
                    stream.getTracks().forEach(t => t.stop());
                    stream = null;
                    Modal.close();

                    // Convert canvas to Blob file
                    canvas.toBlob((blob) => {
                        if (!blob) { alert('Failed to capture image.'); return; }
                        const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
                        const filename = `photo_${timestamp}.jpg`;
                        const file = new File([blob], filename, { type: 'image/jpeg' });
                        this.showUploadDetailsModal(file, filename);
                    }, 'image/jpeg', 0.92);
                });
            }

            // Cancel button stops stream and closes modal
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (stream) stream.getTracks().forEach(t => t.stop());
                    stream = null;
                    Modal.close();
                });
            }

            // Also stop stream if modal overlay is tapped/closed externally
            const overlay = document.getElementById('global-modal-overlay');
            const stopOnClose = () => {
                if (stream) stream.getTracks().forEach(t => t.stop());
                stream = null;
                overlay.removeEventListener('click', stopOnClose);
            };
            overlay.addEventListener('click', stopOnClose);
        });
    }
};
