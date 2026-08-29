/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\services\api.js */

// =========================================================================
// TURSO DATABASE CONFIGURATION
// Paste your Turso database HTTP URL and Authentication Token below
// =========================================================================
const TURSO_URL = "https://uniflow-razn.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5MTQxNTYsImlkIjoiMDE5ZjFkYjQtMDMwMS03MzIzLTgwMTctZTU2ZThlYWQ4Y2RjIiwia2lkIjoiWS16TWJXcUJtTU9XVGRDWDFSaVo5MG82aGFmQVlIWV9Vb21ndjJHTjFRZyIsInJpZCI6IjU3MDdjMDY5LWRlM2UtNDhiZS1hNGI1LTY0MWU0OTMzMjU3OSJ9.tTcJ9qz6v2iFgy6Z4f-pfldcXyfbg09HIo9Dbv7TWjHjyMyMY7c4ZPfAW2dYlkIHPZ5p8BBzkVu7D20VnMnGBg";

const API = {
    localDb: null,
    initPromise: null,

    // Initialize in-memory SQLite database from Turso
    async initCache(force = false) {
        if (this.initPromise && !force) return this.initPromise;

        this.initPromise = (async () => {
            console.log("Initializing in-memory SQLite database cache...");
            const initSqlJs = window.initSqlJs;
            if (!initSqlJs) {
                throw new Error("sql.js is not loaded. Ensure the CDN script is loaded in index.html.");
            }

            // Load WASM from CDN
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            this.localDb = new SQL.Database();
            
            // Enable foreign keys
            this.localDb.run("PRAGMA foreign_keys = ON;");

            // Fetch schemas of all tables on Turso
            const tables = await this.queryOnTurso(
                "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );

            for (const table of tables) {
                const tableName = table.name;
                const createSql = table.sql;

                // Recreate table schema locally
                this.localDb.run(createSql);

                // Fetch all data from Turso to populate cache
                const rows = await this.queryOnTurso(`SELECT * FROM "${tableName}"`);
                if (rows.length > 0) {
                    const cols = Object.keys(rows[0]);
                    const placeholders = cols.map(() => '?').join(', ');
                    const insertSql = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

                    const stmt = this.localDb.prepare(insertSql);
                    for (const row of rows) {
                        const vals = cols.map(c => row[c]);
                        stmt.run(vals);
                    }
                    stmt.free();
                }
            }
            console.log("In-memory SQLite cache sync complete.");
        })();

        return this.initPromise;
    },

    // Force sync cache from Turso
    async forceSync() {
        await this.initCache(true);
    },

    // Execute statement (modifies data: INSERT, UPDATE, DELETE)
    async execute(sql, args = []) {
        const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(sql);

        // Make sure cache is loaded
        await this.initCache();

        if (isSelect) {
            // Run locally!
            try {
                const stmt = this.localDb.prepare(sql);
                stmt.bind(args);

                const rows = [];
                let colNames = [];
                if (stmt.step()) {
                    colNames = stmt.getColumnNames();
                    do {
                        rows.push(stmt.get());
                    } while (stmt.step());
                }
                stmt.free();

                // Build Hrana format compatible response
                const formattedCols = colNames.map(name => ({ name }));
                const formattedRows = rows.map(row => {
                    return row.map(val => {
                        if (val === null) return { type: "null", value: null };
                        if (typeof val === "number") {
                            if (Number.isInteger(val)) return { type: "integer", value: val.toString() };
                            return { type: "float", value: val };
                        }
                        return { type: "text", value: val.toString() };
                    });
                });

                return {
                    cols: formattedCols,
                    rows: formattedRows,
                    affected_row_count: 0,
                    last_insert_rowid: null
                };
            } catch (err) {
                console.error("Local SQLite execute failed:", sql, args, err);
                throw err;
            }
        } else {
            // Modifying statement: Execute on Turso and then on local Db cache
            const tursoResult = await this.executeOnTurso(sql, args);

            try {
                // Keep local cache in sync
                this.localDb.run(sql, args);
                
                // If it was an INSERT, set the last_insert_rowid locally on the result object
                if (/^\s*INSERT/i.test(sql) && tursoResult) {
                    // Get the last row ID from local DB
                    const lastIdRes = this.localDb.exec("SELECT last_insert_rowid()");
                    if (lastIdRes && lastIdRes[0] && lastIdRes[0].values[0]) {
                        tursoResult.last_insert_rowid = lastIdRes[0].values[0][0];
                    }
                }
            } catch (err) {
                console.error("Failed to sync modifying statement to local SQLite:", sql, args, err);
            }

            return tursoResult;
        }
    },

    // Raw execution on Turso Database Cloud
    async executeOnTurso(sql, args = []) {
        if (!TURSO_URL) {
            throw new Error("Database URL is not configured.");
        }

        const hranaArgs = args.map(arg => {
            if (arg === null || arg === undefined) {
                return { type: "null" };
            } else if (typeof arg === "number") {
                if (Number.isInteger(arg)) {
                    return { type: "integer", value: arg.toString() };
                } else {
                    return { type: "float", value: arg };
                }
            } else if (typeof arg === "boolean") {
                return { type: "integer", value: arg ? "1" : "0" };
            } else {
                return { type: "text", value: arg.toString() };
            }
        });

        const payload = {
            requests: [
                {
                    type: "execute",
                    stmt: { sql: sql, args: hranaArgs }
                },
                { type: "close" }
            ]
        };

        const response = await fetch(`${TURSO_URL}/v2/pipeline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TURSO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error("Empty response pipeline results.");
        }

        const executeResult = data.results[0];
        if (executeResult.type === "error") {
            throw new Error(executeResult.error.message);
        }

        return executeResult.response.result;
    },

    // Query helper for Turso (during initialization only)
    async queryOnTurso(sql, args = []) {
        const result = await this.executeOnTurso(sql, args);
        return this.mapResult(result);
    },

    // Query SQL statement - Returns array of mapped key-value row objects
    async query(sql, args = []) {
        const result = await this.execute(sql, args);
        return this.mapResult(result);
    },

    // Helper to map Hrana cols/rows structure to standard Javascript object arrays
    mapResult(result) {
        if (!result || !result.cols || !result.rows) return [];

        const colNames = result.cols.map(c => c.name);
        return result.rows.map(row => {
            const rowObj = {};
            row.forEach((cell, idx) => {
                const colName = colNames[idx];
                let cellVal = cell.value;

                // Parse SQLite datatypes
                if (cell.type === 'integer') {
                    cellVal = parseInt(cellVal, 10);
                } else if (cell.type === 'float') {
                    cellVal = parseFloat(cellVal);
                } else if (cell.type === 'null') {
                    cellVal = null;
                }
                rowObj[colName] = cellVal;
            });
            return rowObj;
        });
    },

    // Automatic Database Seeding (runs on startup if database is empty)
    async checkAndSeedDatabase() {
        if (!TURSO_URL) return;

        try {
            // Create folders and files tables if they do not exist
            await this.execute(`
                CREATE TABLE IF NOT EXISTS folders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    parent_id INTEGER,
                    path TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(parent_id) REFERENCES folders(id) ON DELETE CASCADE
                );
            `);

            await this.execute(`
                CREATE TABLE IF NOT EXISTS files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    folder_id INTEGER,
                    size INTEGER NOT NULL,
                    telegram_file_id TEXT,
                    telegram_message_id INTEGER,
                    file_url TEXT,
                    notes_content TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
                );
            `);

            // Check if transaction categories preset is loaded
            const checkCats = await this.query("SELECT COUNT(*) as count FROM transaction_categories");
            const catCount = checkCats[0] ? checkCats[0].count : 0;

            if (catCount === 0) {
                console.log("Seeding transaction categories preset...");
                const categories = [
                    ['Food & Dining', 'expense', 'utensils', '#ff6b6b'],
                    ['Rent & Housing', 'expense', 'home', '#4dabf7'],
                    ['Transport', 'expense', 'car', '#ffd43b'],
                    ['Books & Supplies', 'expense', 'book-open', '#51cf66'],
                    ['Entertainment', 'expense', 'film', '#f06595'],
                    ['Utilities & Bills', 'expense', 'zap', '#cc5de8'],
                    ['Subscriptions', 'expense', 'refresh-cw', '#845ef7'],
                    ['Other Expenses', 'expense', 'more-horizontal', '#adb5bd'],
                    ['Salary & Wages', 'income', 'briefcase', '#20c997'],
                    ['Allowance', 'income', 'gift', '#f783ac'],
                    ['Scholarship', 'income', 'award', '#339af0'],
                    ['Freelance Work', 'income', 'laptop', '#74c0fc']
                ];

                for (const cat of categories) {
                    await this.execute(
                        "INSERT INTO transaction_categories (name, type, icon, color) VALUES (?, ?, ?, ?)",
                        cat
                    );
                }
            }

            // Check if wallets count is 0
            const checkWallets = await this.query("SELECT COUNT(*) as count FROM wallets");
            const walletCount = checkWallets[0] ? checkWallets[0].count : 0;

            if (walletCount === 0) {
                console.log("Seeding initial default wallets...");
                await this.execute(
                    "INSERT INTO wallets (name, type, balance, color) VALUES (?, ?, ?, ?)",
                    ['Chase College checking', 'bank', 1250.00, 'gradient-bank']
                );
                await this.execute(
                    "INSERT INTO wallets (name, type, balance, color) VALUES (?, ?, ?, ?)",
                    ['Pocket Money', 'cash', 55.40, 'gradient-cash']
                );
                await this.execute(
                    "INSERT INTO wallets (name, type, balance, color) VALUES (?, ?, ?, ?)",
                    ['Savings Vault', 'savings', 500.00, 'gradient-savings']
                );
            }

            // Check if default settings are loaded
            const checkSettings = await this.query("SELECT COUNT(*) as count FROM settings");
            const settingsCount = checkSettings[0] ? checkSettings[0].count : 0;

            if (settingsCount === 0) {
                console.log("Seeding default system settings...");
                await this.execute("INSERT INTO settings (key_name, value_val) VALUES (?, ?)", ['dark_mode', '1']);
                await this.execute("INSERT INTO settings (key_name, value_val) VALUES (?, ?)", ['notifications_enabled', '1']);
                await this.execute("INSERT INTO settings (key_name, value_val) VALUES (?, ?)", ['monthly_budget', '600.00']);
                await this.execute("INSERT INTO settings (key_name, value_val) VALUES (?, ?)", ['savings_goal', '2000.00']);
                await this.execute("INSERT INTO settings (key_name, value_val) VALUES (?, ?)", ['user_name', 'Alex Mercer']);
                await this.execute("INSERT INTO settings (key_name, value_val) VALUES (?, ?)", ['user_university', 'Pacific Tech University']);
                await this.execute("INSERT INTO settings (key_name, value_val) VALUES (?, ?)", ['prayer_zone', 'WLY01']);
            }

        } catch (e) {
            console.error("Database check/seeding failed: ", e);
        }
    },

    // UI Loading Helper Skeletons
    showSkeletons(parentSelector, skeletonCount = 3) {
        const container = document.querySelector(parentSelector);
        if (!container) return;

        let skeletonHTML = '';
        for (let i = 0; i < skeletonCount; i++) {
            skeletonHTML += `
                <div class="card skeleton-card skeleton">
                    <div class="skeleton-title skeleton"></div>
                    <div class="skeleton-text skeleton" style="width: 85%;"></div>
                    <div class="skeleton-text skeleton" style="width: 50%;"></div>
                </div>
            `;
        }
        container.innerHTML = skeletonHTML;
    }
};
