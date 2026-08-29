/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\pages\assignment.js */

const AssignmentPage = {
    assignments: [],
    filters: {
        q: '',
        priority: '',
        status: '',
        sort: 'due_date_asc'
    },

    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="assignment-page">
                <!-- Header -->
                <div class="dashboard-header">
                    <div class="welcome-section">
                        <h2>My Assignments</h2>
                        <p>Track academic deadlines, homework, and tasks.</p>
                    </div>
                </div>

                <!-- Search, Filter, Sort Controls -->
                <div class="assignments-header-controls">
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="as-search-input" placeholder="Search assignments..." value="${this.filters.q}">
                    </div>

                    <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:space-between; align-items:center;">
                        <div class="filter-pills-bar" id="as-status-pills" style="padding-bottom:0;">
                            <div class="filter-pill ${this.filters.status === '' ? 'active' : ''}" data-status="">All</div>
                            <div class="filter-pill ${this.filters.status === 'pending' ? 'active' : ''}" data-status="pending">To Do</div>
                            <div class="filter-pill ${this.filters.status === 'in_progress' ? 'active' : ''}" data-status="in_progress">In Progress</div>
                            <div class="filter-pill ${this.filters.status === 'submitted' ? 'active' : ''}" data-status="submitted">Submitted</div>
                        </div>

                        <div style="display:flex; gap:8px; align-items:center;">
                            <select id="as-priority-select" style="padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background-color:var(--surface-color); font-size:12px; font-weight:600; color:var(--text-secondary);">
                                <option value="">All Priorities</option>
                                <option value="high" ${this.filters.priority === 'high' ? 'selected' : ''}>High</option>
                                <option value="medium" ${this.filters.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="low" ${this.filters.priority === 'low' ? 'selected' : ''}>Low</option>
                            </select>

                            <select id="as-sort-select" style="padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background-color:var(--surface-color); font-size:12px; font-weight:600; color:var(--text-secondary);">
                                <option value="due_date_asc" ${this.filters.sort === 'due_date_asc' ? 'selected' : ''}>Due Soonest</option>
                                <option value="due_date_desc" ${this.filters.sort === 'due_date_desc' ? 'selected' : ''}>Due Latest</option>
                                <option value="priority_desc" ${this.filters.sort === 'priority_desc' ? 'selected' : ''}>Priority Rank</option>
                                <option value="progress_desc" ${this.filters.sort === 'progress_desc' ? 'selected' : ''}>Highest Progress</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Assignments Cards Grid -->
                <div class="assignments-grid" id="as-cards-grid">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('assignment-page');
            if (page) page.classList.add('active');
        }, 50);

        const fabBtn = document.getElementById('fab-action-assignment');
        if (fabBtn) {
            fabBtn.onclick = () => Forms.showAddAssignment(() => this.refreshData());
        }

        await this.loadAssignmentsData();
        this.bindEvents();
    },

    async loadAssignmentsData() {
        try {
            let sql = "SELECT id, title, subject, priority, due_date, status, notes, progress, (strftime('%s', due_date) - strftime('%s', 'now')) as seconds_left FROM assignments WHERE 1=1";
            const params = [];

            if (this.filters.q) {
                sql += " AND (title LIKE ? OR subject LIKE ? OR notes LIKE ?)";
                params.push(`%${this.filters.q}%`, `%${this.filters.q}%`, `%${this.filters.q}%`);
            }

            if (this.filters.priority) {
                sql += " AND priority = ?";
                params.push(this.filters.priority);
            }

            if (this.filters.status) {
                sql += " AND status = ?";
                params.push(this.filters.status);
            }

            switch (this.filters.sort) {
                case 'due_date_desc':
                    sql += " ORDER BY due_date DESC";
                    break;
                case 'priority_desc':
                    sql += " ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC, due_date ASC";
                    break;
                case 'progress_desc':
                    sql += " ORDER BY progress DESC, due_date ASC";
                    break;
                case 'due_date_asc':
                default:
                    sql += " ORDER BY due_date ASC";
                    break;
            }

            this.assignments = await API.query(sql, params);
            this.renderAssignments();
        } catch (err) {
            console.error('Failed to load assignments: ' + err.message);
        }
    },

    async refreshData() {
        await this.loadAssignmentsData();
    },

    renderAssignments() {
        const grid = document.getElementById('as-cards-grid');
        if (!grid) return;

        if (this.assignments.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: span 2; padding: 48px 16px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    <h5>No tasks found</h5>
                    <p>Change your search parameters or log a new assignment.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.assignments.map(as => {
            const daysLeft = Math.ceil(as.seconds_left / 86400);
            let countdownText = '';
            let countdownClass = '';

            if (as.status === 'submitted') {
                countdownText = 'Completed';
                countdownClass = '';
            } else if (as.seconds_left < 0) {
                countdownText = 'Overdue';
                countdownClass = 'due-soon';
            } else if (daysLeft === 0) {
                countdownText = 'Due today';
                countdownClass = 'due-soon';
            } else {
                countdownText = `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`;
                countdownClass = daysLeft <= 2 ? 'due-soon' : '';
            }

            return `
                <div class="assignment-card ripple-container" onclick="Forms.showAssignmentDetail(${JSON.stringify(as).replace(/"/g, '&quot;')}, () => AssignmentPage.refreshData())">
                    <div class="assignment-card-header">
                        <div style="flex:1; overflow:hidden;">
                            <span class="assignment-subject">${as.subject}</span>
                            <h4 class="assignment-card-title" style="margin-top:6px;">${as.title}</h4>
                        </div>
                        <span class="priority-badge ${as.priority}">${as.priority}</span>
                    </div>

                    ${as.notes ? `<div class="assignment-notes">${as.notes}</div>` : ''}

                    <div class="assignment-progress-section">
                        <div class="progress-header">
                            <span class="assignment-countdown ${countdownClass}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>${countdownText}</span>
                            </span>
                            <span class="progress-percent">${as.progress}%</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill" style="width: ${as.progress}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    bindEvents() {
        const searchInput = document.getElementById('as-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.q = e.target.value;
                if (this.searchTimeout) clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => this.loadAssignmentsData(), 400);
            });
        }

        const statusPills = document.querySelectorAll('#as-status-pills .filter-pill');
        statusPills.forEach(pill => {
            pill.addEventListener('click', () => {
                statusPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                this.filters.status = pill.dataset.status;
                this.loadAssignmentsData();
            });
        });

        const prioritySel = document.getElementById('as-priority-select');
        if (prioritySel) {
            prioritySel.addEventListener('change', (e) => {
                this.filters.priority = e.target.value;
                this.loadAssignmentsData();
            });
        }

        const sortSel = document.getElementById('as-sort-select');
        if (sortSel) {
            sortSel.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.loadAssignmentsData();
            });
        }
    }
};
