/**
 * Gestione Corrieri - App principale
 */

const App = {
    currentTab: 'giri',
    confirmCallback: null,
    expandedGiri: new Set(),

    // Inizializzazione
    async init() {
        this.currentFontSize = 100;
        this.loadTheme();
        this.loadFontSize();
        this.bindEvents();

        // Sync automatico all'avvio
        await this.autoSync();

        this.renderGiri();
        this.updateGiroSelects();
        this.updateStats();
    },

    // === AUTO SYNC ===

    async autoSync() {
        this.updateSyncIndicator('syncing', 'Sincronizzazione...');

        try {
            // Controlla lo stato
            const status = await DataManager.checkSyncStatus();

            if (status.status === 'outdated') {
                // Ci sono aggiornamenti, scarica automaticamente
                const result = await DataManager.downloadFromCloud();
                if (result.success) {
                    this.updateSyncIndicator('synced', 'Aggiornato');
                    this.showToast('Dati aggiornati dal cloud', 'success');
                } else {
                    this.updateSyncIndicator('error', 'Errore');
                }
            } else if (status.status === 'ahead') {
                // Hai modifiche locali non caricate
                this.updateSyncIndicator('ahead', 'Da caricare');
            } else if (status.status === 'synced') {
                this.updateSyncIndicator('synced', 'Sincronizzato');
            } else {
                this.updateSyncIndicator('error', 'Offline');
            }
        } catch (e) {
            this.updateSyncIndicator('error', 'Errore');
        }
    },

    updateSyncIndicator(status, label) {
        const indicator = document.getElementById('btnSyncStatus');
        const syncIcon = document.getElementById('syncIcon');
        const syncLabel = document.getElementById('syncLabel');

        if (indicator) {
            indicator.setAttribute('data-status', status);
        }
        if (syncIcon) {
            syncIcon.classList.toggle('syncing', status === 'syncing');
        }
        if (syncLabel) {
            syncLabel.textContent = label;
        }
    },

    async checkAndUpdateSyncStatus() {
        const status = await DataManager.checkSyncStatus();

        if (status.status === 'outdated') {
            this.updateSyncIndicator('outdated', 'Aggiorna');
        } else if (status.status === 'ahead') {
            this.updateSyncIndicator('ahead', 'Da caricare');
        } else if (status.status === 'synced') {
            this.updateSyncIndicator('synced', 'Sincronizzato');
        } else {
            this.updateSyncIndicator('error', 'Offline');
        }

        return status;
    },

    // === THEME ===

    loadTheme() {
        const savedTheme = localStorage.getItem('valkyrie_theme') || 'light';
        this.setTheme(savedTheme, false);
    },

    setTheme(theme, save = true) {
        document.documentElement.setAttribute('data-theme', theme);
        if (save) localStorage.setItem('valkyrie_theme', theme);

        // Update header toggle icon
        const iconSun = document.getElementById('iconSun');
        const iconMoon = document.getElementById('iconMoon');
        if (iconSun && iconMoon) {
            iconSun.classList.toggle('hidden', theme === 'dark');
            iconMoon.classList.toggle('hidden', theme === 'light');
        }
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    // === FONT SIZE ===

    loadFontSize() {
        const savedSize = localStorage.getItem('valkyrie_fontsize') || '100';
        this.setFontSize(parseInt(savedSize), false);
    },

    setFontSize(size, save = true) {
        // Limit between 80% and 150%
        size = Math.max(80, Math.min(150, size));
        document.documentElement.style.fontSize = size + '%';
        if (save) localStorage.setItem('valkyrie_fontsize', size.toString());

        // Update label
        const label = document.getElementById('fontSizeLabel');
        if (label) label.textContent = size + '%';

        this.currentFontSize = size;
    },

    increaseFontSize() {
        const current = this.currentFontSize || 100;
        this.setFontSize(current + 10);
    },

    decreaseFontSize() {
        const current = this.currentFontSize || 100;
        this.setFontSize(current - 10);
    },

    // === EVENT BINDING ===

    bindEvents() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        searchInput.addEventListener('focus', () => {
            if (searchInput.value) this.handleSearch(searchInput.value);
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                document.getElementById('searchResults').classList.add('hidden');
            }
        });

        // Buttons
        document.getElementById('btnSettings').addEventListener('click', () => {
            this.loadCloudInfo();
            this.openModal('modalSettings');
        });
        document.getElementById('btnAddGiro').addEventListener('click', () => this.openGiroModal());
        document.getElementById('btnAddPaese').addEventListener('click', () => this.openPaeseModal());

        // Forms
        document.getElementById('formGiro').addEventListener('submit', (e) => this.saveGiro(e));
        document.getElementById('formPaese').addEventListener('submit', (e) => this.savePaese(e));

        // Color presets
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('giroColore').value = btn.dataset.color;
            });
        });

        // Filters & Sort
        document.getElementById('giriSort').addEventListener('change', () => this.renderGiri());
        document.getElementById('paesiFilterGiro').addEventListener('change', () => this.renderPaesi());
        document.getElementById('paesiSort').addEventListener('change', () => this.renderPaesi());

        // Modal close buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
        });

        // Export/Import
        document.getElementById('btnExport').addEventListener('click', () => this.exportData());
        document.getElementById('btnImport').addEventListener('click', () => {
            document.getElementById('fileImport').click();
        });
        document.getElementById('fileImport').addEventListener('change', (e) => this.importData(e));
        document.getElementById('btnClearData').addEventListener('click', () => this.confirmClearData());

        // Confirm modal
        document.getElementById('btnConfirmNo').addEventListener('click', () => this.closeModal('modalConfirm'));
        document.getElementById('btnConfirmYes').addEventListener('click', () => {
            if (this.confirmCallback) this.confirmCallback();
            this.closeModal('modalConfirm');
        });

        // Print
        document.getElementById('btnDoPrint').addEventListener('click', () => this.doPrint());

        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                    this.closeModal(modal.id);
                });
            }
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal.id);
            });
        });

        // === CLOUD SYNC EVENTS ===
        document.getElementById('btnCloudDownload').addEventListener('click', () => this.cloudDownload());
        document.getElementById('btnCloudUpload').addEventListener('click', () => this.cloudUpload());

        // Sync indicator click - manual sync check
        document.getElementById('btnSyncStatus').addEventListener('click', () => this.manualSyncCheck());

        // Theme toggle (header)
        document.getElementById('btnThemeToggle').addEventListener('click', () => this.toggleTheme());

        // Font size controls
        document.getElementById('btnFontIncrease').addEventListener('click', () => this.increaseFontSize());
        document.getElementById('btnFontDecrease').addEventListener('click', () => this.decreaseFontSize());
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // === TABS ===

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.toggle('active', section.id === tabName + 'Section');
        });

        // Render content
        if (tabName === 'giri') this.renderGiri();
        else if (tabName === 'paesi') this.renderPaesi();
        else if (tabName === 'note') this.renderNote();
    },

    // === SEARCH ===

    handleSearch(query) {
        const resultsContainer = document.getElementById('searchResults');

        if (!query.trim()) {
            resultsContainer.classList.add('hidden');
            return;
        }

        const results = DataManager.search(query);
        const hasResults = results.giri.length > 0 || results.paesi.length > 0;

        if (!hasResults) {
            resultsContainer.innerHTML = '<div class="search-result-item"><span>Nessun risultato</span></div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        let html = '';

        // Paesi results (priorità - la ricerca principale è per trovare paesi)
        results.paesi.forEach(paese => {
            const giro = DataManager.getGiro(paese.giroId);
            html += `
                <div class="search-result-item" data-type="paese" data-id="${paese.id}">
                    <span class="search-result-type">Paese</span>
                    <div class="search-result-info">
                        <div class="search-result-name">${this.escapeHtml(paese.nome)}</div>
                        <div class="search-result-detail">
                            <strong>${giro ? this.escapeHtml(giro.nome) : 'N/D'}</strong>
                            ${giro && giro.spazio ? ` <span class="spazio-badge" style="font-size:0.65rem;padding:2px 6px;">${this.escapeHtml(giro.spazio)}</span>` : ''}
                        </div>
                    </div>
                    ${paese.note ? '<span class="list-item-note-indicator">📝</span>' : ''}
                </div>
            `;
        });

        // Giri results
        results.giri.forEach(giro => {
            const paesiCount = DataManager.getPaesiByGiro(giro.id).length;
            html += `
                <div class="search-result-item" data-type="giro" data-id="${giro.id}">
                    <span class="search-result-type giro">Giro</span>
                    <div class="search-result-info">
                        <div class="search-result-name">${this.escapeHtml(giro.nome)}</div>
                        <div class="search-result-detail">
                            ${giro.spazio ? `<span class="spazio-badge" style="font-size:0.65rem;padding:2px 6px;">${this.escapeHtml(giro.spazio)}</span> ` : ''}${paesiCount} paesi
                        </div>
                    </div>
                    ${giro.note ? '<span class="list-item-note-indicator">📝</span>' : ''}
                </div>
            `;
        });

        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');

        // Click on result
        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                const id = item.dataset.id;

                if (type === 'paese') {
                    const paese = DataManager.getPaese(id);
                    if (paese) {
                        this.switchTab('giri');
                        this.expandedGiri.add(paese.giroId);
                        this.renderGiri();
                        // Scroll to giro
                        setTimeout(() => {
                            const giroEl = document.querySelector(`[data-giro-id="${paese.giroId}"]`);
                            if (giroEl) giroEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                    }
                } else if (type === 'giro') {
                    this.switchTab('giri');
                    this.expandedGiri.add(id);
                    this.renderGiri();
                    setTimeout(() => {
                        const giroEl = document.querySelector(`[data-giro-id="${id}"]`);
                        if (giroEl) giroEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }

                resultsContainer.classList.add('hidden');
                document.getElementById('searchInput').value = '';
            });
        });
    },

    // === GIRI ===

    renderGiri() {
        const container = document.getElementById('giriList');
        let giri = DataManager.getGiri();

        // Sorting
        const sortBy = document.getElementById('giriSort').value;
        giri = this.sortGiri(giri, sortBy);

        if (giri.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-text">Nessun giro presente.<br>Clicca "+ Nuovo Giro" per iniziare.</div>
                </div>
            `;
            return;
        }

        let html = '';
        giri.forEach(giro => {
            const paesi = DataManager.getPaesiByGiro(giro.id);
            // Ordina paesi alfabeticamente
            paesi.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
            const isExpanded = this.expandedGiri.has(giro.id);

            html += `
                <div class="list-item" data-giro-id="${giro.id}">
                    <div class="list-item-color" style="background: ${giro.colore}"></div>
                    <div class="list-item-header" onclick="App.toggleGiro('${giro.id}')">
                        <div class="list-item-main">
                            <div class="list-item-title">
                                ${this.escapeHtml(giro.nome)}
                                ${giro.note ? '<span class="list-item-note-indicator" onclick="event.stopPropagation(); App.showNote(\'giro\', \'' + giro.id + '\')">📝</span>' : ''}
                            </div>
                            ${giro.spazio ? `<div class="spazio-badge">${this.escapeHtml(giro.spazio)}</div>` : ''}
                        </div>
                        <span class="list-item-badge">${paesi.length} paesi</span>
                        <div class="list-item-actions">
                            <button onclick="event.stopPropagation(); App.printGiro('${giro.id}')" title="Stampa">🖨️</button>
                            <button onclick="event.stopPropagation(); App.openGiroModal('${giro.id}')" title="Modifica">✏️</button>
                            <button onclick="event.stopPropagation(); App.confirmDeleteGiro('${giro.id}')" title="Elimina">🗑️</button>
                        </div>
                    </div>
                    <div class="giro-paesi ${isExpanded ? 'expanded' : ''}" id="paesi-${giro.id}">
                        ${paesi.length === 0 ? '<p style="color: var(--text-light); font-size: 0.9rem;">Nessun paese in questo giro</p>' : ''}
                        ${paesi.map(p => `
                            <div class="giro-paese-item">
                                <span class="giro-paese-name">
                                    ${this.escapeHtml(p.nome)}
                                    ${p.note ? '<span class="list-item-note-indicator" onclick="App.showNote(\'paese\', \'' + p.id + '\')">📝</span>' : ''}
                                </span>
                                <div class="list-item-actions">
                                    <button onclick="App.openPaeseModal('${p.id}')" title="Modifica">✏️</button>
                                    <button onclick="App.confirmDeletePaese('${p.id}')" title="Elimina">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                        <button class="btn-add" style="margin-top: 12px; width: 100%;" onclick="App.openPaeseModal(null, '${giro.id}')">
                            + Aggiungi paese a questo giro
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    sortGiri(giri, sortBy) {
        const sorted = [...giri];
        switch (sortBy) {
            case 'nome-asc':
                sorted.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
                break;
            case 'nome-desc':
                sorted.sort((a, b) => b.nome.localeCompare(a.nome, 'it'));
                break;
            case 'paesi-desc':
                sorted.sort((a, b) => DataManager.getPaesiByGiro(b.id).length - DataManager.getPaesiByGiro(a.id).length);
                break;
            case 'paesi-asc':
                sorted.sort((a, b) => DataManager.getPaesiByGiro(a.id).length - DataManager.getPaesiByGiro(b.id).length);
                break;
        }
        return sorted;
    },

    toggleGiro(id) {
        if (this.expandedGiri.has(id)) {
            this.expandedGiri.delete(id);
        } else {
            this.expandedGiri.add(id);
        }
        const el = document.getElementById('paesi-' + id);
        if (el) el.classList.toggle('expanded');
    },

    openGiroModal(id = null) {
        const modal = document.getElementById('modalGiro');
        const title = document.getElementById('modalGiroTitle');
        const form = document.getElementById('formGiro');

        form.reset();
        document.getElementById('giroColore').value = '#3498db';

        if (id) {
            const giro = DataManager.getGiro(id);
            if (giro) {
                title.textContent = 'Modifica Giro';
                document.getElementById('giroId').value = id;
                document.getElementById('giroNome').value = giro.nome;
                document.getElementById('giroSpazio').value = giro.spazio || '';
                document.getElementById('giroColore').value = giro.colore || '#3498db';
                document.getElementById('giroNote').value = giro.note || '';
            }
        } else {
            title.textContent = 'Nuovo Giro';
            document.getElementById('giroId').value = '';
        }

        this.openModal('modalGiro');
    },

    saveGiro(e) {
        e.preventDefault();

        const id = document.getElementById('giroId').value;
        const data = {
            nome: document.getElementById('giroNome').value.trim(),
            spazio: document.getElementById('giroSpazio').value.trim(),
            colore: document.getElementById('giroColore').value,
            note: document.getElementById('giroNote').value.trim()
        };

        if (id) {
            DataManager.updateGiro(id, data);
            this.showToast('Giro aggiornato', 'success');
        } else {
            DataManager.addGiro(data);
            this.showToast('Giro creato', 'success');
        }

        this.closeModal('modalGiro');
        this.renderGiri();
        this.updateGiroSelects();
        this.updateStats();
    },

    confirmDeleteGiro(id) {
        const giro = DataManager.getGiro(id);
        const paesiCount = DataManager.getPaesiByGiro(id).length;

        this.showConfirm(
            'Elimina Giro',
            `Vuoi eliminare "${giro.nome}"?${paesiCount > 0 ? `<br><br><strong>Attenzione:</strong> verranno eliminati anche ${paesiCount} paesi associati.` : ''}`,
            () => {
                DataManager.deleteGiro(id);
                this.showToast('Giro eliminato', 'success');
                this.renderGiri();
                this.updateGiroSelects();
                this.updateStats();
            }
        );
    },

    // === PAESI ===

    renderPaesi() {
        const container = document.getElementById('paesiList');
        let paesi = DataManager.getPaesi();

        // Filter by giro
        const filterGiro = document.getElementById('paesiFilterGiro').value;
        if (filterGiro) {
            paesi = paesi.filter(p => p.giroId === filterGiro);
        }

        // Sorting
        const sortBy = document.getElementById('paesiSort').value;
        paesi = this.sortPaesi(paesi, sortBy);

        if (paesi.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏘️</div>
                    <div class="empty-state-text">Nessun paese presente.<br>Clicca "+ Nuovo Paese" per iniziare.</div>
                </div>
            `;
            return;
        }

        let html = '';
        paesi.forEach(paese => {
            const giro = DataManager.getGiro(paese.giroId);

            html += `
                <div class="list-item">
                    <div class="list-item-color" style="background: ${giro ? giro.colore : '#607d8b'}"></div>
                    <div class="list-item-header">
                        <div class="list-item-main">
                            <div class="list-item-title">
                                ${this.escapeHtml(paese.nome)}
                                ${paese.note ? '<span class="list-item-note-indicator" onclick="App.showNote(\'paese\', \'' + paese.id + '\')">📝</span>' : ''}
                            </div>
                            <div class="list-item-subtitle">
                                ${giro ? this.escapeHtml(giro.nome) : '<em>Giro non assegnato</em>'}
                            </div>
                            ${giro && giro.spazio ? `<div class="spazio-badge">${this.escapeHtml(giro.spazio)}</div>` : ''}
                        </div>
                        <div class="list-item-actions">
                            <button onclick="App.openPaeseModal('${paese.id}')" title="Modifica">✏️</button>
                            <button onclick="App.confirmDeletePaese('${paese.id}')" title="Elimina">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    sortPaesi(paesi, sortBy) {
        const sorted = [...paesi];
        switch (sortBy) {
            case 'nome-asc':
                sorted.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
                break;
            case 'nome-desc':
                sorted.sort((a, b) => b.nome.localeCompare(a.nome, 'it'));
                break;
            case 'giro-asc':
                sorted.sort((a, b) => {
                    const giroA = DataManager.getGiro(a.giroId);
                    const giroB = DataManager.getGiro(b.giroId);
                    return (giroA?.nome || '').localeCompare(giroB?.nome || '', 'it');
                });
                break;
        }
        return sorted;
    },

    openPaeseModal(id = null, preselectedGiroId = null) {
        const modal = document.getElementById('modalPaese');
        const title = document.getElementById('modalPaeseTitle');
        const form = document.getElementById('formPaese');
        const giroSelect = document.getElementById('paeseGiro');

        form.reset();
        this.updateGiroSelects();

        if (id) {
            const paese = DataManager.getPaese(id);
            if (paese) {
                title.textContent = 'Modifica Paese';
                document.getElementById('paeseId').value = id;
                document.getElementById('paeseNome').value = paese.nome;
                giroSelect.value = paese.giroId;
                document.getElementById('paeseNote').value = paese.note || '';
            }
        } else {
            title.textContent = 'Nuovo Paese';
            document.getElementById('paeseId').value = '';
            if (preselectedGiroId) {
                giroSelect.value = preselectedGiroId;
            }
        }

        this.openModal('modalPaese');
    },

    savePaese(e) {
        e.preventDefault();

        const id = document.getElementById('paeseId').value;
        const data = {
            nome: document.getElementById('paeseNome').value.trim(),
            giroId: document.getElementById('paeseGiro').value,
            note: document.getElementById('paeseNote').value.trim()
        };

        if (id) {
            DataManager.updatePaese(id, data);
            this.showToast('Paese aggiornato', 'success');
        } else {
            DataManager.addPaese(data);
            this.showToast('Paese creato', 'success');
        }

        this.closeModal('modalPaese');
        this.renderGiri();
        this.renderPaesi();
        this.updateStats();
    },

    confirmDeletePaese(id) {
        const paese = DataManager.getPaese(id);

        this.showConfirm(
            'Elimina Paese',
            `Vuoi eliminare "${paese.nome}"?`,
            () => {
                DataManager.deletePaese(id);
                this.showToast('Paese eliminato', 'success');
                this.renderGiri();
                this.renderPaesi();
                this.updateStats();
            }
        );
    },

    // === NOTE ===

    renderNote() {
        const container = document.getElementById('noteList');
        const notes = DataManager.getAllNotes();

        if (notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">Nessuna nota presente.<br>Aggiungi note ai giri o ai paesi.</div>
                </div>
            `;
            return;
        }

        let html = '';
        notes.forEach((note, index) => {
            html += `
                <div class="note-item" style="border-left-color: ${note.color}">
                    <div class="note-item-source">${index + 1}. ${this.escapeHtml(note.source)}</div>
                    <div class="note-item-text">${this.escapeHtml(note.text)}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    showNote(type, id) {
        let note = '';
        let title = '';

        if (type === 'giro') {
            const giro = DataManager.getGiro(id);
            if (giro) {
                title = `Note: ${giro.nome}`;
                note = giro.note;
            }
        } else if (type === 'paese') {
            const paese = DataManager.getPaese(id);
            if (paese) {
                title = `Note: ${paese.nome}`;
                note = paese.note;
            }
        }

        if (note) {
            alert(`${title}\n\n${note}`);
        }
    },

    // === PRINT ===

    printGiro(id) {
        const giro = DataManager.getGiro(id);
        if (!giro) return;

        const paesi = DataManager.getPaesiByGiro(id);
        const preview = document.getElementById('printPreview');

        const now = new Date();
        const dateStr = now.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let html = `
            <div class="print-content" id="printableContent">
                <div class="print-header">
                    <h2>${this.escapeHtml(giro.nome)}</h2>
                    ${giro.spazio ? `<div class="spazio">${this.escapeHtml(giro.spazio)}</div>` : ''}
                </div>
                <ul class="print-list">
        `;

        if (paesi.length === 0) {
            html += '<li><em>Nessun paese in questo giro</em></li>';
        } else {
            paesi.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
            paesi.forEach((p, i) => {
                html += `
                    <li>
                        <span class="num">${i + 1}.</span>
                        <span>${this.escapeHtml(p.nome)}</span>
                        ${p.note ? `<span class="note">(${this.escapeHtml(p.note)})</span>` : ''}
                    </li>
                `;
            });
        }

        html += `
                </ul>
                <div class="print-footer">
                    <span>Totale: ${paesi.length} paesi</span>
                    <span>Stampato il: ${dateStr}</span>
                </div>
            </div>
        `;

        preview.innerHTML = html;
        this.openModal('modalPrint');
    },

    doPrint() {
        const content = document.getElementById('printableContent');
        if (!content) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stampa Giro</title>
                <style>
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 0;
                        margin: 0;
                        width: 210mm;
                        min-height: 297mm;
                    }
                    .print-header {
                        text-align: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .print-header h2 { margin: 0 0 5px; font-size: 18pt; }
                    .spazio { color: #666; font-size: 12pt; }
                    .print-list { list-style: none; padding: 0; margin: 0; }
                    .print-list li {
                        padding: 6px 0;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        gap: 10px;
                        font-size: 11pt;
                    }
                    .num { font-weight: bold; color: #666; min-width: 25px; }
                    .note { color: #888; font-style: italic; font-size: 10pt; }
                    .print-footer {
                        margin-top: 20px;
                        padding-top: 15px;
                        border-top: 1px solid #ddd;
                        display: flex;
                        justify-content: space-between;
                        color: #666;
                        font-size: 9pt;
                    }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    },

    // === EXPORT/IMPORT ===

    exportData() {
        const data = DataManager.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `corrieri_backup_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Archivio esportato', 'success');
    },

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = DataManager.importData(event.target.result);
            if (result.success) {
                this.showToast(`Importati ${result.stats.giri} giri e ${result.stats.paesi} paesi`, 'success');
                this.renderGiri();
                this.renderPaesi();
                this.updateGiroSelects();
                this.updateStats();
                this.closeModal('modalSettings');
            } else {
                this.showToast('Errore: ' + result.error, 'error');
            }
        };
        reader.readAsText(file);

        // Reset input
        e.target.value = '';
    },

    confirmClearData() {
        this.showConfirm(
            'Cancella tutti i dati',
            'Sei sicuro di voler cancellare TUTTI i dati? Questa azione non può essere annullata.',
            () => {
                DataManager.clearAll();
                this.showToast('Tutti i dati cancellati', 'success');
                this.renderGiri();
                this.renderPaesi();
                this.updateGiroSelects();
                this.updateStats();
                this.closeModal('modalSettings');
            }
        );
    },

    // === CLOUD SYNC ===

    async manualSyncCheck() {
        this.updateSyncIndicator('syncing', 'Verifica...');
        const status = await this.checkAndUpdateSyncStatus();

        if (status.status === 'outdated') {
            this.showToast('Ci sono aggiornamenti! Clicca Scarica.', 'warning');
        } else if (status.status === 'ahead') {
            this.showToast('Hai modifiche da caricare', 'warning');
        } else if (status.status === 'synced') {
            this.showToast('Tutto sincronizzato', 'success');
        }
    },

    async loadCloudInfo() {
        const infoText = document.getElementById('cloudInfoText');
        if (!infoText) return;

        infoText.textContent = 'Verifica stato...';

        const status = await DataManager.checkSyncStatus();

        if (status.status === 'error') {
            infoText.textContent = 'Impossibile contattare il cloud';
        } else {
            const localData = DataManager.getStats();
            const lastUpdate = localData.lastUpdate ? new Date(localData.lastUpdate).toLocaleString('it-IT') : 'Mai';

            let statusText = '';
            if (status.status === 'synced') {
                statusText = '<span style="color:#34d399;">Sincronizzato</span>';
            } else if (status.status === 'outdated') {
                statusText = '<span style="color:#fbbf24;">Aggiornamenti disponibili</span>';
            } else if (status.status === 'ahead') {
                statusText = '<span style="color:#60a5fa;">Modifiche da caricare</span>';
            }

            infoText.innerHTML = `
                Locale: ${localData.giri} giri, ${localData.paesi} paesi<br>
                Ultimo aggiornamento: ${lastUpdate}<br>
                Stato: ${statusText}
            `;
        }
    },

    async cloudDownload() {
        const btn = document.getElementById('btnCloudDownload');
        btn.classList.add('btn-loading');
        this.updateSyncIndicator('syncing', 'Scaricando...');

        const result = await DataManager.downloadFromCloud();

        btn.classList.remove('btn-loading');

        if (result.success) {
            this.showToast(`Scaricati ${result.stats.giri} giri e ${result.stats.paesi} paesi`, 'success');
            this.updateSyncIndicator('synced', 'Sincronizzato');
            this.renderGiri();
            this.renderPaesi();
            this.updateGiroSelects();
            this.updateStats();
            this.loadCloudInfo();
        } else {
            this.showToast('Errore download: ' + result.error, 'error');
            this.updateSyncIndicator('error', 'Errore');
        }
    },

    async cloudUpload() {
        const btn = document.getElementById('btnCloudUpload');
        btn.classList.add('btn-loading');
        this.updateSyncIndicator('syncing', 'Caricando...');

        const result = await DataManager.uploadToCloud();

        btn.classList.remove('btn-loading');

        if (result.success) {
            this.showToast('Dati caricati sul cloud!', 'success');
            this.updateSyncIndicator('synced', 'Sincronizzato');
            this.loadCloudInfo();
        } else {
            this.showToast('Errore upload: ' + result.error, 'error');
            this.updateSyncIndicator('error', 'Errore');
        }
    },

    // === UTILITIES ===

    updateGiroSelects() {
        const giri = DataManager.getGiri().sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

        // Paese form select
        const paeseGiroSelect = document.getElementById('paeseGiro');
        const currentValue = paeseGiroSelect.value;
        paeseGiroSelect.innerHTML = '<option value="">Seleziona un giro...</option>';
        giri.forEach(g => {
            paeseGiroSelect.innerHTML += `<option value="${g.id}">${this.escapeHtml(g.nome)}</option>`;
        });
        if (currentValue) paeseGiroSelect.value = currentValue;

        // Filter select
        const filterSelect = document.getElementById('paesiFilterGiro');
        const filterValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Tutti i giri</option>';
        giri.forEach(g => {
            filterSelect.innerHTML += `<option value="${g.id}">${this.escapeHtml(g.nome)}</option>`;
        });
        if (filterValue) filterSelect.value = filterValue;
    },

    updateStats() {
        const stats = DataManager.getStats();
        const el = document.getElementById('dataStats');
        el.innerHTML = `${stats.giri} giri, ${stats.paesi} paesi`;
        if (stats.lastUpdate) {
            const date = new Date(stats.lastUpdate).toLocaleString('it-IT');
            el.innerHTML += `<br>Ultimo aggiornamento: ${date}`;
        }
    },

    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    },

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    },

    showConfirm(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').innerHTML = message;
        this.confirmCallback = callback;
        this.openModal('modalConfirm');
    },

    showToast(message, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type;
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
