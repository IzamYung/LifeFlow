/* UniFlow */

const Forms = {
    // -------------------------------------------------------------------------
    // 1. TRANSACTION ADD FORM
    // -------------------------------------------------------------------------
    showAddTransaction(wallets, categories, onSaveSuccess) {
        const walletsOptions = wallets.map(w => `<option value="${w.id}">${w.name} ($${parseFloat(w.balance).toFixed(2)})</option>`).join('');
        
        const html = `
            <form id="form-transaction" class="settings-form">
                <div class="form-group">
                    <label for="tx-type">Transaction Type</label>
                    <select id="tx-type" name="type" required>
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                        <option value="transfer">Transfer (Between Wallets)</option>
                    </select>
                </div>

                <div class="form-group" id="group-source-wallet">
                    <label for="tx-wallet">Wallet / Account</label>
                    <select id="tx-wallet" name="wallet_id" required>
                        ${walletsOptions}
                    </select>
                </div>

                <div class="form-group" id="group-dest-wallet" style="display: none;">
                    <label for="tx-transfer-wallet">Destination Wallet</label>
                    <select id="tx-transfer-wallet" name="transfer_wallet_id">
                        <option value="">-- Select Destination --</option>
                        ${walletsOptions}
                    </select>
                </div>

                <div class="form-group" id="group-category">
                    <label for="tx-category">Category</label>
                    <select id="tx-category" name="category_id" required>
                        <!-- Populated dynamically -->
                    </select>
                </div>

                <div class="form-group">
                    <label for="tx-amount">Amount ($)</label>
                    <input type="number" id="tx-amount" name="amount" step="0.01" min="0.01" placeholder="0.00" required>
                </div>

                <div class="form-group">
                    <label for="tx-desc">Description</label>
                    <input type="text" id="tx-desc" name="description" placeholder="e.g. Groceries, Allowance, Rent" required>
                </div>

                <div class="form-group">
                    <label for="tx-date">Date & Time</label>
                    <input type="datetime-local" id="tx-date" name="transaction_date" required>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Transaction</button>
                </div>
            </form>
        `;

        Modal.open('Add Transaction', html, (container) => {
            const form = container.querySelector('#form-transaction');
            const typeSelect = container.querySelector('#tx-type');
            const catSelect = container.querySelector('#tx-category');
            const destGroup = container.querySelector('#group-dest-wallet');
            const destSelect = container.querySelector('#tx-transfer-wallet');
            const dateInput = container.querySelector('#tx-date');

            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            dateInput.value = now.toISOString().slice(0, 16);

            const updateCategories = () => {
                const type = typeSelect.value;
                if (type === 'transfer') {
                    destGroup.style.display = 'block';
                    destSelect.setAttribute('required', 'required');
                    container.querySelector('#group-category').style.display = 'none';
                    catSelect.removeAttribute('required');
                } else {
                    destGroup.style.display = 'none';
                    destSelect.removeAttribute('required');
                    container.querySelector('#group-category').style.display = 'block';
                    catSelect.setAttribute('required', 'required');
                    
                    const filtered = categories.filter(c => c.type === type);
                    catSelect.innerHTML = filtered.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                }
            };

            typeSelect.addEventListener('change', updateCategories);
            updateCategories();

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const type = typeSelect.value;
                const wallet_id = parseInt(document.getElementById('tx-wallet').value, 10);
                const transfer_wallet_id = destSelect.value ? parseInt(destSelect.value, 10) : null;
                const category_id = catSelect.value ? parseInt(catSelect.value, 10) : null;
                const amount = parseFloat(document.getElementById('tx-amount').value);
                const description = document.getElementById('tx-desc').value.trim();
                const transaction_date = dateInput.value.replace('T', ' ') + ':00'; // Format for SQLite datetime

                try {
                    // Check wallet balance existence
                    const wChk = await API.query("SELECT id FROM wallets WHERE id = ?", [wallet_id]);
                    if (wChk.length === 0) throw new Error("Source wallet not found.");

                    if (type === 'transfer') {
                        if (!transfer_wallet_id) throw new Error("Destination wallet is required.");
                        const wChkDest = await API.query("SELECT id FROM wallets WHERE id = ?", [transfer_wallet_id]);
                        if (wChkDest.length === 0) throw new Error("Destination wallet not found.");
                    }

                    // 1. Insert transaction record
                    await API.execute("INSERT INTO transactions (wallet_id, category_id, type, amount, description, transaction_date, transfer_wallet_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [wallet_id, category_id, type, amount, description, transaction_date, transfer_wallet_id]);

                    // 2. Update wallet balance values
                    if (type === 'income') {
                        await API.execute("UPDATE wallets SET balance = balance + ? WHERE id = ?", [amount, wallet_id]);
                    } else if (type === 'expense') {
                        await API.execute("UPDATE wallets SET balance = balance - ? WHERE id = ?", [amount, wallet_id]);
                    } else if (type === 'transfer') {
                        await API.execute("UPDATE wallets SET balance = balance - ? WHERE id = ?", [amount, wallet_id]);
                        await API.execute("UPDATE wallets SET balance = balance + ? WHERE id = ?", [amount, transfer_wallet_id]);
                    }

                    Modal.close();
                    onSaveSuccess();
                } catch (err) {
                    alert('Submission failed: ' + err.message);
                }
            });
        });
    },

    // -------------------------------------------------------------------------
    // 2. SCHEDULE ADD EVENT FORM
    // -------------------------------------------------------------------------
    showAddEvent(onSaveSuccess) {
        const html = `
            <form id="form-event" class="settings-form">
                <div class="form-group">
                    <label for="ev-type">Type</label>
                    <select id="ev-type" name="type" required>
                        <option value="class">Class / Lecture</option>
                        <option value="exam">Exam</option>
                        <option value="meeting">Meeting / Group study</option>
                        <option value="event">Social Event / Other</option>
                    </select>
                </div>

                <!-- Subject picker: only visible when type = class -->
                <div class="form-group" id="ev-subject-group" style="overflow:visible; max-height:0; opacity:0; margin-bottom:0; transition:max-height 0.32s ease, opacity 0.25s ease, margin-bottom 0.3s ease;">
                    <label style="margin-bottom:4px; display:block; font-size:13px; font-weight:700; color:var(--text-secondary);">Subject</label>
                    <div style="position:relative;">
                        <input type="text" id="ev-title" name="title" placeholder="Type or pick a subject..." autocomplete="off"
                            style="width:100%; box-sizing:border-box; padding-right:38px;">
                        <button type="button" id="ev-subj-toggle" tabindex="-1"
                            style="position:absolute;right:0;top:0;bottom:0;width:38px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);">
                            <svg id="ev-subj-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;transition:transform 0.25s ease;">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <div id="ev-subj-dropdown" style="position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:999;background:var(--surface-variant);border:1px solid var(--border-color);border-radius:var(--radius-md);box-shadow:0 8px 24px rgba(0,0,0,0.18);overflow:hidden;max-height:0;opacity:0;transition:max-height 0.28s ease,opacity 0.2s ease;pointer-events:none;">
                            <div id="ev-subj-list" style="overflow-y:auto;max-height:190px;padding:4px 0;"></div>
                        </div>
                    </div>
                </div>

                <!-- Free-text title for non-class types -->
                <div class="form-group" id="ev-title-group" style="display:none;">
                    <label for="ev-title-free">Event Title</label>
                    <input type="text" id="ev-title-free" placeholder="e.g. Midterm Exam, Study Group" autocomplete="off">
                </div>

                <div class="form-group">
                    <label for="ev-location">Location</label>
                    <input type="text" id="ev-location" name="location" placeholder="e.g. Hall of Science, Library Room 4">
                </div>

                <div class="form-group">
                    <label for="ev-start">Start Date &amp; Time</label>
                    <input type="datetime-local" id="ev-start" name="start_time" required>
                </div>

                <div class="form-group">
                    <label for="ev-end">End Date &amp; Time</label>
                    <input type="datetime-local" id="ev-end" name="end_time" required>
                </div>

                <div class="form-group">
                    <label for="ev-desc">Notes / Description</label>
                    <textarea id="ev-desc" name="description" rows="3" placeholder="Chapters to review, study partners..."></textarea>
                </div>

                <div class="form-group">
                    <label for="ev-recur">Recurrence</label>
                    <select id="ev-recur" name="recurrence">
                        <option value="none">One-time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                    <div id="ev-recur-box" class="recurrence-expand-box">
                        <div style="background:var(--surface-variant);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:12px;">
                            <label for="ev-recur-count" id="ev-recur-count-label" style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:4px;display:block;">Repeat For (How many days?):</label>
                            <input type="number" id="ev-recur-count" name="recur_count" min="2" max="60" value="7" style="width:100%;min-height:38px;padding:8px 12px;font-size:13px;font-weight:600;">
                            <p id="ev-recur-hint" style="font-size:11px;color:var(--text-secondary);margin-top:6px;line-height:1.3;">Will create 7 daily sessions automatically.</p>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Label Color</label>
                    <div style="display:flex;gap:10px;margin-top:6px;" id="ev-color-group">
                        <label><input type="radio" name="color" value="#8b5cf6" checked> <span style="background:#8b5cf6;width:16px;height:16px;display:inline-block;border-radius:50%;vertical-align:middle;"></span></label>
                        <label><input type="radio" name="color" value="#3b82f6"> <span style="background:#3b82f6;width:16px;height:16px;display:inline-block;border-radius:50%;vertical-align:middle;"></span></label>
                        <label><input type="radio" name="color" value="#10b981"> <span style="background:#10b981;width:16px;height:16px;display:inline-block;border-radius:50%;vertical-align:middle;"></span></label>
                        <label><input type="radio" name="color" value="#f59e0b"> <span style="background:#f59e0b;width:16px;height:16px;display:inline-block;border-radius:50%;vertical-align:middle;"></span></label>
                        <label><input type="radio" name="color" value="#ef4444"> <span style="background:#ef4444;width:16px;height:16px;display:inline-block;border-radius:50%;vertical-align:middle;"></span></label>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Event</button>
                </div>
            </form>
        `;

        Modal.open('Add Schedule Event', html, async (container) => {
            const form            = container.querySelector('#form-event');
            const typeSelect      = container.querySelector('#ev-type');
            const subjectGroup    = container.querySelector('#ev-subject-group');
            const titleGroup      = container.querySelector('#ev-title-group');
            const titleInput      = container.querySelector('#ev-title');
            const titleFree       = container.querySelector('#ev-title-free');
            const toggleBtn       = container.querySelector('#ev-subj-toggle');
            const chevron         = container.querySelector('#ev-subj-chevron');
            const dropdown        = container.querySelector('#ev-subj-dropdown');
            const subjList        = container.querySelector('#ev-subj-list');
            const startInput      = container.querySelector('#ev-start');
            const endInput        = container.querySelector('#ev-end');
            const recurSelect     = container.querySelector('#ev-recur');
            const recurBox        = container.querySelector('#ev-recur-box');
            const recurCountInput = container.querySelector('#ev-recur-count');
            const recurCountLabel = container.querySelector('#ev-recur-count-label');
            const recurHint       = container.querySelector('#ev-recur-hint');

            let attSubjs = [];
            let dropdownOpen = false;

            try {
                attSubjs = await API.query('SELECT name, color FROM attendance_subjects ORDER BY name ASC');
            } catch (e) {
                console.warn('Could not load attendance subjects:', e);
            }

            const buildSubjList = (filter) => {
                const lower = (filter || '').toLowerCase();
                const items = lower ? attSubjs.filter(s => s.name.toLowerCase().includes(lower)) : attSubjs;
                if (items.length === 0) {
                    subjList.innerHTML = '<div style="padding:12px 14px;font-size:13px;color:var(--text-tertiary);">No matching subjects</div>';
                    return;
                }
                subjList.innerHTML = items.map(s =>
                    '<div class="ev-subj-item" data-name="' + s.name + '" data-color="' + s.color + '" ' +
                    'style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-primary);transition:background 0.15s ease;">' +
                    '<span style="width:10px;height:10px;border-radius:50%;background:' + s.color + ';flex-shrink:0;display:inline-block;"></span>' +
                    s.name + '</div>'
                ).join('');

                subjList.querySelectorAll('.ev-subj-item').forEach(item => {
                    item.addEventListener('mouseenter', () => { item.style.background = 'rgba(139,92,246,0.1)'; });
                    item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
                    item.addEventListener('mousedown', (ev) => {
                        ev.preventDefault();
                        titleInput.value = item.dataset.name;
                        const radio = form.querySelector('input[name="color"][value="' + item.dataset.color + '"]');
                        if (radio) radio.checked = true;
                        closeDropdown();
                    });
                });
            };

            // ── Dropdown open / close ──────────────────────────────────────
            const openDropdown = () => {
                if (!attSubjs.length) return;
                dropdownOpen = true;
                buildSubjList(titleInput ? titleInput.value : '');
                dropdown.style.maxHeight = '220px';
                dropdown.style.opacity = '1';
                dropdown.style.pointerEvents = 'all';
                if (chevron) chevron.style.transform = 'rotate(180deg)';
            };

            const closeDropdown = () => {
                dropdownOpen = false;
                dropdown.style.maxHeight = '0';
                dropdown.style.opacity = '0';
                dropdown.style.pointerEvents = 'none';
                if (chevron) chevron.style.transform = 'rotate(0deg)';
            };

            if (toggleBtn) toggleBtn.addEventListener('click', () => { dropdownOpen ? closeDropdown() : openDropdown(); });
            if (titleInput) {
                titleInput.addEventListener('focus', openDropdown);
                titleInput.addEventListener('input', () => {
                    buildSubjList(titleInput.value);
                    if (!dropdownOpen) openDropdown();
                    const match = attSubjs.find(s => s.name.toLowerCase() === titleInput.value.trim().toLowerCase());
                    if (match) {
                        const radio = form.querySelector('input[name="color"][value="' + match.color + '"]');
                        if (radio) radio.checked = true;
                    }
                });
                titleInput.addEventListener('blur', () => setTimeout(closeDropdown, 150));
            }

            // ── Show/hide subject picker based on event type ───────────────
            const updateTypeUI = () => {
                const isClass = typeSelect.value === 'class';
                if (isClass) {
                    subjectGroup.style.maxHeight = '130px';
                    subjectGroup.style.opacity = '1';
                    subjectGroup.style.marginBottom = '';
                    titleGroup.style.display = 'none';
                    if (titleFree) titleFree.removeAttribute('required');
                    if (titleInput) titleInput.setAttribute('required', '');
                } else {
                    subjectGroup.style.maxHeight = '0';
                    subjectGroup.style.opacity = '0';
                    subjectGroup.style.marginBottom = '0';
                    titleGroup.style.display = '';
                    if (titleInput) titleInput.removeAttribute('required');
                    if (titleFree) titleFree.setAttribute('required', '');
                    closeDropdown();
                }
            };
            typeSelect.addEventListener('change', updateTypeUI);
            updateTypeUI();

            // ── Default start/end times ───────────────────────────────────
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            startInput.value = now.toISOString().slice(0, 16);
            const endDT = new Date(now.getTime() + 3600000);
            endInput.value = endDT.toISOString().slice(0, 16);

            // ── Recurrence UI ─────────────────────────────────────────────
            const updateRecurUI = () => {
                const val = recurSelect.value;
                if (val === 'none') {
                    recurBox.classList.remove('active');
                } else {
                    recurBox.classList.add('active');
                    if (val === 'daily') {
                        recurCountLabel.textContent = 'Repeat For (How many days?):';
                        if (!recurCountInput.value) recurCountInput.value = '7';
                        recurHint.textContent = 'Will create ' + recurCountInput.value + ' consecutive daily sessions.';
                    } else if (val === 'weekly') {
                        recurCountLabel.textContent = 'Repeat For (How many weeks / semester?):';
                        if (!recurCountInput.value) recurCountInput.value = '14';
                        recurHint.textContent = 'Will repeat every week for ' + recurCountInput.value + ' weeks.';
                    } else if (val === 'monthly') {
                        recurCountLabel.textContent = 'Repeat For (How many months?):';
                        if (!recurCountInput.value) recurCountInput.value = '6';
                        recurHint.textContent = 'Will repeat every month for ' + recurCountInput.value + ' months.';
                    }
                }
            };
            recurSelect.addEventListener('change', updateRecurUI);
            recurCountInput.addEventListener('input', () => {
                const count = parseInt(recurCountInput.value, 10) || 1;
                const val = recurSelect.value;
                if (val === 'daily') recurHint.textContent = 'Will create ' + count + ' consecutive daily sessions.';
                else if (val === 'weekly') recurHint.textContent = 'Will repeat every week for ' + count + ' weeks.';
                else if (val === 'monthly') recurHint.textContent = 'Will repeat every month for ' + count + ' months.';
            });

            // ── Form submit ───────────────────────────────────────────────
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const isClass = typeSelect.value === 'class';
                const title = isClass
                    ? (titleInput ? titleInput.value.trim() : '')
                    : (titleFree ? titleFree.value.trim() : '');
                if (!title) { alert('Please enter a title.'); return; }

                const type        = typeSelect.value;
                const location    = container.querySelector('#ev-location').value.trim();
                const description = container.querySelector('#ev-desc').value.trim();
                const recurrence  = recurSelect.value;
                const color       = form.elements['color'].value;
                const repeatCount = (recurrence !== 'none') ? Math.max(1, Math.min(60, parseInt(recurCountInput.value, 10) || 1)) : 1;

                const originalStartDate = new Date(startInput.value);
                const originalEndDate   = new Date(endInput.value);

                try {
                    const queueEventNotification = async (notifTitle, notifBody, triggerTimeMS) => {
                        if (triggerTimeMS > Date.now()) {
                            const trigDate = new Date(triggerTimeMS);
                            trigDate.setMinutes(trigDate.getMinutes() - trigDate.getTimezoneOffset());
                            const notifTimeStr = trigDate.toISOString().replace('T', ' ').slice(0, 19);
                            const exist = await API.query(
                                "SELECT id FROM notifications WHERE title = ? AND scheduled_time = ? AND type = 'schedule'",
                                [notifTitle, notifTimeStr]
                            );
                            if (exist.length === 0) {
                                await API.execute("INSERT INTO notifications (title, body, type, scheduled_time, sent) VALUES (?, ?, 'schedule', ?, 0)",
                                    [notifTitle, notifBody, notifTimeStr]);
                            }
                        }
                    };

                    for (let i = 0; i < repeatCount; i++) {
                        const instStart = new Date(originalStartDate.getTime());
                        const instEnd   = new Date(originalEndDate.getTime());
                        if (recurrence === 'daily') {
                            instStart.setDate(originalStartDate.getDate() + i);
                            instEnd.setDate(originalEndDate.getDate() + i);
                        } else if (recurrence === 'weekly') {
                            instStart.setDate(originalStartDate.getDate() + i * 7);
                            instEnd.setDate(originalEndDate.getDate() + i * 7);
                        } else if (recurrence === 'monthly') {
                            instStart.setMonth(originalStartDate.getMonth() + i);
                            instEnd.setMonth(originalEndDate.getMonth() + i);
                        }

                        const fmtStart = new Date(instStart.getTime() - instStart.getTimezoneOffset() * 60000).toISOString().replace('T', ' ').slice(0, 19);
                        const fmtEnd   = new Date(instEnd.getTime()   - instEnd.getTimezoneOffset()   * 60000).toISOString().replace('T', ' ').slice(0, 19);

                        await API.execute(
                            'INSERT INTO schedule (title, type, location, start_time, end_time, description, recurrence, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [title, type, location || null, fmtStart, fmtEnd, description || null, recurrence, color]
                        );

                        const startMS      = instStart.getTime();
                        const eventTimeStr = instStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const locStr       = location ? ' in ' + location : '';

                        if (type === 'class') {
                            await queueEventNotification('Upcoming Class: ' + title, 'Starts in 2 hours at ' + eventTimeStr + locStr, startMS - 7200000);
                        } else if (type === 'exam' || type === 'meeting') {
                            const lbl = type === 'exam' ? 'Exam' : 'Meeting';
                            await queueEventNotification('Upcoming ' + lbl + ' Tomorrow: ' + title, 'Starts in 24 hours at ' + eventTimeStr + locStr, startMS - 86400000);
                            await queueEventNotification('Upcoming ' + lbl + ': ' + title, 'Starts in 2 hours at ' + eventTimeStr + locStr, startMS - 7200000);
                        } else if (type === 'event') {
                            const dateLabel = new Date(startMS).toLocaleDateString([], { month: 'short', day: 'numeric' });
                            await queueEventNotification('Upcoming Event in 3 Days: ' + title, 'Starts in 3 days on ' + dateLabel + ' at ' + eventTimeStr + locStr, startMS - 259200000);
                            await queueEventNotification('Upcoming Event Tomorrow: ' + title, 'Starts in 24 hours at ' + eventTimeStr + locStr, startMS - 86400000);
                            await queueEventNotification('Upcoming Event: ' + title, 'Starts in 2 hours at ' + eventTimeStr + locStr, startMS - 7200000);
                        }
                    }

                    Modal.close();
                    onSaveSuccess();
                } catch (err) {
                    alert('Submission failed: ' + err.message);
                }
            });
        });
    },

    // -------------------------------------------------------------------------
    // 3. ASSIGNMENT ADD FORM
    // -------------------------------------------------------------------------
    showAddAssignment(onSaveSuccess) {
        const html = `
            <form id="form-assignment" class="settings-form">
                <div class="form-group">
                    <label for="as-title">Assignment Title</label>
                    <input type="text" id="as-title" name="title" placeholder="e.g. Lab Report 3, Essay Draft" required>
                </div>

                <div class="form-group">
                    <label for="as-subject">Subject / Course</label>
                    <input type="text" id="as-subject" name="subject" placeholder="e.g. CS 301, MTH 202" required>
                </div>

                <div class="form-group">
                    <label for="as-priority">Priority</label>
                    <select id="as-priority" name="priority" required>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="as-due">Due Date & Time</label>
                    <input type="datetime-local" id="as-due" name="due_date" required>
                </div>

                <div class="form-group">
                    <label for="as-notes">Assignment Notes</label>
                    <textarea id="as-notes" name="notes" rows="3" placeholder="Rubrics details, requirements..."></textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Task</button>
                </div>
            </form>
        `;

        Modal.open('Add Assignment', html, (container) => {
            const form = container.querySelector('#form-assignment');
            const dueInput = container.querySelector('#as-due');

            const now = new Date();
            now.setDate(now.getDate() + 1);
            now.setHours(23, 59, 0, 0);
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            dueInput.value = now.toISOString().slice(0, 16);

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('as-title').value.trim();
                const subject = document.getElementById('as-subject').value.trim();
                const priority = document.getElementById('as-priority').value;
                const due_date = dueInput.value.replace('T', ' ') + ':00';
                const notes = document.getElementById('as-notes').value.trim();

                try {
                    await API.execute("INSERT INTO assignments (title, subject, priority, due_date, status, notes, progress) VALUES (?, ?, ?, ?, 'pending', ?, 0)",
                        [title, subject, priority, due_date, notes ? notes : null]);

                    // Queue alerts with a time safety check
                    const dueMS = new Date(dueInput.value).getTime();
                    const timeDiffMS = dueMS - Date.now();

                    const queueAssignmentNotification = async (notifTitle, notifBody, triggerTimeMS) => {
                        const nowMS = Date.now();
                        if (triggerTimeMS > nowMS) {
                            const trigDate = new Date(triggerTimeMS);
                            trigDate.setMinutes(trigDate.getMinutes() - trigDate.getTimezoneOffset());
                            const notifTimeStr = trigDate.toISOString().replace('T', ' ').slice(0, 19);
                            // Dedup check: skip if same title + same scheduled_time already exists
                            const exist = await API.query(
                                "SELECT id FROM notifications WHERE title = ? AND scheduled_time = ? AND type = 'assignment'",
                                [notifTitle, notifTimeStr]
                            );
                            if (exist.length === 0) {
                                await API.execute("INSERT INTO notifications (title, body, type, scheduled_time, sent) VALUES (?, ?, 'assignment', ?, 0)",
                                    [notifTitle, notifBody, notifTimeStr]);
                            }
                        }
                    };

                    // 1. Always schedule the 24-hour reminder (if it is in the future)
                    await queueAssignmentNotification(
                        `Assignment Due Tomorrow: ${title}`,
                        `Due in 24 hours for ${subject}`,
                        dueMS - (24 * 60 * 60 * 1000)
                    );

                    // 2. Schedule 1-hour reminder (if it is in the future)
                    await queueAssignmentNotification(
                        `Assignment Due Soon: ${title}`,
                        `Due in 1 hour for ${subject}! Don't forget to submit.`,
                        dueMS - (1 * 60 * 60 * 1000)
                    );

                    // 3. Schedule at Due Date reminder (if it is in the future)
                    await queueAssignmentNotification(
                        `Assignment Deadline Now: ${title}`,
                        `Deadline has arrived for ${subject}! Submit now.`,
                        dueMS
                    );

                    // 4. Schedule a 5-day reminder ONLY if the due date is >7 days away
                    if (timeDiffMS > (7 * 24 * 60 * 60 * 1000)) {
                        const dateLabel = new Date(dueMS).toLocaleDateString([], { month: 'short', day: 'numeric' });
                        await queueAssignmentNotification(
                            `Assignment Due in 5 Days: ${title}`,
                            `Due on ${dateLabel} for ${subject}`,
                            dueMS - (5 * 24 * 60 * 60 * 1000)
                        );
                    }

                    Modal.close();
                    onSaveSuccess();
                } catch (err) {
                    alert('Submission failed: ' + err.message);
                }
            });
        });
    },

    // -------------------------------------------------------------------------
    // 4. ASSIGNMENT VIEW & EDIT DETAIL PANEL
    // -------------------------------------------------------------------------
    showAssignmentDetail(assignment, onUpdateSuccess) {
        const priorityLabels = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };
        const statusOptions = {
            pending: 'Pending / To Do',
            in_progress: 'In Progress',
            submitted: 'Submitted / Done'
        };

        const statusSelectOptions = Object.keys(statusOptions)
            .map(k => `<option value="${k}" ${assignment.status === k ? 'selected' : ''}>${statusOptions[k]}</option>`)
            .join('');

        const html = `
            <div class="settings-form">
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="assignment-subject">${assignment.subject}</span>
                        <span class="priority-badge ${assignment.priority}">${priorityLabels[assignment.priority]}</span>
                    </div>
                </div>

                <div class="form-group">
                    <h3 style="font-family:var(--font-heading);">${assignment.title}</h3>
                    <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                        Due: ${new Date(assignment.due_date).toLocaleString()}
                    </p>
                </div>

                <hr style="border:none; border-top:1px solid var(--border-color); margin:12px 0;">

                <form id="form-edit-assignment">
                    <div class="form-group">
                        <label for="edit-as-status">Status</label>
                        <select id="edit-as-status" name="status">
                            ${statusSelectOptions}
                        </select>
                    </div>

                    <div class="form-group" style="margin-top:12px;">
                        <div class="progress-header">
                            <label>Completion Progress</label>
                            <span class="progress-percent" id="slider-bubble">${assignment.progress}%</span>
                        </div>
                        <div class="slider-container" style="margin-top:6px;">
                            <input type="range" id="edit-as-progress" name="progress" min="0" max="100" value="${assignment.progress}">
                        </div>
                    </div>

                    <div class="form-group" style="margin-top:12px;">
                        <label for="edit-as-notes">Notes</label>
                        <textarea id="edit-as-notes" name="notes" rows="4">${assignment.notes || ''}</textarea>
                    </div>

                    <div class="form-actions" style="margin-top:20px; display:flex; justify-content:space-between;">
                        <button type="button" class="btn btn-danger" id="btn-delete-assignment">Delete</button>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </div>
                </form>
            </div>
        `;

        Modal.open('Assignment Details', html, (container) => {
            const form = container.querySelector('#form-edit-assignment');
            const progressSlider = container.querySelector('#edit-as-progress');
            const progressBubble = container.querySelector('#slider-bubble');
            const statusSelect = container.querySelector('#edit-as-status');
            const btnDelete = container.querySelector('#btn-delete-assignment');

            progressSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                progressBubble.textContent = `${val}%`;

                if (val == 100) {
                    statusSelect.value = 'submitted';
                } else if (val > 0 && val < 100) {
                    statusSelect.value = 'in_progress';
                } else {
                    statusSelect.value = 'pending';
                }
            });

            statusSelect.addEventListener('change', (e) => {
                const status = e.target.value;
                if (status === 'submitted') {
                    progressSlider.value = 100;
                    progressBubble.textContent = '100%';
                } else if (status === 'pending') {
                    progressSlider.value = 0;
                    progressBubble.textContent = '0%';
                }
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const status = statusSelect.value;
                const progress = parseInt(progressSlider.value, 10);
                const notes = document.getElementById('edit-as-notes').value.trim();

                try {
                    await API.execute("UPDATE assignments SET status = ?, progress = ?, notes = ? WHERE id = ?",
                        [status, progress, notes ? notes : null, assignment.id]);
                    // Sync: if marked done/submitted, remove its pending notifications
                    if (status === 'submitted') {
                        await API.execute(
                            "DELETE FROM notifications WHERE type = 'assignment' AND sent = 0 AND title LIKE ?",
                            [`%${assignment.title}%`]
                        );
                    }
                    Modal.close();
                    onUpdateSuccess();
                } catch (err) {
                    alert('Save failed: ' + err.message);
                }
            });

            btnDelete.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this assignment?')) {
                    try {
                        await API.execute("DELETE FROM assignments WHERE id = ?", [assignment.id]);
                        // Sync: remove any pending notifications for this assignment
                        await API.execute(
                            "DELETE FROM notifications WHERE type = 'assignment' AND sent = 0 AND title LIKE ?",
                            [`%${assignment.title}%`]
                        );
                        Modal.close();
                        onUpdateSuccess();
                    } catch (err) {
                        alert('Deletion failed: ' + err.message);
                    }
                }
            });
        }, () => {
            // Edit Pencil Click in Header: Smooth Slide Transition
            Modal.transitionTo('Update Assignment', this.getEditAssignmentHTML(assignment), (container) => {
                this.bindEditAssignmentForm(container, assignment, onUpdateSuccess);
            });
        });
    },

    // Helper: Assignment edit form HTML (Title, Subject, Priority, Due Date)
    getEditAssignmentHTML(assignment) {
        const dueVal = assignment.due_date ? assignment.due_date.replace(' ', 'T').slice(0, 16) : '';
        return `
            <form id="form-edit-assignment-full" class="settings-form">
                <div class="form-group">
                    <label for="eas-title">Assignment Title</label>
                    <input type="text" id="eas-title" name="title" value="${assignment.title || ''}" placeholder="e.g. Lab Report 3, Essay Draft" required>
                </div>

                <div class="form-group">
                    <label for="eas-subject">Subject / Course</label>
                    <input type="text" id="eas-subject" name="subject" value="${assignment.subject || ''}" placeholder="e.g. CS 301, MTH 202" required>
                </div>

                <div class="form-group">
                    <label for="eas-priority">Priority</label>
                    <select id="eas-priority" name="priority" required>
                        <option value="medium" ${assignment.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${assignment.priority === 'high' ? 'selected' : ''}>High</option>
                        <option value="low" ${assignment.priority === 'low' ? 'selected' : ''}>Low</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="eas-due">Due Date & Time</label>
                    <input type="datetime-local" id="eas-due" name="due_date" value="${dueVal}" required>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Task</button>
                </div>
            </form>
        `;
    },

    // Helper: Assignment edit form submission and logic binding
    bindEditAssignmentForm(container, assignment, onSaveSuccess) {
        const form = container.querySelector('#form-edit-assignment-full');
        const dueInput = container.querySelector('#eas-due');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('eas-title').value.trim();
            const subject = document.getElementById('eas-subject').value.trim();
            const priority = document.getElementById('eas-priority').value;
            const due_date = dueInput.value.replace('T', ' ') + ':00';
            const status = assignment.status || 'pending';
            const progress = typeof assignment.progress === 'number' ? assignment.progress : (parseInt(assignment.progress, 10) || 0);
            const notes = assignment.notes || null;

            try {
                await API.execute(
                    "UPDATE assignments SET title = ?, subject = ?, priority = ?, due_date = ?, status = ?, progress = ?, notes = ? WHERE id = ?",
                    [title, subject, priority, due_date, status, progress, notes, assignment.id]
                );

                // Sync Notifications: Delete old pending alerts for this assignment
                await API.execute(
                    "DELETE FROM notifications WHERE type = 'assignment' AND sent = 0 AND (title LIKE ? OR title LIKE ?)",
                    [`%${assignment.title}%`, `%${title}%`]
                );

                // If not submitted, schedule new notifications with updated due date
                if (status !== 'submitted') {
                    const dueMS = new Date(dueInput.value).getTime();
                    const timeDiffMS = dueMS - Date.now();

                    const queueAssignmentNotification = async (notifTitle, notifBody, triggerTimeMS) => {
                        const nowMS = Date.now();
                        if (triggerTimeMS > nowMS) {
                            const trigDate = new Date(triggerTimeMS);
                            trigDate.setMinutes(trigDate.getMinutes() - trigDate.getTimezoneOffset());
                            const notifTimeStr = trigDate.toISOString().replace('T', ' ').slice(0, 19);
                            const exist = await API.query(
                                "SELECT id FROM notifications WHERE title = ? AND scheduled_time = ? AND type = 'assignment'",
                                [notifTitle, notifTimeStr]
                            );
                            if (exist.length === 0) {
                                await API.execute(
                                    "INSERT INTO notifications (title, body, type, scheduled_time, sent) VALUES (?, ?, 'assignment', ?, 0)",
                                    [notifTitle, notifBody, notifTimeStr]
                                );
                            }
                        }
                    };

                    // 1. 24-hour reminder
                    await queueAssignmentNotification(
                        `Assignment Due Tomorrow: ${title}`,
                        `Due in 24 hours for ${subject}`,
                        dueMS - (24 * 60 * 60 * 1000)
                    );

                    // 2. 1-hour reminder
                    await queueAssignmentNotification(
                        `Assignment Due Soon: ${title}`,
                        `Due in 1 hour for ${subject}! Don't forget to submit.`,
                        dueMS - (1 * 60 * 60 * 1000)
                    );

                    // 3. At Due Date reminder
                    await queueAssignmentNotification(
                        `Assignment Deadline Now: ${title}`,
                        `Deadline has arrived for ${subject}! Submit now.`,
                        dueMS
                    );

                    // 4. 5-day reminder if > 7 days away
                    if (timeDiffMS > (7 * 24 * 60 * 60 * 1000)) {
                        const dateLabel = new Date(dueMS).toLocaleDateString([], { month: 'short', day: 'numeric' });
                        await queueAssignmentNotification(
                            `Assignment Due in 5 Days: ${title}`,
                            `Due on ${dateLabel} for ${subject}`,
                            dueMS - (5 * 24 * 60 * 60 * 1000)
                        );
                    }
                }

                Modal.close();
                onSaveSuccess();
            } catch (err) {
                alert('Update failed: ' + err.message);
            }
        });
    },

    // Direct open helper if called independently
    showEditAssignment(assignment, onSaveSuccess) {
        Modal.open('Update Assignment', this.getEditAssignmentHTML(assignment), (container) => {
            this.bindEditAssignmentForm(container, assignment, onSaveSuccess);
        });
    },

    // -------------------------------------------------------------------------
    // 5. EVENT DETAILS VIEW SHEET
    // -------------------------------------------------------------------------
    showEventDetail(event, onDeleteSuccess) {
        const typeLabels = { class: 'Class/Lecture', exam: 'Academic Exam', meeting: 'Study Meeting', event: 'Event/Social' };
        
        const html = `
            <div class="settings-form">
                <div class="form-group" style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="type-badge ${event.type}">${typeLabels[event.type]}</span>
                </div>

                <div class="form-group">
                    <h3 style="font-family:var(--font-heading);">${event.title}</h3>
                    <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                        ${new Date(event.start_time).toLocaleString()} - ${new Date(event.end_time).toLocaleString()}
                    </p>
                </div>

                ${event.location ? `
                <div class="form-group" style="margin-top:10px;">
                    <label>Location</label>
                    <div style="font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px; margin-top:4px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>${event.location}</span>
                    </div>
                </div>
                ` : ''}

                ${event.description ? `
                <div class="form-group" style="margin-top:12px;">
                    <label>Description / Notes</label>
                    <div style="font-size:13px; color:var(--text-secondary); background-color:var(--surface-variant); padding:12px; border-radius:var(--radius-sm); margin-top:4px; line-height:1.4;">
                        ${event.description}
                    </div>
                </div>
                ` : ''}

                <div class="form-actions" style="margin-top:24px;">
                    <button type="button" class="btn btn-danger" id="btn-delete-event" style="width:100%;">Delete Event</button>
                </div>
            </div>
        `;

        Modal.open('Event Details', html, (container) => {
            const btnDelete = container.querySelector('#btn-delete-event');

            btnDelete.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this event?')) {
                    try {
                        await API.execute("DELETE FROM schedule WHERE id = ?", [event.id]);
                        // Sync: remove any pending notifications for this event
                        await API.execute(
                            "DELETE FROM notifications WHERE type = 'schedule' AND sent = 0 AND title LIKE ?",
                            [`%${event.title}%`]
                        );
                        Modal.close();
                        onDeleteSuccess();
                    } catch (err) {
                        alert('Deletion failed: ' + err.message);
                    }
                }
            });
        }, () => {
            // Edit Pencil Click in Header: Smooth Slide Transition
            Modal.transitionTo('Update Event', this.getEditEventHTML(event), (container) => {
                this.bindEditEventForm(container, event, onDeleteSuccess);
            });
        });
    },

    // Helper: Event edit form HTML
    // Helper: Event edit form HTML
    getEditEventHTML(event) {
        const startVal = event.start_time ? event.start_time.replace(' ', 'T').slice(0, 16) : '';
        const endVal = event.end_time ? event.end_time.replace(' ', 'T').slice(0, 16) : '';
        const isClass = event.type === 'class';
        const color = event.color || '#8b5cf6';

        return `
            <form id="form-edit-event" class="settings-form">
                <div class="form-group">
                    <label for="eev-type">Type</label>
                    <select id="eev-type" name="type" required>
                        <option value="class" ${event.type === 'class' ? 'selected' : ''}>Class / Lecture</option>
                        <option value="exam" ${event.type === 'exam' ? 'selected' : ''}>Exam</option>
                        <option value="meeting" ${event.type === 'meeting' ? 'selected' : ''}>Meeting / Group study</option>
                        <option value="event" ${event.type === 'event' ? 'selected' : ''}>Social Event / Other</option>
                    </select>
                </div>

                <!-- Subject picker: only visible when type = class -->
                <div class="form-group" id="eev-subject-group" style="overflow:visible; max-height:${isClass ? '130px' : '0'}; opacity:${isClass ? '1' : '0'}; margin-bottom:${isClass ? '' : '0'}; transition:max-height 0.32s ease, opacity 0.25s ease, margin-bottom 0.3s ease;">
                    <label style="margin-bottom:4px; display:block; font-size:13px; font-weight:700; color:var(--text-secondary);">Subject</label>
                    <div style="position:relative;">
                        <input type="text" id="eev-title" name="title" value="${isClass ? (event.title || '') : ''}" placeholder="Type or pick a subject..." autocomplete="off"
                            style="width:100%; box-sizing:border-box; padding-right:38px;">
                        <button type="button" id="eev-subj-toggle" tabindex="-1"
                            style="position:absolute;right:0;top:0;bottom:0;width:38px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);">
                            <svg id="eev-subj-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;transition:transform 0.25s ease;">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <div id="eev-subj-dropdown" style="position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:999;background:var(--surface-variant);border:1px solid var(--border-color);border-radius:var(--radius-md);box-shadow:0 8px 24px rgba(0,0,0,0.18);overflow:hidden;max-height:0;opacity:0;transition:max-height 0.28s ease,opacity 0.2s ease;pointer-events:none;">
                            <div id="eev-subj-list" style="overflow-y:auto;max-height:190px;padding:4px 0;"></div>
                        </div>
                    </div>
                </div>

                <!-- Free-text title for non-class types -->
                <div class="form-group" id="eev-title-group" style="display:${isClass ? 'none' : ''};">
                    <label for="eev-title-free">Event Title</label>
                    <input type="text" id="eev-title-free" value="${!isClass ? (event.title || '') : ''}" placeholder="e.g. Midterm Exam, Study Group" autocomplete="off">
                </div>

                <div class="form-group">
                    <label for="eev-location">Location</label>
                    <input type="text" id="eev-location" name="location" value="${event.location || ''}" placeholder="e.g. Hall of Science, Library Room 4">
                </div>

                <div class="form-group">
                    <label for="eev-start">Start Date &amp; Time</label>
                    <input type="datetime-local" id="eev-start" name="start_time" value="${startVal}" required>
                </div>

                <div class="form-group">
                    <label for="eev-end">End Date &amp; Time</label>
                    <input type="datetime-local" id="eev-end" name="end_time" value="${endVal}" required>
                </div>

                <div class="form-group">
                    <label for="eev-desc">Notes / Description</label>
                    <textarea id="eev-desc" name="description" rows="3" placeholder="Chapters to review, study partners...">${event.description || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>Label Color</label>
                    <div style="display: flex; gap: 10px; margin-top: 6px;" id="eev-color-group">
                        <label><input type="radio" name="color" value="#8b5cf6" ${color === '#8b5cf6' ? 'checked' : ''}> <span style="background:#8b5cf6; width:16px; height:16px; display:inline-block; border-radius:50%; vertical-align:middle;"></span></label>
                        <label><input type="radio" name="color" value="#3b82f6" ${color === '#3b82f6' ? 'checked' : ''}> <span style="background:#3b82f6; width:16px; height:16px; display:inline-block; border-radius:50%; vertical-align:middle;"></span></label>
                        <label><input type="radio" name="color" value="#10b981" ${color === '#10b981' ? 'checked' : ''}> <span style="background:#10b981; width:16px; height:16px; display:inline-block; border-radius:50%; vertical-align:middle;"></span></label>
                        <label><input type="radio" name="color" value="#f59e0b" ${color === '#f59e0b' ? 'checked' : ''}> <span style="background:#f59e0b; width:16px; height:16px; display:inline-block; border-radius:50%; vertical-align:middle;"></span></label>
                        <label><input type="radio" name="color" value="#ef4444" ${color === '#ef4444' ? 'checked' : ''}> <span style="background:#ef4444; width:16px; height:16px; display:inline-block; border-radius:50%; vertical-align:middle;"></span></label>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Event</button>
                </div>
            </form>
        `;
    },

    // Helper: Event edit form submission and logic binding
    bindEditEventForm(container, event, onSaveSuccess) {
        const form            = container.querySelector('#form-edit-event');
        const typeSelect      = container.querySelector('#eev-type');
        const subjectGroup    = container.querySelector('#eev-subject-group');
        const titleGroup      = container.querySelector('#eev-title-group');
        const titleInput      = container.querySelector('#eev-title');
        const titleFree       = container.querySelector('#eev-title-free');
        const toggleBtn       = container.querySelector('#eev-subj-toggle');
        const chevron         = container.querySelector('#eev-subj-chevron');
        const dropdown        = container.querySelector('#eev-subj-dropdown');
        const subjList        = container.querySelector('#eev-subj-list');
        const startInput      = container.querySelector('#eev-start');
        const endInput        = container.querySelector('#eev-end');

        let attSubjs = [];
        let dropdownOpen = false;

        // Load subjects from Attendance
        (async () => {
            try {
                attSubjs = await API.query('SELECT name, color FROM attendance_subjects ORDER BY name ASC');
            } catch (e) {
                console.warn('Could not load attendance subjects:', e);
            }
        })();

        // Build custom dropdown list
        const buildSubjList = (filter) => {
            const lower = (filter || '').toLowerCase();
            const items = lower ? attSubjs.filter(s => s.name.toLowerCase().includes(lower)) : attSubjs;

            if (items.length === 0) {
                subjList.innerHTML = '<div style="padding:12px 14px;font-size:13px;color:var(--text-tertiary);">No matching subjects</div>';
                return;
            }

            subjList.innerHTML = items.map(s =>
                '<div class="eev-subj-item" data-name="' + s.name + '" data-color="' + s.color + '" ' +
                'style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-primary);transition:background 0.15s ease;">' +
                '<span style="width:10px;height:10px;border-radius:50%;background:' + s.color + ';flex-shrink:0;display:inline-block;"></span>' +
                s.name + '</div>'
            ).join('');

            subjList.querySelectorAll('.eev-subj-item').forEach(item => {
                item.addEventListener('mouseenter', () => { item.style.background = 'rgba(139,92,246,0.1)'; });
                item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
                item.addEventListener('mousedown', (ev) => {
                    ev.preventDefault();
                    titleInput.value = item.dataset.name;
                    const radio = form.querySelector('input[name="color"][value="' + item.dataset.color + '"]');
                    if (radio) radio.checked = true;
                    closeDropdown();
                });
            });
        };

        const openDropdown = () => {
            if (!attSubjs.length) return;
            dropdownOpen = true;
            buildSubjList(titleInput ? titleInput.value : '');
            dropdown.style.maxHeight = '220px';
            dropdown.style.opacity = '1';
            dropdown.style.pointerEvents = 'all';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        };

        const closeDropdown = () => {
            dropdownOpen = false;
            dropdown.style.maxHeight = '0';
            dropdown.style.opacity = '0';
            dropdown.style.pointerEvents = 'none';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        };

        if (toggleBtn) toggleBtn.addEventListener('click', () => { dropdownOpen ? closeDropdown() : openDropdown(); });
        if (titleInput) {
            titleInput.addEventListener('focus', openDropdown);
            titleInput.addEventListener('input', () => {
                buildSubjList(titleInput.value);
                if (!dropdownOpen) openDropdown();
                const match = attSubjs.find(s => s.name.toLowerCase() === titleInput.value.trim().toLowerCase());
                if (match) {
                    const radio = form.querySelector('input[name="color"][value="' + match.color + '"]');
                    if (radio) radio.checked = true;
                }
            });
            titleInput.addEventListener('blur', () => setTimeout(closeDropdown, 150));
        }

        // Show/hide subject picker based on type
        const updateTypeUI = () => {
            const isClass = typeSelect.value === 'class';
            if (isClass) {
                subjectGroup.style.maxHeight = '130px';
                subjectGroup.style.opacity = '1';
                subjectGroup.style.marginBottom = '';
                titleGroup.style.display = 'none';
                if (titleFree) titleFree.removeAttribute('required');
                if (titleInput) titleInput.setAttribute('required', '');
            } else {
                subjectGroup.style.maxHeight = '0';
                subjectGroup.style.opacity = '0';
                subjectGroup.style.marginBottom = '0';
                titleGroup.style.display = '';
                if (titleInput) titleInput.removeAttribute('required');
                if (titleFree) titleFree.setAttribute('required', '');
                closeDropdown();
            }
        };

        typeSelect.addEventListener('change', updateTypeUI);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const isClass = typeSelect.value === 'class';
            const title = isClass
                ? (titleInput ? titleInput.value.trim() : '')
                : (titleFree ? titleFree.value.trim() : '');
            if (!title) { alert('Please enter a title.'); return; }

            const type = typeSelect.value;
            const location = container.querySelector('#eev-location').value.trim();
            const start_time = startInput.value.replace('T', ' ') + ':00';
            const end_time = endInput.value.replace('T', ' ') + ':00';
            const description = container.querySelector('#eev-desc').value.trim();
            const recurrence = event.recurrence || 'none';
            const selectedColor = form.elements['color'].value;

            try {
                await API.execute(
                    "UPDATE schedule SET title = ?, type = ?, location = ?, start_time = ?, end_time = ?, description = ?, recurrence = ?, color = ? WHERE id = ?",
                    [title, type, location ? location : null, start_time, end_time, description ? description : null, recurrence, selectedColor, event.id]
                );

                // Sync Notifications: Delete old pending alerts for this event
                await API.execute(
                    "DELETE FROM notifications WHERE type = 'schedule' AND sent = 0 AND (title LIKE ? OR title LIKE ?)",
                    [`%${event.title}%`, `%${title}%`]
                );

                // Queue updated alerts based on new start_time
                const startMS = new Date(startInput.value).getTime();
                const eventTimeStr = new Date(startInput.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const locationStr = location ? ` in ${location}` : '';

                const queueEventNotification = async (notifTitle, notifBody, triggerTimeMS) => {
                    const nowMS = Date.now();
                    if (triggerTimeMS > nowMS) {
                        const trigDate = new Date(triggerTimeMS);
                        trigDate.setMinutes(trigDate.getMinutes() - trigDate.getTimezoneOffset());
                        const notifTimeStr = trigDate.toISOString().replace('T', ' ').slice(0, 19);
                        const exist = await API.query(
                            "SELECT id FROM notifications WHERE title = ? AND scheduled_time = ? AND type = 'schedule'",
                            [notifTitle, notifTimeStr]
                        );
                        if (exist.length === 0) {
                            await API.execute(
                                "INSERT INTO notifications (title, body, type, scheduled_time, sent) VALUES (?, ?, 'schedule', ?, 0)",
                                [notifTitle, notifBody, notifTimeStr]
                            );
                        }
                    }
                };

                if (type === 'class') {
                    // Class/Lecture: 2 hours before start
                    await queueEventNotification(
                        `Upcoming Class: ${title}`,
                        `Starts in 2 hours at ${eventTimeStr}${locationStr}`,
                        startMS - (2 * 60 * 60 * 1000)
                    );
                } else if (type === 'exam' || type === 'meeting') {
                    const typeLabel = type === 'exam' ? 'Exam' : 'Meeting';
                    // Exam/Meeting: 24 hours AND 2 hours before start
                    await queueEventNotification(
                        `Upcoming ${typeLabel} Tomorrow: ${title}`,
                        `Starts in 24 hours at ${eventTimeStr}${locationStr}`,
                        startMS - (24 * 60 * 60 * 1000)
                    );
                    await queueEventNotification(
                        `Upcoming ${typeLabel}: ${title}`,
                        `Starts in 2 hours at ${eventTimeStr}${locationStr}`,
                        startMS - (2 * 60 * 60 * 1000)
                    );
                } else if (type === 'event') {
                    // Social Event: 3 days (72 hours), 24 hours, AND 2 hours before start
                    const dateLabel = new Date(startMS).toLocaleDateString([], { month: 'short', day: 'numeric' });
                    await queueEventNotification(
                        `Upcoming Event in 3 Days: ${title}`,
                        `Starts in 3 days on ${dateLabel} at ${eventTimeStr}${locationStr}`,
                        startMS - (3 * 24 * 60 * 60 * 1000)
                    );
                    await queueEventNotification(
                        `Upcoming Event Tomorrow: ${title}`,
                        `Starts in 24 hours at ${eventTimeStr}${locationStr}`,
                        startMS - (24 * 60 * 60 * 1000)
                    );
                    await queueEventNotification(
                        `Upcoming Event: ${title}`,
                        `Starts in 2 hours at ${eventTimeStr}${locationStr}`,
                        startMS - (2 * 60 * 60 * 1000)
                    );
                }

                Modal.close();
                onSaveSuccess();
            } catch (err) {
                alert('Update failed: ' + err.message);
            }
        });
    },

    // Direct open helper if called independently
    showEditEvent(event, onSaveSuccess) {
        Modal.open('Update Event', this.getEditEventHTML(event), (container) => {
            this.bindEditEventForm(container, event, onSaveSuccess);
        });
    }
};
