/**
 * Gestione Dati - LocalStorage, Export/Import e Sync Cloud
 */

const DataManager = {
    STORAGE_KEY: 'gestione_corrieri_data',

    // === CLOUD CREDENTIALS (HARDCODED) ===
    CLOUD_API_KEY: '$2a$10$PuojBCS6WcGp/7kmL5Z/euJwrKDmmU1MNkWpXajD0ieXk0lo/ME4O',
    CLOUD_BIN_ID: '69a07acc43b1c97be9a0e34e',

    // Struttura dati di default (vuota)
    getDefaultData() {
        return {
            giri: [],
            paesi: [],
            lastUpdate: null,
            version: '1.0'
        };
    },

    // Genera ID univoco
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Carica dati da localStorage
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Errore caricamento dati:', e);
        }
        return this.getDefaultData();
    },

    // Salva dati in localStorage
    save(data) {
        try {
            data.lastUpdate = new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Errore salvataggio dati:', e);
            return false;
        }
    },

    // === GIRI ===

    // Ottieni tutti i giri
    getGiri() {
        return this.load().giri;
    },

    // Ottieni un giro per ID
    getGiro(id) {
        return this.getGiri().find(g => g.id === id);
    },

    // Aggiungi nuovo giro
    addGiro(giro) {
        const data = this.load();
        const newGiro = {
            id: this.generateId(),
            nome: giro.nome,
            spazio: giro.spazio || '',
            colore: giro.colore || '#3498db',
            note: giro.note || '',
            createdAt: new Date().toISOString()
        };
        data.giri.push(newGiro);
        this.save(data);
        return newGiro;
    },

    // Modifica giro
    updateGiro(id, updates) {
        const data = this.load();
        const index = data.giri.findIndex(g => g.id === id);
        if (index !== -1) {
            data.giri[index] = { ...data.giri[index], ...updates };
            this.save(data);
            return data.giri[index];
        }
        return null;
    },

    // Elimina giro (e tutti i paesi associati)
    deleteGiro(id) {
        const data = this.load();
        data.giri = data.giri.filter(g => g.id !== id);
        data.paesi = data.paesi.filter(p => p.giroId !== id);
        this.save(data);
    },

    // === PAESI ===

    // Ottieni tutti i paesi
    getPaesi() {
        return this.load().paesi;
    },

    // Ottieni paesi di un giro
    getPaesiByGiro(giroId) {
        return this.getPaesi().filter(p => p.giroId === giroId);
    },

    // Ottieni un paese per ID
    getPaese(id) {
        return this.getPaesi().find(p => p.id === id);
    },

    // Aggiungi nuovo paese
    addPaese(paese) {
        const data = this.load();
        const newPaese = {
            id: this.generateId(),
            nome: paese.nome,
            giroId: paese.giroId,
            note: paese.note || '',
            createdAt: new Date().toISOString()
        };
        data.paesi.push(newPaese);
        this.save(data);
        return newPaese;
    },

    // Modifica paese
    updatePaese(id, updates) {
        const data = this.load();
        const index = data.paesi.findIndex(p => p.id === id);
        if (index !== -1) {
            data.paesi[index] = { ...data.paesi[index], ...updates };
            this.save(data);
            return data.paesi[index];
        }
        return null;
    },

    // Sposta paese in altro giro
    movePaese(paeseId, newGiroId) {
        return this.updatePaese(paeseId, { giroId: newGiroId });
    },

    // Elimina paese
    deletePaese(id) {
        const data = this.load();
        data.paesi = data.paesi.filter(p => p.id !== id);
        this.save(data);
    },

    // === RICERCA ===

    // Cerca in giri e paesi
    search(query) {
        const q = query.toLowerCase().trim();
        if (!q) return { giri: [], paesi: [] };

        const giri = this.getGiri().filter(g =>
            g.nome.toLowerCase().includes(q) ||
            g.spazio.toLowerCase().includes(q)
        );

        const paesi = this.getPaesi().filter(p =>
            p.nome.toLowerCase().includes(q)
        );

        return { giri, paesi };
    },

    // === NOTE ===

    // Ottieni tutti gli elementi con note
    getAllNotes() {
        const notes = [];

        this.getGiri().forEach(g => {
            if (g.note && g.note.trim()) {
                notes.push({
                    type: 'giro',
                    id: g.id,
                    source: `Giro: ${g.nome}`,
                    text: g.note,
                    color: g.colore
                });
            }
        });

        this.getPaesi().forEach(p => {
            if (p.note && p.note.trim()) {
                const giro = this.getGiro(p.giroId);
                notes.push({
                    type: 'paese',
                    id: p.id,
                    source: `${p.nome} (${giro ? giro.nome : 'N/D'})`,
                    text: p.note,
                    color: giro ? giro.colore : '#607d8b'
                });
            }
        });

        return notes;
    },

    // === STATISTICHE ===

    getStats() {
        const data = this.load();
        return {
            giri: data.giri.length,
            paesi: data.paesi.length,
            lastUpdate: data.lastUpdate
        };
    },

    // === EXPORT / IMPORT ===

    // Esporta tutti i dati come JSON
    exportData() {
        const data = this.load();
        data.exportedAt = new Date().toISOString();
        return JSON.stringify(data, null, 2);
    },

    // Importa dati da JSON
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // Validazione base
            if (!data.giri || !Array.isArray(data.giri)) {
                throw new Error('Formato non valido: manca array giri');
            }
            if (!data.paesi || !Array.isArray(data.paesi)) {
                throw new Error('Formato non valido: manca array paesi');
            }

            // Salva
            this.save(data);
            return { success: true, stats: this.getStats() };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // Cancella tutti i dati
    clearAll() {
        this.save(this.getDefaultData());
    },

    // === CLOUD SYNC (JSONBin.io) - AUTO CONFIGURED ===

    // Carica dati dal cloud (DOWNLOAD)
    async downloadFromCloud() {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${this.CLOUD_BIN_ID}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.CLOUD_API_KEY
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Errore download');
            }

            const result = await response.json();
            const cloudData = result.record;

            // Validazione
            if (!cloudData.giri || !cloudData.paesi) {
                throw new Error('Dati cloud non validi');
            }

            // Salva in locale
            this.save(cloudData);

            return {
                success: true,
                stats: this.getStats(),
                lastUpdate: cloudData.lastUpdate,
                cloudData: cloudData
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // Salva dati sul cloud (UPLOAD)
    async uploadToCloud() {
        try {
            const data = this.load();
            data.uploadedAt = new Date().toISOString();
            data.uploadedBy = this.getDeviceId();

            const response = await fetch(`https://api.jsonbin.io/v3/b/${this.CLOUD_BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.CLOUD_API_KEY
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Errore upload');
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // Ottieni info sul cloud (per confronto)
    async getCloudInfo() {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${this.CLOUD_BIN_ID}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.CLOUD_API_KEY
                }
            });

            if (!response.ok) {
                return null;
            }

            const result = await response.json();
            return {
                lastUpdate: result.record.lastUpdate,
                uploadedAt: result.record.uploadedAt,
                uploadedBy: result.record.uploadedBy,
                giri: result.record.giri?.length || 0,
                paesi: result.record.paesi?.length || 0
            };
        } catch (e) {
            return null;
        }
    },

    // Controlla se i dati locali sono sincronizzati con il cloud
    async checkSyncStatus() {
        try {
            const localData = this.load();
            const cloudInfo = await this.getCloudInfo();

            if (!cloudInfo) {
                return { status: 'error', message: 'Impossibile contattare il cloud' };
            }

            const localTime = localData.lastUpdate ? new Date(localData.lastUpdate).getTime() : 0;
            const cloudTime = cloudInfo.lastUpdate ? new Date(cloudInfo.lastUpdate).getTime() : 0;

            if (cloudTime > localTime) {
                return {
                    status: 'outdated',
                    message: 'Ci sono aggiornamenti disponibili',
                    cloudInfo: cloudInfo
                };
            } else if (localTime > cloudTime) {
                return {
                    status: 'ahead',
                    message: 'Hai modifiche non caricate',
                    cloudInfo: cloudInfo
                };
            } else {
                return {
                    status: 'synced',
                    message: 'Tutto sincronizzato',
                    cloudInfo: cloudInfo
                };
            }
        } catch (e) {
            return { status: 'error', message: e.message };
        }
    },

    // ID dispositivo (per sapere chi ha fatto l'ultima modifica)
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'device_' + this.generateId();
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }
};
