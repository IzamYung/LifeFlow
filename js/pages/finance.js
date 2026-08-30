/* UniFlow */

const FinancePage = {
    wallets: [],
    categories: [],
    transactions: [],
    analytics: [],
    
    filters: {
        q: '',
        category_id: '',
        wallet_id: '',
        type: ''
    },

    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="finance-page">
                <!-- Header -->
                <div class="dashboard-header">
                    <div class="welcome-section">
                        <h2>My Wallet</h2>
                        <p>Track cash, bank balances, and savings plans.</p>
                    </div>
                </div>

                <!-- Wallet Carousel -->
                <div class="wallet-carousel" id="wallets-carousel-list">
                    <!-- Loaded dynamically -->
                </div>

                <!-- Search & Filters controls -->
                <div class="finance-controls">
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="tx-search-input" placeholder="Search transactions..." value="${this.filters.q}">
                    </div>
                    
                    <div class="filter-pills-bar" id="type-pills-bar">
                        <div class="filter-pill ${this.filters.type === '' ? 'active' : ''}" data-type="">All Logs</div>
                        <div class="filter-pill ${this.filters.type === 'expense' ? 'active' : ''}" data-type="expense">Expenses</div>
                        <div class="filter-pill ${this.filters.type === 'income' ? 'active' : ''}" data-type="income">Income</div>
                        <div class="filter-pill ${this.filters.type === 'transfer' ? 'active' : ''}" data-type="transfer">Transfers</div>
                    </div>

                    <div class="filter-pills-bar" id="category-pills-bar" style="margin-top: -4px;">
                        <!-- Category pills loaded dynamically -->
                    </div>
                </div>

                <div class="analytics-grid">
                    <!-- History Ledger -->
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <h4 style="font-family:var(--font-heading); margin-bottom:4px;">Transaction History</h4>
                        <div class="transaction-ledger" id="tx-ledger-list">
                            <!-- Loaded dynamically -->
                        </div>
                    </div>

                    <!-- Category analytics -->
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <h4 style="font-family:var(--font-heading); margin-bottom:4px;">Monthly Spending Analytics</h4>
                        <div class="card" id="finance-chart-card">
                            <!-- Loaded dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('finance-page');
            if (page) page.classList.add('active');
        }, 50);

        // Bind FAB shortcut
        const fabBtn = document.getElementById('fab-action-transaction');
        if (fabBtn) {
            fabBtn.onclick = () => Forms.showAddTransaction(this.wallets, this.categories, () => this.refreshData());
        }

        await this.loadFinanceData();
        this.bindEvents();
    },

    async loadFinanceData() {
        try {
            // 1. Fetch Wallets
            this.wallets = await API.query("SELECT id, name, type, balance, color FROM wallets ORDER BY id ASC");

            // 2. Fetch Categories
            this.categories = await API.query("SELECT id, name, type, icon, color FROM transaction_categories ORDER BY type DESC, name ASC");

            // 3. Build filtered Transactions SQL
            let sql = `
                SELECT t.id, t.wallet_id, t.category_id, t.type, t.amount, t.description, t.transaction_date, t.transfer_wallet_id,
                       w.name as wallet_name, c.name as category_name, c.icon as category_icon, c.color as category_color,
                       tw.name as transfer_wallet_name
                FROM transactions t
                LEFT JOIN wallets w ON t.wallet_id = w.id
                LEFT JOIN transaction_categories c ON t.category_id = c.id
                LEFT JOIN wallets tw ON t.transfer_wallet_id = tw.id
                WHERE 1=1
            `;
            
            const params = [];

            if (this.filters.q) {
                sql += " AND (t.description LIKE ? OR c.name LIKE ?)";
                params.push(`%${this.filters.q}%`, `%${this.filters.q}%`);
            }
            if (this.filters.category_id) {
                sql += " AND t.category_id = ?";
                params.push(parseInt(this.filters.category_id, 10));
            }
            if (this.filters.wallet_id) {
                sql += " AND (t.wallet_id = ? OR t.transfer_wallet_id = ?)";
                params.push(parseInt(this.filters.wallet_id, 10), parseInt(this.filters.wallet_id, 10));
            }
            if (this.filters.type) {
                sql += " AND t.type = ?";
                params.push(this.filters.type);
            }

            sql += " ORDER BY t.transaction_date DESC, t.id DESC";
            this.transactions = await API.query(sql, params);

            // 4. Fetch Month spending breakdown
            this.analytics = await API.query(`
                SELECT c.name as category, SUM(t.amount) as value, c.color
                FROM transactions t
                JOIN transaction_categories c ON t.category_id = c.id
                WHERE t.type = 'expense'
                  AND strftime('%m', t.transaction_date) = strftime('%m', 'now')
                  AND strftime('%Y', t.transaction_date) = strftime('%Y', 'now')
                GROUP BY c.id, c.name, c.color
                ORDER BY value DESC
            `);

            this.renderWallets();
            this.renderCategoryFilterPills();
            this.renderTransactions();
            this.renderAnalytics();

        } catch (err) {
            console.error('Failed to load wallet ledger data: ' + err.message);
        }
    },

    async refreshData() {
        await this.loadFinanceData();
    },

    renderWallets() {
        const carousel = document.getElementById('wallets-carousel-list');
        if (!carousel) return;

        let html = this.wallets.map(w => {
            const iconSymbol = w.type === 'savings' ? '⭐' : w.type === 'bank' ? '🏦' : '💵';
            const isActiveFilter = this.filters.wallet_id === w.id.toString() ? 'border: 3px solid var(--primary);' : '';
            return `
                <div class="wallet-card ${w.color}" style="${isActiveFilter}" onclick="FinancePage.showEditWalletForm(${JSON.stringify(w).replace(/"/g, '&quot;')})">
                    <div class="card-top">
                        <div class="wallet-chip"></div>
                        <div class="wallet-provider">${iconSymbol} ${w.type.toUpperCase()}</div>
                    </div>
                    <div class="wallet-card-balance">$${parseFloat(w.balance).toFixed(2)}</div>
                    <div class="wallet-card-name">${w.name}</div>
                </div>
            `;
        }).join('');

        html += `
            <div class="wallet-card gradient-custom" style="display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0.85;" onclick="FinancePage.showAddWalletForm()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:36px; height:36px; margin-bottom:8px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <div style="font-size:13px; font-weight:700; font-family:var(--font-heading);">ADD WALLET</div>
            </div>
        `;

        carousel.innerHTML = html;
    },

    renderCategoryFilterPills() {
        const bar = document.getElementById('category-pills-bar');
        if (!bar) return;

        let html = `<div class="filter-pill ${this.filters.category_id === '' ? 'active' : ''}" data-cat-id="">All Categories</div>`;
        const currentType = this.filters.type || 'expense';
        const filteredCats = this.categories.filter(c => c.type === currentType);

        html += filteredCats.map(c => {
            const isActive = this.filters.category_id === c.id.toString() ? 'active' : '';
            return `<div class="filter-pill ${isActive}" data-cat-id="${c.id}">${c.name}</div>`;
        }).join('');

        bar.innerHTML = html;
    },

    renderTransactions() {
        const list = document.getElementById('tx-ledger-list');
        if (!list) return;

        if (this.transactions.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <h5>No transaction history</h5>
                    <p>Try clearing active filters or logging your first transaction.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.transactions.map(t => {
            const dateStr = new Date(t.transaction_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            
            let valPrefix = '-';
            let valClass = 'expense';
            let categoryName = t.category_name || 'Transfer';
            let subtitle = t.description;

            if (t.type === 'income') {
                valPrefix = '+';
                valClass = 'income';
            } else if (t.type === 'transfer') {
                valPrefix = '⇄';
                valClass = 'transfer';
                categoryName = 'Transfer Funds';
                subtitle = `From ${t.wallet_name} to ${t.transfer_wallet_name}`;
            }

            const catColor = t.category_color || 'var(--primary)';
            const iconHTML = t.type === 'transfer' ? 
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 8 16 13"/><line x1="21" y1="8" x2="9" y2="8"/><polyline points="8 21 3 16 8 11"/><line x1="3" y1="16" x2="15" y2="16"/></svg>` : 
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`;

            return `
                <div class="transaction-item ripple-container" onclick="FinancePage.confirmDeleteTransaction('${t.id}')">
                    <div class="tx-left">
                        <div class="tx-icon-box" style="background:${catColor};">
                            ${iconHTML}
                        </div>
                        <div class="tx-info">
                            <div class="tx-desc">${categoryName}</div>
                            <div class="tx-date">${subtitle} • ${dateStr}</div>
                        </div>
                    </div>
                    <div class="tx-right">
                        <div class="tx-amount ${valClass}">${valPrefix}$${parseFloat(t.amount).toFixed(2)}</div>
                        <div class="tx-wallet-tag">${t.wallet_name}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderAnalytics() {
        const container = document.getElementById('finance-chart-card');
        if (!container) return;

        if (this.analytics.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    <h5>No monthly expenses recorded</h5>
                    <p>Analytics reports will appear once expenses are logged.</p>
                </div>
            `;
            return;
        }

        const totalExpense = this.analytics.reduce((acc, c) => acc + parseFloat(c.value), 0);

        const rowsHTML = this.analytics.map(c => {
            const pct = Math.round((c.value / totalExpense) * 100);
            return `
                <div class="legend-item" style="margin-bottom:12px;">
                    <div style="flex:1;">
                        <div class="legend-color-label">
                            <div class="legend-color-dot" style="background:${c.color};"></div>
                            <span>${c.category} <b>(${pct}%)</b></span>
                        </div>
                        <div class="progress-track" style="margin-top:6px; height:8px;">
                            <div class="progress-fill" style="background:${c.color}; width:${pct}%;"></div>
                        </div>
                    </div>
                    <div class="legend-val" style="margin-left:16px; padding-top:16px;">$${parseFloat(c.value).toFixed(2)}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:20px;">
                <div class="donut-chart-box">
                    <svg width="140" height="140" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" stroke-width="4"></circle>
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" stroke-width="4" stroke-dasharray="100, 100" stroke-linecap="round"></circle>
                    </svg>
                    <div class="donut-center-text">
                        <div class="donut-center-val">$${totalExpense.toFixed(2)}</div>
                        <div class="donut-center-lbl">MONTH SPENT</div>
                    </div>
                </div>
                <div class="category-legend">
                    ${rowsHTML}
                </div>
            </div>
        `;
    },

    toggleWalletFilter(walletId) {
        if (this.filters.wallet_id === walletId) {
            this.filters.wallet_id = '';
        } else {
            this.filters.wallet_id = walletId;
        }
        this.loadFinanceData();
    },

    showAddWalletForm() {
        const html = `
            <form id="form-wallet" class="settings-form">
                <div class="form-group">
                    <label for="wl-name">Wallet Name</label>
                    <input type="text" id="wl-name" name="name" placeholder="e.g. Chase Saving, Cash Cash" required>
                </div>

                <div class="form-group">
                    <label for="wl-type">Account Type</label>
                    <select id="wl-type" name="type" required>
                        <option value="bank">Bank / Checking</option>
                        <option value="cash">Cash / Physical</option>
                        <option value="savings">Savings Vault</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="wl-balance">Initial Balance ($)</label>
                    <input type="number" id="wl-balance" name="balance" step="0.01" value="0.00" min="0" required>
                </div>

                <div class="form-group">
                    <label>Wallet Theme</label>
                    <div style="display: flex; gap: 10px; margin-top: 6px;">
                        <label><input type="radio" name="color" value="gradient-bank" checked> <span style="background:linear-gradient(135deg, #1e3c72, #2a5298); width:24px; height:16px; display:inline-block; border-radius:3px;"></span></label>
                        <label><input type="radio" name="color" value="gradient-cash"> <span style="background:linear-gradient(135deg, #0ba360, #3cba92); width:24px; height:16px; display:inline-block; border-radius:3px;"></span></label>
                        <label><input type="radio" name="color" value="gradient-savings"> <span style="background:linear-gradient(135deg, #f77062, #fe5196); width:24px; height:16px; display:inline-block; border-radius:3px;"></span></label>
                        <label><input type="radio" name="color" value="gradient-custom"> <span style="background:linear-gradient(135deg, #845ef7, #cc5de8); width:24px; height:16px; display:inline-block; border-radius:3px;"></span></label>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Wallet</button>
                </div>
            </form>
        `;

        Modal.open('Add Account Wallet', html, (container) => {
            const form = container.querySelector('#form-wallet');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('wl-name').value.trim();
                const type = document.getElementById('wl-type').value;
                const balance = parseFloat(document.getElementById('wl-balance').value);
                const color = form.elements['color'].value;

                try {
                    await API.execute("INSERT INTO wallets (name, type, balance, color) VALUES (?, ?, ?, ?)", [name, type, balance, color]);
                    Modal.close();
                    this.loadFinanceData();
                } catch (err) {
                    alert('Create failed: ' + err.message);
                }
            });
        });
    },

    showEditWalletForm(wallet) {
        const html = `
            <form id="form-edit-wallet" class="settings-form">
                <div class="form-group">
                    <label for="wle-name">Wallet Name</label>
                    <input type="text" id="wle-name" name="name" value="${wallet.name}" required>
                </div>

                <div class="form-group">
                    <label for="wle-type">Account Type</label>
                    <select id="wle-type" name="type" required>
                        <option value="bank" ${wallet.type === 'bank' ? 'selected' : ''}>Bank / Checking</option>
                        <option value="cash" ${wallet.type === 'cash' ? 'selected' : ''}>Cash / Physical</option>
                        <option value="savings" ${wallet.type === 'savings' ? 'selected' : ''}>Savings Vault</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="wle-balance">Balance ($)</label>
                    <input type="number" id="wle-balance" name="balance" step="0.01" value="${parseFloat(wallet.balance).toFixed(2)}" required>
                </div>

                <div class="form-group">
                    <label>Wallet Theme</label>
                    <div style="display: flex; gap: 10px; margin-top: 6px;">
                        <label><input type="radio" name="color" value="gradient-bank" ${wallet.color === 'gradient-bank' ? 'checked' : ''}> <span style="background:linear-gradient(135deg, #1e3c72, #2a5298); width:24px; height:16px; display:inline-block; border-radius:3px;"></span></label>
                        <label><input type="radio" name="color" value="gradient-cash" ${wallet.color === 'gradient-cash' ? 'checked' : ''}> <span style="background:linear-gradient(135deg, #0ba360, #3cba92); width:24px; height:16px; display:inline-block; border-radius:3px;"></span></label>
                        <label><input type="radio" name="color" value="gradient-savings" ${wallet.color === 'gradient-savings' ? 'checked' : ''}> <span style="background:linear-gradient(135deg, #f77062, #fe5196); width:24px; height:16px; display:inline-block; border-radius:3px;"></span></label>
                        <label><input type="radio" name="color" value="gradient-custom" ${wallet.color === 'gradient-custom' ? 'checked' : ''}> <span style="background:linear-gradient(135deg, #845ef7, #cc5de8); width:24px; height:16px; display:inline-block; border-radius:3px;"></span></label>
                    </div>
                </div>

                <div class="form-actions" style="display:flex; justify-content:space-between; margin-top:20px;">
                    <button type="button" class="btn btn-danger" id="btn-delete-wallet">Remove Wallet</button>
                    <div style="display:flex; gap:8px;">
                        <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </div>
            </form>
        `;

        Modal.open('Manage Wallet', html, (container) => {
            const form = container.querySelector('#form-edit-wallet');
            const btnDelete = container.querySelector('#btn-delete-wallet');

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('wle-name').value.trim();
                const type = document.getElementById('wle-type').value;
                const balance = parseFloat(document.getElementById('wle-balance').value);
                const color = form.elements['color'].value;

                try {
                    await API.execute("UPDATE wallets SET name = ?, type = ?, balance = ?, color = ? WHERE id = ?",
                        [name, type, balance, color, wallet.id]);
                    Modal.close();
                    this.loadFinanceData();
                } catch (err) {
                    alert('Update failed: ' + err.message);
                }
            });

            btnDelete.addEventListener('click', async () => {
                if (confirm('Are you sure you want to remove this wallet? All associated transactions will also be deleted.')) {
                    try {
                        await API.execute("DELETE FROM transactions WHERE wallet_id = ? OR transfer_wallet_id = ?", [wallet.id, wallet.id]);
                        await API.execute("DELETE FROM wallets WHERE id = ?", [wallet.id]);
                        Modal.close();
                        this.loadFinanceData();
                    } catch (err) {
                        alert('Deletion failed: ' + err.message);
                    }
                }
            });
        });
    },

    async confirmDeleteTransaction(txId) {
        if (confirm('Delete this transaction? The wallet balances will adjust back.')) {
            try {
                const txArr = await API.query("SELECT * FROM transactions WHERE id = ?", [parseInt(txId, 10)]);
                const tx = txArr[0];
                if (!tx) throw new Error("Transaction record not found.");

                // Revert balances
                if (tx.type === 'income') {
                    await API.execute("UPDATE wallets SET balance = balance - ? WHERE id = ?", [tx.amount, tx.wallet_id]);
                } else if (tx.type === 'expense') {
                    await API.execute("UPDATE wallets SET balance = balance + ? WHERE id = ?", [tx.amount, tx.wallet_id]);
                } else if (tx.type === 'transfer') {
                    await API.execute("UPDATE wallets SET balance = balance + ? WHERE id = ?", [tx.amount, tx.wallet_id]);
                    if (tx.transfer_wallet_id) {
                        await API.execute("UPDATE wallets SET balance = balance - ? WHERE id = ?", [tx.amount, tx.transfer_wallet_id]);
                    }
                }

                // Delete transaction
                await API.execute("DELETE FROM transactions WHERE id = ?", [parseInt(txId, 10)]);
                this.loadFinanceData();
            } catch (err) {
                alert('Action failed: ' + err.message);
            }
        }
    },

    bindEvents() {
        const searchInput = document.getElementById('tx-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.q = e.target.value;
                if (this.searchTimeout) clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => this.loadFinanceData(), 400);
            });
        }

        const typePills = document.querySelectorAll('#type-pills-bar .filter-pill');
        typePills.forEach(pill => {
            pill.addEventListener('click', () => {
                typePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                
                this.filters.type = pill.dataset.type;
                this.filters.category_id = ''; 
                this.loadFinanceData();
            });
        });

        const catBar = document.getElementById('category-pills-bar');
        if (catBar) {
            catBar.addEventListener('click', (e) => {
                const pill = e.target.closest('.filter-pill');
                if (!pill) return;

                const pills = catBar.querySelectorAll('.filter-pill');
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                this.filters.category_id = pill.dataset.catId;
                this.loadFinanceData();
            });
        }
    }
};
