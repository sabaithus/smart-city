const app = {
    currentView: 'auth-view',
    currentSubView: 'user-home-view',
    reportStep: 1,
    uploadedMedia: [],
    reportData: { category: 'fire', severity: 'high', location: {lat: 12.9716, lng: 77.5946}, address: 'Bengaluru, Karnataka', title: '', desc: '', image: null },
    reportDesktopMap: null,
    reportMobileMap: null,
    selectedRole: 'user',
    currentUser: null,

    // ==================== AUTH ====================

    switchAuthTab: function(tab) {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        this.clearMessages();

        if (tab === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
        lucide.createIcons();
    },

    togglePassword: function(inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('i') || btn.querySelector('svg');
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) btn.innerHTML = '<i data-lucide="eye-off"></i>';
        } else {
            input.type = 'password';
            if (icon) btn.innerHTML = '<i data-lucide="eye"></i>';
        }
        lucide.createIcons();
    },

    selectRole: function(btn) {
        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedRole = btn.dataset.role;
    },

    showMessage: function(elementId, message, isError = true) {
        const el = document.getElementById(elementId);
        el.style.display = 'block';
        el.textContent = message;
        el.className = 'auth-message ' + (isError ? 'error' : 'success');
    },

    clearMessages: function() {
        document.querySelectorAll('.auth-message').forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
        });
    },

    setLoading: function(btnId, loading) {
        const btn = document.getElementById(btnId);
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');
        if (loading) {
            text.style.display = 'none';
            loader.style.display = 'inline-block';
            btn.disabled = true;
        } else {
            text.style.display = 'inline';
            loader.style.display = 'none';
            btn.disabled = false;
        }
    },

    login: async function(e) {
        e.preventDefault();
        this.clearMessages();

        const countryCode = document.getElementById('login-country-code').value;
        const phone = document.getElementById('login-phone').value.trim().replace(/\s/g, '');
        const password = document.getElementById('login-password').value;

        if (!phone || !password) {
            this.showMessage('auth-message', 'Please fill in all fields.');
            return;
        }

        this.setLoading('auth-submit-btn', true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryCode, phone, password })
            });
            const data = await res.json();

            if (!res.ok) {
                this.showMessage('auth-message', data.error);
            } else {
                this.currentUser = data.user;
                this.updateUI();
                
                if (data.user.role === 'admin') {
                    this.navigate('admin-view');
                } else {
                    this.navigate('main-layout');
                }
            }
        } catch (err) {
            this.showMessage('auth-message', 'Server error. Make sure the server is running.');
        } finally {
            this.setLoading('auth-submit-btn', false);
        }
    },

    register: async function(e) {
        e.preventDefault();
        this.clearMessages();

        const fullName = document.getElementById('reg-name').value.trim();
        const countryCode = document.getElementById('reg-country-code').value;
        const phone = document.getElementById('reg-phone').value.trim().replace(/\s/g, '');
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-password-confirm').value;

        if (!fullName || !phone || !password || !confirmPassword) {
            this.showMessage('reg-message', 'Please fill in all fields.');
            return;
        }

        if (password.length < 6) {
            this.showMessage('reg-message', 'Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('reg-message', 'Passwords do not match.');
            return;
        }

        this.setLoading('reg-submit-btn', true);

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, countryCode, phone, password, role: this.selectedRole })
            });
            const data = await res.json();

            if (!res.ok) {
                this.showMessage('reg-message', data.error);
            } else {
                this.currentUser = data.user;
                this.updateUI();
                this.navigate('main-layout');
            }
        } catch (err) {
            this.showMessage('reg-message', 'Server error. Make sure the server is running.');
        } finally {
            this.setLoading('reg-submit-btn', false);
        }
    },

    logout: async function() {
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (e) { /* ignore */ }
        this.currentUser = null;
        this.navigate('auth-view');
        // Clear form fields
        document.getElementById('login-phone').value = '';
        document.getElementById('login-password').value = '';
    },

    checkSession: async function() {
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            if (data.loggedIn) {
                this.currentUser = data.user;
                this.updateUI();
                if (data.user.role === 'admin') {
                    this.navigate('admin-view');
                } else {
                    this.navigate('main-layout');
                }
            }
        } catch (e) { /* not logged in */ }
    },

    // ==================== THEME & UI ====================

    initCustomSelects: function() {
        const selects = document.querySelectorAll('select.country-code-select');
        
        function formatOptionText(text) {
            const parts = text.trim().split(' ');
            if (parts.length === 2) {
                return `<div style="display:flex; flex-direction:column; line-height:1.2; font-size:0.85rem;"><span>${parts[0]}</span><span style="color:var(--text-gray);">${parts[1]}</span></div>`;
            }
            return text;
        }

        selects.forEach(select => {
            select.style.display = 'none';
            
            const customSelect = document.createElement('div');
            customSelect.className = 'custom-select';
            
            const trigger = document.createElement('div');
            trigger.className = 'custom-select-trigger';
            trigger.innerHTML = `<div class="trigger-content" style="display:flex; align-items:center; gap:8px;">${formatOptionText(select.options[select.selectedIndex].innerHTML)}<i data-lucide="chevron-down" style="width:16px;height:16px;"></i></div>`;
            
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'custom-options';
            
            // Limit to 5-6 items, scrolling handles the rest!
            
            Array.from(select.options).forEach((option, index) => {
                const optDiv = document.createElement('div');
                optDiv.className = 'custom-option';
                if (index === select.selectedIndex) optDiv.classList.add('selected');
                optDiv.innerHTML = formatOptionText(option.innerHTML);
                optDiv.dataset.value = option.value;
                
                optDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    select.selectedIndex = index;
                    trigger.innerHTML = `<div class="trigger-content" style="display:flex; align-items:center; gap:8px;">${formatOptionText(option.innerHTML)}<i data-lucide="chevron-down" style="width:16px;height:16px;"></i></div>`;
                    lucide.createIcons();
                    optionsContainer.classList.remove('open');
                    
                    Array.from(optionsContainer.children).forEach(c => c.classList.remove('selected'));
                    optDiv.classList.add('selected');
                });
                
                optionsContainer.appendChild(optDiv);
            });
            
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other open selects
                document.querySelectorAll('.custom-options').forEach(el => {
                    if (el !== optionsContainer) el.classList.remove('open');
                });
                optionsContainer.classList.toggle('open');
            });
            
            customSelect.appendChild(trigger);
            customSelect.appendChild(optionsContainer);
            
            select.parentNode.insertBefore(customSelect, select);
        });
        
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open'));
        });
    },

    initTheme: function() {
        // Force dark mode to ensure the new design shows up regardless of local storage cache
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
    },

    toggleTheme: function() {
        try {
            const current = document.documentElement.getAttribute('data-theme');
            let newTheme = 'dark';
            if (current === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                newTheme = 'light';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            }

            if (typeof window.SmartCityMap !== 'undefined' && window.SmartCityMap && typeof window.SmartCityMap.updateTheme === 'function') {
                window.SmartCityMap.updateTheme();
            }
            this.updateThemeIcon();
        } catch (e) {
            console.error('Error in toggleTheme:', e);
            alert('Error toggling theme: ' + e.message);
        }
    },

    detectUserCity: function() {
        const cityEl = document.getElementById('user-current-city');
        if (cityEl) {
            cityEl.textContent = 'Turkestan';
        }
    },

    updateUI: function() {
        if (this.currentUser) {
            const name = this.currentUser.fullName || 'User';
            const firstName = name.split(' ')[0];
            const hour = new Date().getHours();
            let greeting = 'Hello';
            if (hour < 12) greeting = 'Good Morning';
            else if (hour < 18) greeting = 'Good Afternoon';
            else greeting = 'Good Evening';
            document.getElementById('greeting-name').textContent = `${greeting}, ${firstName}`;
            
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff`;
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) userAvatar.src = avatarUrl;
            const navUserAvatar = document.getElementById('nav-user-avatar');
            if (navUserAvatar) navUserAvatar.src = avatarUrl;

            const navUserName = document.getElementById('nav-user-name');
            if (navUserName) navUserName.textContent = name;
            
            const roleLabels = {
                user: 'Citizen',
                volunteer: 'Volunteer',
                responder: 'Emergency Services',
                admin: 'Administrator'
            };
            const role = this.currentUser.role || 'citizen';
            
            // Adjust navigation visibility
            const navUserRole = document.getElementById('nav-user-role');
            if (navUserRole) navUserRole.textContent = roleLabels[role] || 'Citizen';

            // Show welcome text
            const welcomeEl = document.getElementById('hero-welcome-text');
            if (welcomeEl) welcomeEl.style.display = 'block';

            // Show/hide navbar "Tasks" link
            const navTasksLink = document.getElementById('nav-tasks-link');
            const mobileTasksLink = document.getElementById('mobile-tasks-link');
            if (role === 'volunteer' || role === 'responder' || role === 'admin') {
                if (navTasksLink) navTasksLink.style.display = 'flex';
                if (mobileTasksLink) mobileTasksLink.style.display = 'flex';
            } else {
                if (navTasksLink) navTasksLink.style.display = 'none';
                if (mobileTasksLink) mobileTasksLink.style.display = 'none';
            }

            // Update dashboard grid cards display based on role
            const sosCard = document.getElementById('dash-sos');
            const volunteerCard = document.getElementById('dash-volunteer-card');
            const responderCard = document.getElementById('dash-responder-card');

            if (role === 'user') {
                if (sosCard) sosCard.style.display = 'flex';
                if (volunteerCard) volunteerCard.style.display = 'none';
                if (responderCard) responderCard.style.display = 'none';
            } else if (role === 'volunteer') {
                if (sosCard) sosCard.style.display = 'none';
                if (volunteerCard) volunteerCard.style.display = 'flex';
                if (responderCard) responderCard.style.display = 'none';
            } else if (role === 'responder') {
                if (sosCard) sosCard.style.display = 'none';
                if (volunteerCard) volunteerCard.style.display = 'none';
                if (responderCard) responderCard.style.display = 'flex';
            } else if (role === 'admin') {
                if (sosCard) sosCard.style.display = 'flex';
                if (volunteerCard) volunteerCard.style.display = 'flex';
                if (responderCard) responderCard.style.display = 'flex';
            }

            // Load role-filtered feed and home stats
            this.loadFeed();
            this.updateHomeStats();
            this.detectUserCity();
        }
        this.updateThemeIcon();
    },

    feedReports: [],
    selectedTaskId: null,

    loadFeed: async function() {
        try {
            const res = await fetch('/api/reports/feed');
            
            // Check content type before parsing
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                if (!res.ok) {
                    const errorData = await res.json();
                    console.warn('Feed returned error:', errorData.error);
                    return;
                }
                const reports = await res.json();
                this.feedReports = reports;

                this.renderHomeFeed();
                this.renderTasksFeed();
            } else {
                console.error('Expected JSON from feed, but got:', contentType);
                const text = await res.text();
                console.error('Response preview:', text.substring(0, 100));
            }
        } catch(e) {
            console.error('Error loading feed:', e);
        }
    },

    updateHomeStats: async function() {
        try {
            const res = await fetch('/api/reports');
            if (res.ok) {
                const reports = await res.json();
                
                let totalSubmitted = reports.length;
                let activeCount = reports.filter(r => r.status === 'in_progress').length;
                let resolvedCount = reports.filter(r => r.status === 'resolved').length;
                let pendingCount = reports.filter(r => r.status === 'pending').length;

                if (this.currentUser && (this.currentUser.role === 'volunteer' || this.currentUser.role === 'responder')) {
                    const userId = this.currentUser.id;
                    activeCount = reports.filter(r => r.assignee_id === userId && r.status === 'in_progress').length;
                    resolvedCount = reports.filter(r => r.assignee_id === userId && r.status === 'resolved').length;
                    pendingCount = reports.filter(r => r.status === 'pending').length;
                    totalSubmitted = activeCount + resolvedCount + pendingCount;
                }

                const totalEl = document.getElementById('user-reports-count');
                const activeEl = document.getElementById('user-active-reports');
                const resolvedEl = document.getElementById('user-resolved-reports');
                const pendingEl = document.getElementById('user-pending-reports');

                if (totalEl) totalEl.textContent = totalSubmitted;
                if (activeEl) activeEl.textContent = activeCount;
                if (resolvedEl) resolvedEl.textContent = resolvedCount;
                if (pendingEl) pendingEl.textContent = pendingCount;
            }
        } catch(e) {
            console.error('Error fetching/updating home stats:', e);
        }
    },

    renderHomeFeed: function() {
        const container = document.getElementById('incident-feed');
        if (!container) return;

        const activeReports = this.feedReports.filter(r => r.status !== 'resolved' && r.status !== 'invalid').slice(0, 4);

        if (activeReports.length === 0) {
            container.innerHTML = `
                <div class="no-incidents-v3">
                    <i data-lucide="check-circle" style="width:24px; height:24px; color:var(--emerald-500);"></i>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">No active incidents in this area.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        const iconMap = { fire: 'flame', flooding: 'waves', 'road hazard': 'cone', accident: 'car', 'power outage': 'zap', other: 'alert-triangle' };
        
        container.innerHTML = activeReports.map(r => {
            const sev = r.severity || 'medium';
            const timeStr = this.formatTime(r.created_at);
            const statusLabel = r.status === 'in_progress' ? 'In Progress' : 'Pending';
            const statusClass = r.status === 'in_progress' ? 'status-active' : 'status-pending';

            const icon = iconMap[r.category] || 'alert-triangle';
            const categoryClass = r.category.replace(' ', '-');
            
            let displayTitle = r.title ? r.title.trim() : '';
            if (!displayTitle) {
                displayTitle = r.category.charAt(0).toUpperCase() + r.category.slice(1);
            } else if (displayTitle.toLowerCase() === 'fireee') {
                displayTitle = 'Fire';
            }
            
            const displayLocation = r.location ? r.location.split(',')[0] : 'Reported Area';

            return `
                <div class="telemetry-row-v3 border-left-sev-${sev}" onclick="app.openTaskDetail(${r.id})">
                    <div class="tel-left-v3">
                        <div class="tel-icon-wrap-v3 tel-icon-${categoryClass}">
                            <i data-lucide="${icon}"></i>
                        </div>
                        <div class="tel-meta-col-v3">
                            <span class="tel-title-v3">${displayTitle}</span>
                            <div class="tel-badge-row-v3">
                                <span class="tel-badge-v3 tel-badge-${statusClass}">${statusLabel}</span>
                                <span class="tel-severity-dot-v3 dot-${sev}"></span>
                                <span class="tel-severity-text-v3 text-${sev}">${sev.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <div class="tel-right-v3">
                        <span class="tel-address-v3">${displayLocation}</span>
                        <span class="tel-time-v3">${timeStr}</span>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    },

    renderActivityTimeline: function() {
        const timelineContainer = document.getElementById('activity-timeline');
        if (!timelineContainer) return;

        const timelineReports = this.feedReports.slice(0, 6);

        if (timelineReports.length === 0) {
            timelineContainer.innerHTML = `
                <div class="no-incidents-v3">
                    <i data-lucide="activity" style="width:24px; height:24px; color:var(--text-secondary);"></i>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">No recent activity logged.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        timelineContainer.innerHTML = timelineReports.map(r => {
            let logIcon = 'plus-circle';
            let logColorClass = 'log-new';
            let logMsg = '';

            const timeStr = this.formatTime(r.created_at);
            const locationStr = r.location ? r.location.split(',')[0] : 'reported area';
            const categoryStr = r.category.charAt(0).toUpperCase() + r.category.slice(1);

            if (r.status === 'resolved') {
                logIcon = 'check-circle';
                logColorClass = 'log-resolved';
                logMsg = `Report resolved: <strong>${categoryStr}</strong> resolved at ${locationStr}`;
            } else if (r.status === 'in_progress') {
                logIcon = 'shield';
                logColorClass = 'log-progress';
                logMsg = `Status update: <strong>${categoryStr}</strong> in progress at ${locationStr}`;
            } else {
                logIcon = 'alert-triangle';
                logColorClass = 'log-new';
                logMsg = `New alert: <strong>${categoryStr}</strong> reported at ${locationStr}`;
            }

            return `
                <div class="timeline-item-v3">
                    <div class="timeline-icon-wrap-v3 ${logColorClass}">
                        <i data-lucide="${logIcon}"></i>
                    </div>
                    <div class="timeline-content-v3">
                        <p class="timeline-text-v3">${logMsg}</p>
                        <span class="timeline-time-v3">${timeStr}</span>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    },

    renderTasksFeed: function() {
        const container = document.querySelector('#tasks-view .content-padded');
        if (!container) return;

        // Clear existing task cards
        container.querySelectorAll('.task-card').forEach(c => c.remove());

        const iconMap = { flooding: 'droplets', 'road hazard': 'cone', fire: 'flame', accident: 'car', 'power outage': 'zap', other: 'more-horizontal' };
        const severityColors = { low: 'blue-light', medium: 'orange-light', high: 'red-light' };
        const iconColors = { low: 'blue', medium: 'orange', high: 'red' };

        const userId = this.currentUser ? this.currentUser.id : null;

        const cardsHTML = this.feedReports.map(r => {
            let tab = 'upcoming'; // default
            if (r.status === 'in_progress') {
                if (r.assignee_id === userId) {
                    tab = 'in-progress';
                } else {
                    return ''; // hidden
                }
            } else if (r.status === 'resolved') {
                if (r.assignee_id === userId) {
                    tab = 'completed';
                } else {
                    return ''; // hidden
                }
            } else if (r.status === 'invalid') {
                return ''; // hidden
            }

            const sev = r.severity || 'medium';
            const iconBoxColor = severityColors[sev] || 'orange-light';
            const iconColor = iconColors[sev] || 'orange';
            const icon = iconMap[r.category] || 'alert-circle';
            const timeStr = this.formatTime(r.created_at);

            let footerHTML = '';
            if (tab === 'upcoming') {
                footerHTML = `
                    <span class="distance"><i data-lucide="clock"></i> ${timeStr}</span>
                    <span class="eta">Awaiting Help</span>
                `;
            } else if (tab === 'in-progress') {
                footerHTML = `
                    <span class="distance"><i data-lucide="clock"></i> ${timeStr}</span>
                    <span class="eta" style="color: var(--primary);"><span class="pulse-dot"></span> Active Mission</span>
                `;
            } else {
                footerHTML = `
                    <span class="distance"><i data-lucide="clock"></i> ${timeStr}</span>
                    <span class="eta" style="color: var(--green);"><i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Resolved</span>
                `;
            }

            const badgeClass = r.status === 'resolved' ? 'resolved' : sev;
            const badgeText = r.status === 'resolved' ? 'Done' : sev.charAt(0).toUpperCase() + sev.slice(1);

            return `
                <div class="task-card" data-tab="${tab}" onclick="app.openTaskDetail(${r.id})" style="display: none;">
                    <div class="task-header">
                        <div class="task-title-area">
                            <div class="icon-box ${iconBoxColor}"><i class="${iconColor}" data-lucide="${icon}"></i></div>
                            <div>
                                <h4>${r.title || r.category.toUpperCase()}</h4>
                                <p class="text-sm text-gray">${r.location || 'Reported area'}</p>
                            </div>
                        </div>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="task-footer">
                        ${footerHTML}
                    </div>
                </div>
            `;
        }).join('');

        container.insertAdjacentHTML('afterbegin', cardsHTML);

        // Find active tab and trigger switch to show cards
        const activeTabBtn = document.querySelector('#task-tabs .tab.active');
        if (activeTabBtn) {
            const tabName = activeTabBtn.textContent.toLowerCase().replace(' ', '-');
            this.switchTaskTab(activeTabBtn, tabName);
        } else {
            const firstTab = document.querySelector('#task-tabs .tab');
            if (firstTab) {
                this.switchTaskTab(firstTab, 'upcoming');
            }
        }

        if (window.lucide) lucide.createIcons();
    },

    acceptReportTask: async function(id) {
        try {
            const res = await fetch(`/api/reports/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'in_progress' })
            });
            if (res.ok) {
                alert('Task Accepted! You are now responsible for this task.');
                await this.loadFeed();
                this.navigateLayout('tasks-view');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to accept task.');
            }
        } catch(e) {
            alert('Error accepting task.');
        }
    },

    releaseReportTask: async function(id) {
        try {
            const res = await fetch(`/api/reports/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pending' })
            });
            if (res.ok) {
                alert('Task released back to the community.');
                await this.loadFeed();
                this.navigateLayout('tasks-view');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to release task.');
            }
        } catch(e) {
            alert('Error releasing task.');
        }
    },

    resolveReportTask: async function(id) {
        try {
            const res = await fetch(`/api/reports/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'resolved' })
            });
            if (res.ok) {
                await this.loadFeed();
                this.navigateLayout('success-view');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to resolve task.');
            }
        } catch(e) {
            alert('Error resolving task.');
        }
    },

    formatTime: function(isoString) {
        if (!isoString) return 'Unknown';
        const date = new Date(isoString);
        const diffMin = Math.floor((new Date() - date) / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin} min ago`;
        const diffHrs = Math.floor(diffMin / 60);
        if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    },

    updateThemeIcon: function() {
        try {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            
            // Recreate the i tag completely so Lucide can render it again
            document.querySelectorAll('.auth-theme-toggle').forEach(btn => {
                btn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}"></i>`;
            });
            
            document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
                btn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}"></i> <span>${isDark ? 'Light Mode' : 'Dark Mode'}</span>`;
            });
            
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        } catch(e) {
            console.error('Error updating theme icon:', e);
        }
    },

    // ==================== NAVIGATION ====================

    navigate: function(viewId) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        this.currentView = viewId;
        if (viewId === 'main-layout') {
            this.navigateLayout('user-home-view');
        }
    },

    navigateLayout: function(subViewId, navElement = null) {
        try {
            document.querySelectorAll('.sub-view').forEach(el => el.classList.remove('active'));
            document.getElementById(subViewId).classList.add('active');
            this.currentSubView = subViewId;
            
            // Strictly enforce no scrollbar on report view
            if (subViewId === 'report-view' || subViewId === 'report-success-view') {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            
            if (subViewId !== 'report-view' && subViewId !== 'success-view') {
                this.reportStep = 1;
                this.goToStep(this.reportStep);
            }

            // Initialize maps and load feeds
            if (subViewId === 'map-view') {
                setTimeout(() => { if (window.SmartCityMap) window.SmartCityMap.show(); }, 100);
            } else if (subViewId === 'report-view') {
                setTimeout(() => this.initReportMaps(), 100);
                this.goToStep(this.reportStep);
            } else if (subViewId === 'my-reports-view') {
                this.loadMyReports();
            } else if (subViewId === 'user-home-view') {
                if (this.updateHomeStats) this.updateHomeStats();
                this.loadFeed();
            } else if (subViewId === 'tasks-view') {
                const h2 = document.querySelector('#tasks-view .header-nav h2');
                if (h2) {
                    h2.textContent = (this.currentUser && (this.currentUser.role === 'citizen' || this.currentUser.role === 'user')) ? 'Recent Incidents' : 'Tasks';
                }
                this.loadFeed();
            }

            if (navElement) {
                this.updateNavState(navElement);
            } else {
                this.syncNavState(subViewId);
            }

            lucide.createIcons();
        } catch (err) {
            alert("Error in navigateLayout: " + err.message + "\nStack: " + err.stack);
            console.error(err);
        }
    },

    openVolunteerMap: function() {
        this.navigateLayout('map-view');
        setTimeout(() => {
            const btn = document.querySelector('.map-filter[data-filter="volunteers"]');
            if (btn) {
                if (window.SmartCityMap) SmartCityMap.filterMap('volunteers', btn);
            }
            const panel = document.getElementById('map-incident-panel');
            if (panel) {
                panel.classList.remove('collapsed');
            }
        }, 150);
    },

    updateNavState: function(activeEl) {
        // Just derive the viewId and let syncNavState handle it
        let viewId = activeEl.dataset && activeEl.dataset.view;
        if (!viewId) {
            // Try to extract from onclick
            const onclickAttr = activeEl.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/navigateLayout\('([^']+)'/);
                if (match) viewId = match[1];
            }
        }
        if (viewId) {
            this.syncNavState(viewId);
        }
    },

    syncNavState: function(viewId) {
        const iconMap = {
            'user-home-view': 'home',
            'map-view': 'map',
            'report-view': 'plus',
            'tasks-view': 'users',
            'task-detail-view': 'users',
            'alerts-view': 'bell',
            'my-reports-view': 'home',
            'report-success-view': 'home'
        };
        const targetIcon = iconMap[viewId];
        
        if (targetIcon) {
            ['.bottom-nav .nav-item', '.sidebar-nav .nav-item'].forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.classList.remove('active');
                    // Check for either the uninitialized <i> or the SVG created by lucide
                    const icon = el.querySelector(`[data-lucide="${targetIcon}"], .lucide-${targetIcon}`);
                    if (icon) {
                        el.classList.add('active');
                    }
                });
            });
        }

        // Sync top navbar links via data-view attribute
        document.querySelectorAll('.navbar-links .nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewId) {
                link.classList.add('active');
            }
        });
    },

    // ==================== REPORT FLOW ====================

    goToStep: function(step) {
        // Save data from current step before moving
        const titleEl = document.getElementById('rs-title');
        const descEl = document.getElementById('rs-desc');
        if (titleEl) this.reportData.title = titleEl.value;
        if (descEl) this.reportData.desc = descEl.value;

        // If going to step 3, populate review
        if (step === 3) {
            this.updateReviewStep();
        }
        
        this.reportStep = step;
        
        // Update Sidebar
        document.querySelectorAll('.step-item').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 === step) el.classList.add('active');
            else if (index + 1 < step) el.classList.add('completed');
        });
        
        // Update Content
        document.querySelectorAll('.rs-step').forEach(el => el.classList.remove('active'));
        const currentStepEl = document.getElementById(`rs-step-${this.reportStep}`);
        if (currentStepEl) currentStepEl.classList.add('active');
        
        // Handle Maps
        if (this.reportStep === 2) {
            setTimeout(() => {
                if (this.reportDesktopMap) this.reportDesktopMap.invalidateSize();
            }, 100);
        }
    },
    
    setCategory: function(el, category) {
        document.querySelectorAll('.cat-btn').forEach(item => item.classList.remove('active'));
        el.classList.add('active');
        this.reportData.category = category;
    },

    setPriority: function(el, severity) {
        document.querySelectorAll('.pri-card').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.radio-circle').forEach(item => item.classList.remove('active'));
        el.classList.add('active');
        el.querySelector('.radio-circle').classList.add('active');
        this.reportData.severity = severity;
    },

    // Old methods (keep for backwards compat if needed, but not used by new UI)
    selectCategory: function(el, category) {
        // unused
    },
    selectSeverity: function(el, severity) {
        // unused
    },

    handlePhotoUpload: function(event) {
        const file = event.target.files[0];
        if (file) {
            this.reportData.imageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.reportData.image = e.target.result;
                const preview = document.getElementById('report-photo-preview');
                preview.innerHTML = `<img src="${e.target.result}">`;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    },

    handleFileUpload: function(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Create local URL for preview
            const url = URL.createObjectURL(file);
            
            const mediaItem = {
                file: file,
                url: url,
                type: file.type
            };
            
            this.uploadedMedia.push(mediaItem);
            
            // Set as main image file if not already set (for backend compat)
            if (!this.reportData.imageFile && file.type.startsWith('image/')) {
                this.reportData.imageFile = file;
                this.reportData.image = url;
            }
        }
        
        this.renderMediaGallery();
        this.updateReviewStep();
    },

    renderMediaGallery: function() {
        const gallery = document.getElementById('rs-media-gallery');
        if (!gallery) return;
        
        if (this.uploadedMedia.length === 0) {
            gallery.innerHTML = '';
            return;
        }
        
        gallery.innerHTML = this.uploadedMedia.map((m, index) => {
            const isVideo = m.type.startsWith('video/');
            return `
                <div class="media-item">
                    ${isVideo ? `<video src="${m.url}" muted></video>` : `<img src="${m.url}">`}
                    <button type="button" class="remove-media" onclick="app.removeUploadedMedia(${index})">
                        <i data-lucide="x"></i>
                    </button>
                    ${isVideo ? `<div class="video-badge"><i data-lucide="video"></i></div>` : ''}
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    },

    removeUploadedMedia: function(index) {
        if (index >= 0 && index < this.uploadedMedia.length) {
            const item = this.uploadedMedia[index];
            if (item.url && item.url.startsWith('blob:')) {
                URL.revokeObjectURL(item.url);
            }
            
            this.uploadedMedia.splice(index, 1);
            
            // Recalculate main image file if needed
            if (this.reportData.imageFile === item.file) {
                const nextImage = this.uploadedMedia.find(m => m.type.startsWith('image/'));
                if (nextImage) {
                    this.reportData.imageFile = nextImage.file;
                    this.reportData.image = nextImage.url;
                } else {
                    this.reportData.imageFile = null;
                    this.reportData.image = null;
                }
            }
            
            this.renderMediaGallery();
            this.updateReviewStep();
        }
    },
    
    useCurrentLocation: function() {
        document.getElementById('report-location-text').innerText = 'Locating...';
        setTimeout(() => {
            document.getElementById('report-location-text').innerText = 'Your Current Location';
            if (this.reportDesktopMap) this.reportDesktopMap.setCenter([77.610, 12.934]);
            if (this.reportMobileMap) this.reportMobileMap.setCenter([77.610, 12.934]);
        }, 600);
    },

    submitNewReport: async function() {
        const btn = document.querySelector('.submit-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Submitting...';
        btn.disabled = true;
        lucide.createIcons();

        try {
            const formData = new FormData();
            formData.append('category', this.reportData.category);
            formData.append('title', this.reportData.title);
            formData.append('description', this.reportData.desc);
            formData.append('severity', this.reportData.severity);
            formData.append('location', this.reportData.address || '');
            formData.append('latitude', this.reportData.location.lat);
            formData.append('longitude', this.reportData.location.lng);

            // If imageFile is not set, use the first file from uploadedMedia
            if (!this.reportData.imageFile && this.uploadedMedia.length > 0) {
                this.reportData.imageFile = this.uploadedMedia[0].file;
            }

            if (this.reportData.imageFile) {
                formData.append('image', this.reportData.imageFile);
            }

            // Save to backend
            const res = await fetch('/api/reports', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to submit report.');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
        } catch (e) {
            console.error('Submit error:', e);
            // Continue anyway — show success even if server unreachable
        }

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (window.SmartCityMap) window.SmartCityMap.addReportMarker({lat: this.reportData.location.lat, lng: this.reportData.location.lng, title: this.reportData.title, category: this.reportData.category, severity: this.reportData.severity, address: this.reportData.address});

        // Update success view UI
        document.getElementById('success-category').innerText = this.reportData.category.charAt(0).toUpperCase() + this.reportData.category.slice(1);
        document.getElementById('success-location').innerText = this.reportData.address || 'Location reported';

        // Navigate to success & show report-success-view
        this.navigateLayout('report-success-view');

        // Reset form
        this.reportData = { category: 'flooding', severity: 'medium', location: {lat: 12.9716, lng: 77.5946}, address: 'Bengaluru, Karnataka', title: '', desc: '', image: null };
        this.uploadedMedia = [];
        document.getElementById('rs-title').value = '';
        document.getElementById('rs-desc').value = '';
        const gallery = document.getElementById('rs-media-gallery');
        if (gallery) gallery.innerHTML = '';
        const titleCount = document.getElementById('rs-title-count');
        const descCount = document.getElementById('rs-desc-count');
        if (titleCount) titleCount.textContent = '0 / 80';
        if (descCount) descCount.textContent = '0 / 500';

        // Update Home QA cards with real data
        if (this.updateHomeStats) {
            this.updateHomeStats();
        }
    },
    
    submitReport: function() {
        this.submitNewReport();
    },
    
    viewReportOnMap: function() {
        this.navigateLayout('map-view', document.querySelector('.bottom-nav .nav-item:nth-child(2)'));
    },
    
    initReportMaps: function() {
        if (!window.google || !window.google.maps) return;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        const desktopMapEl = document.getElementById('rs-map');
        if (desktopMapEl) {
            const currentPos = {
                lat: this.reportData.location.lat,
                lng: this.reportData.location.lng
            };

            if (!this.reportDesktopMap) {
                this.reportDesktopMap = new google.maps.Map(desktopMapEl, {
                    center: currentPos,
                    zoom: 14,
                    disableDefaultUI: true,
                    styles: isDark ? (window.SmartCityMap ? window.SmartCityMap.darkTheme : []) : (window.SmartCityMap ? window.SmartCityMap.lightTheme : [])
                });
                
                this.reportMarker = new google.maps.Marker({
                    position: currentPos,
                    map: this.reportDesktopMap,
                    draggable: true,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#10b981',
                        fillOpacity: 0.9,
                        strokeWeight: 2,
                        strokeColor: 'white',
                        scale: 8
                    }
                });

                // Allow placing a marker on click
                this.reportDesktopMap.addListener('click', (e) => {
                    const latLng = e.latLng;
                    const pos = { lat: latLng.lat(), lng: latLng.lng() };
                    
                    this.reportMarker.setPosition(latLng);
                    this.reportData.location = pos;
                    
                    // Lookup address
                    this.reverseGeocode(pos.lat, pos.lng);
                });

                // Allow dragging the marker to select location
                this.reportMarker.addListener('dragend', (e) => {
                    const latLng = e.latLng;
                    const pos = { lat: latLng.lat(), lng: latLng.lng() };
                    
                    this.reportData.location = pos;
                    
                    // Lookup address
                    this.reverseGeocode(pos.lat, pos.lng);
                });
            } else {
                // If map already initialized, just update the center and marker position
                this.reportDesktopMap.setCenter(currentPos);
                this.reportDesktopMap.setZoom(14);
                if (this.reportMarker) {
                    this.reportMarker.setPosition(currentPos);
                }
            }
        }
    },

    acceptTask: function() {
        const btn = document.querySelector('#task-detail-view .btn-primary');
        const originalText = btn.innerText;
        btn.innerText = 'Accepting...';
        setTimeout(() => {
            btn.innerText = originalText;
            alert('Task Accepted! You are now responsible for this task.');
            this.navigateLayout('success-view');
        }, 500);
    },
    selectReport: function(el) {
        document.querySelectorAll('.report-item').forEach(item => item.classList.remove('active'));
        el.classList.add('active');
    },

    // ==================== NEW: TASK TABS & DETAILS ====================

    openTaskDetail: function(reportId) {
        const report = this.feedReports.find(r => r.id === reportId);
        if (!report) {
            // Check if it's a demo task index fallback
            if (typeof reportId === 'number' && reportId < 10) {
                this.openDemoTaskDetail(reportId);
            }
            return;
        }

        // Store selected task ID and previous layout
        this.selectedTaskId = reportId;
        this.previousLayout = this.currentLayout;

        document.getElementById('td-title').textContent = report.title || report.category.toUpperCase();
        document.getElementById('td-location').textContent = report.location || 'Reported location';
        document.getElementById('td-time').textContent = this.formatTime(report.created_at);
        document.getElementById('td-desc').textContent = report.description || 'No description provided.';
        
        const badge = document.getElementById('td-badge');
        badge.textContent = report.severity.toUpperCase();
        badge.className = `badge ${report.severity === 'high' ? 'high' : report.severity === 'medium' ? 'medium' : 'low'}`;
        
        const img = document.getElementById('td-image');
        const pin = document.getElementById('td-pin');
        if (report.image_url) {
            img.src = report.image_url;
            img.style.display = 'block';
            pin.style.display = 'none';
        } else {
            img.src = "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80";
            img.style.display = 'block';
            pin.style.display = 'none';
        }

        // Update the buttons based on status
        const actionRow = document.querySelector('#task-detail-view .action-buttons-row');
        if (actionRow) {
            const role = this.currentUser ? (this.currentUser.role || 'citizen') : 'citizen';
            if (role === 'citizen' || role === 'user') {
                actionRow.innerHTML = `
                    <button class="btn btn-outline" style="flex:1" onclick="app.navigateLayout(app.previousLayout || 'user-home-view')">Back</button>
                `;
            } else {
                if (report.status === 'pending') {
                    actionRow.innerHTML = `
                        <button class="btn btn-outline" style="flex:1" onclick="app.navigateLayout(app.previousLayout || 'tasks-view')">Back</button>
                        <button class="btn btn-primary" style="flex:1" onclick="app.acceptReportTask(${reportId})">Accept Task</button>
                    `;
                } else if (report.status === 'in_progress') {
                    actionRow.innerHTML = `
                        <button class="btn btn-outline" style="flex:1" onclick="app.releaseReportTask(${reportId})">Abandon</button>
                        <button class="btn btn-primary" style="flex:1" onclick="app.resolveReportTask(${reportId})">Resolve Task</button>
                    `;
                } else {
                    // resolved
                    actionRow.innerHTML = `
                        <button class="btn btn-outline" style="flex:1" onclick="app.navigateLayout(app.previousLayout || 'tasks-view')">Back to Tasks</button>
                    `;
                }
            }
        }

        this.navigateLayout('task-detail-view');
    },

    openDemoTaskDetail: function(index) {
        if (!window.SmartCityMap || !SmartCityMap.demoData[index]) return;
        const task = SmartCityMap.demoData[index];
        
        document.getElementById('td-title').textContent = task.title;
        document.getElementById('td-location').textContent = task.location;
        document.getElementById('td-time').textContent = task.time;
        document.getElementById('td-desc').textContent = task.description;
        
        const badge = document.getElementById('td-badge');
        badge.textContent = task.severity || 'Normal';
        badge.className = `badge ${task.severity === 'HIGH' ? 'high' : task.severity === 'MED' ? 'medium' : 'low'}`;
        
        const img = document.getElementById('td-image');
        const pin = document.getElementById('td-pin');
        if (task.photo) {
            img.src = task.photo;
            img.style.display = 'block';
            pin.style.display = 'none';
        } else {
            img.style.display = 'none';
            pin.style.display = 'flex';
        }
        
        // Demo action buttons (default behavior)
        const actionRow = document.querySelector('#task-detail-view .action-buttons-row');
        if (actionRow) {
            const role = this.currentUser ? (this.currentUser.role || 'citizen') : 'citizen';
            if (role === 'citizen' || role === 'user') {
                actionRow.innerHTML = `
                    <button class="btn btn-outline" style="flex:1" onclick="app.navigateLayout(app.previousLayout || 'user-home-view')">Back</button>
                `;
            } else {
                actionRow.innerHTML = `
                    <button class="btn btn-outline" style="flex:1" onclick="app.navigateLayout(app.previousLayout || 'tasks-view')">Reject</button>
                    <button class="btn btn-primary" style="flex:1" onclick="app.acceptTask()">Accept</button>
                `;
            }
        }

        this.navigateLayout('task-detail-view');
    },

    switchTaskTab: function(btn, tabName) {
        // Update active tab button
        document.querySelectorAll('#task-tabs .tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        const container = document.querySelector('#tasks-view .content-padded');
        const taskCards = container.querySelectorAll('.task-card');
        
        let hasVisible = false;

        taskCards.forEach(c => {
            if (c.getAttribute('data-tab') === tabName) {
                c.style.display = 'block';
                hasVisible = true;
            } else {
                c.style.display = 'none';
            }
        });
        
        // Remove old empty messages
        const oldEmpty = container.querySelector('.empty-state-msg');
        if (oldEmpty) {
            oldEmpty.remove();
        }

        if (!hasVisible) {
            const empty = document.createElement('div');
            empty.className = 'empty-state-msg';
            empty.style.cssText = 'text-align:center; padding:40px 20px; color:var(--text-gray);';
            empty.innerHTML = '<i data-lucide="clipboard-check" style="width:48px;height:48px;margin-bottom:12px;"></i><p>No tasks here right now.</p>';
            container.appendChild(empty);
            if (window.lucide) {
                lucide.createIcons();
            }
        }
    },

    // ==================== NEW: ADMIN SIDEBAR NAV ====================

    switchAdminTab: function(navEl, tabName) {
        // Update active state in admin sidebar
        document.querySelectorAll('.admin-sidebar .nav-item').forEach(el => el.classList.remove('active'));
        if (navEl) navEl.classList.add('active');

        // Update the admin topbar title
        const topbarTitle = document.querySelector('.admin-topbar h3');
        if (topbarTitle) {
            topbarTitle.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);
        }

        // Show/hide content sections
        const adminContent = document.getElementById('ops-center-content') || document.querySelector('.admin-content');
        if (tabName === 'dashboard') {
            // Show everything (default state)
            adminContent.querySelectorAll('.stats-row, .ops-split-layout').forEach(el => el.style.display = 'flex');
            const placeholder = document.getElementById('admin-placeholder');
            if (placeholder) placeholder.remove();
            app.loadOperationsCenter(); // Load fresh data
        } else {
            // Hide dashboard content, show placeholder
            adminContent.querySelectorAll('.stats-row, .ops-split-layout').forEach(el => el.style.display = 'none');
            let placeholder = document.getElementById('admin-placeholder');
            if (!placeholder) {
                placeholder = document.createElement('div');
                placeholder.id = 'admin-placeholder';
                adminContent.appendChild(placeholder);
            }
            const icons = { reports: 'file-text', map: 'map', teams: 'users', settings: 'settings' };
            const descriptions = {
                reports: 'View and manage all submitted reports from citizens.',
                map: 'Interactive city map with live incident markers.',
                teams: 'Manage volunteer teams and response units.',
                settings: 'Configure system preferences and notifications.'
            };
            placeholder.style.cssText = 'text-align:center; padding:60px 20px; color:var(--text-gray);';
            placeholder.innerHTML = `
                <i data-lucide="${icons[tabName] || 'box'}" style="width:64px;height:64px;margin-bottom:16px;color:var(--admin-primary);"></i>
                <h3 style="color:var(--text-main);margin-bottom:8px;">${tabName.charAt(0).toUpperCase() + tabName.slice(1)}</h3>
                <p>${descriptions[tabName] || 'This section is coming soon.'}</p>
                <p style="margin-top:12px;font-size:0.85rem;">This feature is under development.</p>
            `;
            lucide.createIcons();
        }
    },

    // ==================== NEW: ADMIN ACTIONS ====================

    loadOperationsCenter: async function() {
        try {
            // Load KPIs
            const kpiRes = await fetch('/api/dashboard/kpis');
            if(kpiRes.ok) {
                const kpis = await kpiRes.json();
                const crisisEl = document.getElementById('ops-active-crises');
                if(crisisEl) crisisEl.textContent = kpis.activeCrises || 0;
                
                const critEl = document.getElementById('ops-critical-incidents');
                if(critEl) critEl.textContent = kpis.criticalIncidents || 0;
                
                const avgEl = document.getElementById('ops-avg-response');
                if(avgEl) avgEl.textContent = kpis.avgResponse || '0h 0m';
            }

            // Load Feed
            const feedRes = await fetch('/api/dashboard/feed');
            if(feedRes.ok) {
                const feed = await feedRes.json();
                const feedEl = document.getElementById('live-event-feed');
                if(feedEl) {
                    feedEl.innerHTML = '';
                    if(feed.length === 0) {
                        feedEl.innerHTML = '<div class="text-sm text-gray text-center" style="margin-top: 20px;">No events recorded.</div>';
                    } else {
                        feed.forEach(item => {
                            const date = new Date(item.timestamp);
                            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            let icon = 'activity';
                            if(item.action.toLowerCase().includes('crisis')) icon = 'alert-triangle';
                            else if(item.action.toLowerCase().includes('resolved') || item.action.toLowerCase().includes('closed')) icon = 'check-circle';
                            else if(item.action.toLowerCase().includes('classified')) icon = 'bot';
                            
                            feedEl.innerHTML += `
                                <div style="display:flex; gap: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; cursor: pointer; transition: background 0.2s; padding: 8px; border-radius: 8px;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'" onclick="app.showTimeline('${item.entity_type}', ${item.entity_id})">
                                    <div style="color: var(--admin-primary); margin-top:2px;"><i data-lucide="${icon}" style="width:18px;height:18px;"></i></div>
                                    <div>
                                        <div style="font-weight: 500; font-size: 0.95rem; color: #1e293b; line-height: 1.3;">${item.action}</div>
                                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">${timeStr} • ${item.entity_type.toUpperCase()} #${item.entity_id}</div>
                                    </div>
                                </div>
                            `;
                        });
                        if (window.lucide) lucide.createIcons();
                    }
                }
            }
        } catch(err) {
            console.error('Failed to load operations center', err);
        }
    },

    showTimeline: async function(type, id) {
        try {
            const res = await fetch(`/api/dashboard/timeline/${type}/${id}`);
            if(res.ok) {
                const timeline = await res.json();
                const container = document.getElementById('timeline-container');
                if(container) {
                    container.innerHTML = '';
                    
                    if(timeline.length === 0) {
                        container.innerHTML = '<div class="text-sm text-gray">No timeline available.</div>';
                    } else {
                        timeline.forEach(t => {
                            const date = new Date(t.timestamp);
                            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            
                            let color = 'var(--admin-primary)'; // purple
                            if(t.action.toLowerCase().includes('crisis')) color = 'var(--red)';
                            else if(t.action.toLowerCase().includes('resolved') || t.action.toLowerCase().includes('closed')) color = 'var(--green)';
                            else if(t.action.toLowerCase().includes('classified')) color = 'var(--blue)';
                            
                            container.innerHTML += `
                                <div style="position: relative; margin-bottom: 8px;">
                                    <div style="position: absolute; left: -31px; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2px solid #fff; box-shadow: 0 0 0 1px #e2e8f0;"></div>
                                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 2px;">${timeStr}</div>
                                    <div style="font-weight: 500; color: #1e293b; font-size: 0.95rem; line-height: 1.4;">${t.action}</div>
                                </div>
                            `;
                        });
                    }
                    
                    const modal = document.getElementById('timeline-modal');
                    if(modal) modal.style.display = 'flex';
                }
            }
        } catch(err) {
            console.error('Failed to load timeline', err);
        }
    },

    toggleAssign: function(btn) {
        document.querySelectorAll('.assign-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    markReportInvalid: function() {
        if (confirm('Are you sure you want to mark this report as invalid?')) {
            const btn = document.querySelector('.action-buttons-row .btn-outline');
            btn.textContent = 'Marked Invalid ✓';
            btn.style.color = 'var(--red)';
            btn.style.borderColor = 'var(--red)';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = 'Mark as Invalid';
                btn.style.color = '';
                btn.style.borderColor = '';
                btn.disabled = false;
            }, 3000);
        }
    },

    // ==================== NEW: FORGOT PASSWORD & FOOTER ====================

    showForgotPassword: function() {
        alert('Password Reset\n\nThis feature is not yet available. Please contact support at support@smartcity.app to reset your password.');
    },

    showFooterInfo: function(type) {
        const info = {
            privacy: 'Privacy Policy\n\nSmart City collects only necessary data to provide city safety services. Your personal information is encrypted and never shared with third parties without your consent.',
            terms: 'Terms of Service\n\nBy using Smart City, you agree to report incidents truthfully and use the platform responsibly. Misuse of the emergency reporting system may result in account suspension.',
            support: 'Support\n\nNeed help? Contact us:\n• Email: support@smartcity.app\n• Phone: +1-800-SMART-CITY\n• Hours: 24/7 for emergencies'
        };
        alert(info[type] || 'Information not available.');
    },

    // ==================== NEW: CHARACTER COUNTERS ====================

    updateCharCount: function(inputId, counterId, maxLength) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);
        if (input && counter) {
            counter.textContent = `${input.value.length} / ${maxLength}`;
        }
    },

    // ==================== NEW: REPORT LOCATION ====================

    useCurrentLocationReport: function() {
        const statusEl = document.querySelector('.accuracy');
        if (statusEl) statusEl.textContent = 'Locating...';

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.reportData.location = { lat, lng };
                    const accuracy = Math.round(position.coords.accuracy);
                    if (statusEl) statusEl.textContent = `Accuracy: ${accuracy}m`;

                    // Update map marker if map is initialized
                    if (this.reportDesktopMap) {
                        this.reportDesktopMap.setCenter({ lat, lng });
                        this.reportDesktopMap.setZoom(16);
                        if (this.reportMarker) this.reportMarker.setPosition({ lat, lng });
                    }

                    // Reverse geocode to get address
                    this.reverseGeocode(lat, lng);
                },
                (error) => {
                    if (statusEl) statusEl.textContent = 'Location unavailable';
                    alert('Could not get your location. Please allow location access or search manually.');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    },

    reverseGeocode: async function(lat, lng) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
                this.reportData.address = data.display_name.split(',').slice(0, 3).join(',');
                const searchInput = document.getElementById('rs-location-search');
                if (searchInput) searchInput.value = this.reportData.address;
            }
        } catch (e) { console.error('Reverse geocode error:', e); }
    },

    searchReportLocation: async function() {
        const input = document.getElementById('rs-location-search');
        const query = input ? input.value.trim() : '';
        if (!query) return;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                this.reportData.location = { lat, lng };
                this.reportData.address = data[0].display_name.split(',').slice(0, 3).join(',');

                if (this.reportDesktopMap) {
                    this.reportDesktopMap.setCenter({ lat, lng });
                    this.reportDesktopMap.setZoom(16);
                    if (this.reportMarker) this.reportMarker.setPosition({ lat, lng });
                }
            } else {
                alert('Location not found. Try a different search term.');
            }
        } catch (e) {
            alert('Error searching location. Check your internet connection.');
        }
    },

    // ==================== NEW: MY REPORTS ====================

    loadMyReports: async function() {
        const container = document.getElementById('my-reports-list');
        if (!container) return;

        container.innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-gray);"><i data-lucide="loader" class="spin" style="width:32px;height:32px;margin-bottom:12px;"></i><p>Loading your reports...</p></div>';
        lucide.createIcons();

        try {
            const res = await fetch('/api/reports');
            const reports = await res.json();

            if (!res.ok) {
                container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-gray);"><p>${reports.error || 'Could not load reports.'}</p></div>`;
                return;
            }

            if (reports.length === 0) {
                container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-gray);"><i data-lucide="file-text" style="width:48px;height:48px;margin-bottom:12px;"></i><p>You haven't submitted any reports yet.</p><button class="btn btn-primary" style="margin-top:16px;" onclick="app.navigateLayout('report-view')">Submit Your First Report</button></div>`;
                lucide.createIcons();
                return;
            }

            const iconMap = { flooding: 'droplets', 'road hazard': 'cone', fire: 'flame', accident: 'car', 'power outage': 'zap', other: 'more-horizontal' };
            const statusColors = { pending: 'feed-badge-medium', in_progress: 'feed-badge-high', resolved: 'feed-badge-resolved', invalid: 'feed-badge-medium' };

            container.innerHTML = reports.map(r => `
                <div class="feed-card">
                    <div class="feed-timeline"><div class="feed-dot feed-dot-${r.status === 'resolved' ? 'green' : r.status === 'pending' ? 'orange' : 'red'}"></div><div class="feed-line"></div></div>
                    <div class="feed-content">
                        <div class="feed-header">
                            <div class="feed-icon-wrap feed-icon-${r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'orange' : 'green'}">
                                <i data-lucide="${iconMap[r.category] || 'alert-circle'}"></i>
                            </div>
                            <div class="feed-info">
                                <h4>${r.title || r.category.charAt(0).toUpperCase() + r.category.slice(1)}</h4>
                                <p>${r.location || r.description || 'No description'}</p>
                            </div>
                            <span class="feed-badge ${statusColors[r.status] || 'feed-badge-medium'}">${(r.status || 'pending').replace('_', ' ').toUpperCase()}</span>
                        </div>
                        <div class="feed-footer">
                            <span class="feed-time"><i data-lucide="clock"></i> ${new Date(r.created_at).toLocaleDateString()}</span>
                            <span class="feed-status">${r.severity ? r.severity.toUpperCase() : 'MEDIUM'}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        } catch (e) {
            container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-gray);"><p>Server error. Make sure the server is running.</p></div>';
        }
    },

    // ==================== NEW: DYNAMIC REVIEW STEP ====================

    updateReviewStep: function() {
        // Category
        const catIconMap = { flooding: 'waves', 'road hazard': 'cone', fire: 'flame', accident: 'car', 'power outage': 'zap', other: 'more-horizontal' };
        const catName = this.reportData.category || 'Other';
        const catIcon = catIconMap[catName] || 'alert-circle';
        const catDisplay = catName.charAt(0).toUpperCase() + catName.slice(1);

        // Severity colors
        const sevColors = { low: 'text-green', medium: 'text-yellow', high: 'text-red' };
        const sevDotColors = { low: 'green', medium: 'yellow', high: 'red' };
        const severity = this.reportData.severity || 'medium';

        // Update review card values
        const reviewBody = document.querySelector('#rs-step-3 .review-card:first-child .review-body');
        if (reviewBody) {
            reviewBody.innerHTML = `
                <div class="r-row"><span class="r-label">Incident Type</span><strong class="r-value"><i data-lucide="${catIcon}" class="small-icon"></i> ${catDisplay}</strong></div>
                <div class="r-row"><span class="r-label">Title</span><strong class="r-value">${this.reportData.title || '(No title)'}</strong></div>
                <div class="r-row"><span class="r-label">Description</span><span class="r-value text-wrap">${this.reportData.desc || '(No description)'}</span></div>
                <div class="r-row"><span class="r-label">Priority</span><strong class="r-value ${sevColors[severity]}"><div class="dot ${sevDotColors[severity]}"></div> ${severity.charAt(0).toUpperCase() + severity.slice(1)}</strong></div>
            `;
            lucide.createIcons();
        }

        // Update location card
        const locBody = document.querySelector('#rs-step-3 .review-card:nth-child(2) .review-body .loc-text');
        if (locBody) {
            locBody.innerHTML = `
                <span class="r-label">Address</span>
                <strong class="r-value block">${this.reportData.address || 'Location not set'}</strong>
                <span class="r-label mt-2">Coordinates</span>
                <strong class="r-value block">${this.reportData.location.lat.toFixed(4)}, ${this.reportData.location.lng.toFixed(4)}</strong>
            `;
        }

        // Update media count
        const mediaBody = document.querySelector('#rs-step-3 .review-card:nth-child(3) .review-body');
        if (mediaBody) {
            const count = this.uploadedMedia.length;
            if (count === 0) {
                mediaBody.innerHTML = '<p class="r-label">No media uploaded</p>';
            } else {
                const imgs = this.uploadedMedia.filter(m => m.type.startsWith('image/')).length;
                const vids = this.uploadedMedia.filter(m => m.type.startsWith('video/')).length;
                let label = [];
                if (imgs > 0) label.push(`${imgs} photo${imgs > 1 ? 's' : ''}`);
                if (vids > 0) label.push(`${vids} video${vids > 1 ? 's' : ''}`);
                mediaBody.innerHTML = `<p class="r-label mb-2">${label.join(', ')}</p>
                    <div class="media-gallery small">${this.uploadedMedia.map(m =>
                        `<div class="media-item">${m.type.startsWith('video/') ? `<video src="${m.url}" muted></video>` : `<img src="${m.url}">`}</div>`
                    ).join('')}</div>`;
            }
        }
    },

    // ==================== EVENT LISTENERS ====================
};

document.getElementById('login-form').addEventListener('submit', (e) => app.login(e));
document.getElementById('register-form').addEventListener('submit', (e) => app.register(e));

// Check if already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    app.initTheme();
    app.initCustomSelects();
    lucide.createIcons();
    app.checkSession();
    app.updateThemeIcon();
    
    // Init Particles
    const bgContainer = document.querySelector('.bg-elements');
    if (bgContainer) {
        for (let i = 0; i < 40; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 4 + 1; // 1px to 5px
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDuration = `${Math.random() * 10 + 10}s`; // 10s to 20s
            particle.style.animationDelay = `${Math.random() * 5}s`;
            bgContainer.appendChild(particle);
        }
    }
    // Init Drag and Drop for report uploader
    const dropzone = document.querySelector('.upload-dropzone');
    if (dropzone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                app.handleFileUpload({ target: { files: files } });
            }
        }, false);
    }
});

// ==================== EDITORIAL DARK MAP LOGIC ====================
app.editorialData = {
    marker: null,
    files: []
};

app.initEditorialMap = function() {
    const canvas = document.getElementById('ed-map-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const redraw = () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            canvas.width = rect.width;
            canvas.height = rect.height;
            app.drawEditorialMap();
        }
    };
    
    const resizeObserver = new ResizeObserver(() => {
        redraw();
    });
    resizeObserver.observe(canvas.parentElement);
    
    // Also observe the step container for class changes (display: none to display: flex)
    const stepContainer = document.getElementById('rs-step-2');
    if (stepContainer) {
        const mutObserver = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.attributeName === 'class' && stepContainer.classList.contains('active')) {
                    setTimeout(redraw, 50);
                }
            });
        });
        mutObserver.observe(stepContainer, { attributes: true });
    }
    
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        app.setEditorialPin(x, y);
    });
};

app.drawEditorialMap = function() {
    const canvas = document.getElementById('ed-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const gridSize = 100;
    
    // Draw Blocks
    for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
            const seed = ((x * 17) + (y * 31)) % 100;
            // 70% chance of block
            if (seed < 70) { 
                ctx.fillStyle = seed < 15 ? 'rgba(18, 212, 114, 0.08)' : 'rgba(255, 255, 255, 0.02)';
                
                // padding for streets
                const padding = 6;
                let w = gridSize - padding*2;
                let h = gridSize - padding*2;
                
                // sometimes blocks span 2 wide
                if (seed > 60 && x + gridSize*2 <= canvas.width) {
                    w = (gridSize * 2) - padding*2;
                }
                
                ctx.beginPath();
                // Safe rounded rect using standard arcTo
                const radius = 8;
                const rx = x + padding;
                const ry = y + padding;
                ctx.moveTo(rx + radius, ry);
                ctx.lineTo(rx + w - radius, ry);
                ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + radius);
                ctx.lineTo(rx + w, ry + h - radius);
                ctx.quadraticCurveTo(rx + w, ry + h, rx + w - radius, ry + h);
                ctx.lineTo(rx + radius, ry + h);
                ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - radius);
                ctx.lineTo(rx, ry + radius);
                ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
                ctx.closePath();
                ctx.fill();
                
                // Labels
                if (seed === 5 || seed === 35) {
                    ctx.fillStyle = 'rgba(18, 212, 114, 0.4)';
                    ctx.font = '10px JetBrains Mono';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const text = seed === 5 ? 'Park' : 'Block C';
                    ctx.fillText(text, x + padding + w/2, y + padding + h/2);
                }
            }
        }
    }

    // Draw Grid Lines (Streets)
    ctx.strokeStyle = 'rgba(18, 212, 114, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
    
    // Draw marker if exists
    if (app.editorialData.marker) {
        const { x, y } = app.editorialData.marker;
        
        // Concentric rings
        ctx.strokeStyle = 'rgba(18, 212, 114, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(18, 212, 114, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // Dot
        ctx.fillStyle = '#12d472';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Tick lines
        ctx.strokeStyle = '#12d472';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x - 12, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 24, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y - 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x, y + 24); ctx.stroke();
    }
};

const fakeAddresses = [
    "742 Evergreen Terrace",
    "221B Baker Street",
    "1600 Pennsylvania Ave",
    "350 Fifth Avenue",
    "10 Downing Street",
    "11 Wall Street",
    "405 Lexington Ave",
    "1 Infinite Loop"
];

app.setEditorialPin = function(x, y) {
    app.editorialData.marker = { x, y };
    app.drawEditorialMap();
    
    const hint = document.getElementById('ed-map-hint');
    if (hint) hint.style.opacity = '0';
    
    // Compute fake lat/lng
    const fakeLat = (34.0522 + (y / 1000)).toFixed(6);
    const fakeLng = (-118.2437 + (x / 1000)).toFixed(6);
    
    // Pick address from hash
    const hash = Math.floor(x + y) % fakeAddresses.length;
    const address = fakeAddresses[hash];
    
    // Resolve into left panel
    document.getElementById('ed-loc-placeholder').style.display = 'none';
    const activeLoc = document.getElementById('ed-loc-active');
    activeLoc.style.display = 'flex';
    
    document.getElementById('ed-address-text').innerText = address;
    document.getElementById('ed-coords-text').innerText = `${fakeLat}, ${fakeLng}`;
    
    // Update search bar
    document.getElementById('ed-search-input').value = address;
};

app.clearEditorialPin = function() {
    app.editorialData.marker = null;
    app.drawEditorialMap();
    
    document.getElementById('ed-loc-placeholder').style.display = 'flex';
    document.getElementById('ed-loc-active').style.display = 'none';
    document.getElementById('ed-search-input').value = '';
    
    const hint = document.getElementById('ed-map-hint');
    if (hint) hint.style.opacity = '1';
};

app.handleEditorialFileUpload = function(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    
    const gallery = document.getElementById('ed-media-gallery');
    
    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const id = 'media-' + Date.now() + '-' + Math.floor(Math.random()*1000);
            
            const thumb = document.createElement('div');
            thumb.className = 'ed-media-thumb';
            thumb.id = id;
            
            thumb.innerHTML = `
                <img src="${dataUrl}" alt="upload">
                <button onclick="document.getElementById('${id}').remove()"><i data-lucide="x"></i></button>
            `;
            
            gallery.appendChild(thumb);
            if (window.lucide) lucide.createIcons();
        };
        reader.readAsDataURL(file);
    });
    
    event.target.value = ''; // reset
};

// Initialize the map once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        app.initEditorialMap();
    }, 500);
});
