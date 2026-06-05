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
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
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

    updateUI: function() {
        if (this.currentUser) {
            const name = this.currentUser.fullName || 'User';
            const firstName = name.split(' ')[0];
            document.getElementById('greeting-name').textContent = `Hello, ${firstName}!`;
            document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=27ae60&color=fff`;
            // Show welcome text
            const welcomeEl = document.getElementById('hero-welcome-text');
            if (welcomeEl) welcomeEl.style.display = 'block';
        }
        this.updateThemeIcon();
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
            // Initialize maps
            if (subViewId === 'map-view') {
                setTimeout(() => { if (window.SmartCityMap) window.SmartCityMap.show(); }, 100);
            } else if (subViewId === 'report-view') {
                setTimeout(() => this.initReportMaps(), 100);
                this.goToStep(this.reportStep);
            } else if (subViewId === 'my-reports-view') {
                this.loadMyReports();
            } else if (subViewId === 'user-home-view') {
                if (this.updateHomeStats) this.updateHomeStats();
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
        const selectors = ['.bottom-nav .nav-item', '.sidebar-nav .nav-item'];
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.classList.remove('active'));
        });
        const icon = activeEl.querySelector('i');
        if (!icon) return;
        const iconName = icon.getAttribute('data-lucide');
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                const i = el.querySelector('i');
                if (i && i.getAttribute('data-lucide') === iconName) {
                    el.classList.add('active');
                }
            });
        });
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
        if (!targetIcon) return;
        ['.bottom-nav .nav-item', '.sidebar-nav .nav-item'].forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.remove('active');
                const i = el.querySelector('i');
                if (i && i.getAttribute('data-lucide') === targetIcon) {
                    el.classList.add('active');
                }
            });
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
            // Save to backend
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: this.reportData.category,
                    title: this.reportData.title,
                    description: this.reportData.desc,
                    severity: this.reportData.severity,
                    location: this.reportData.address || '',
                    latitude: this.reportData.location.lat,
                    longitude: this.reportData.location.lng
                })
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
        if (!window.mapgl) return;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        const desktopMapEl = document.getElementById('rs-map');
        if (desktopMapEl && !this.reportDesktopMap) {
            this.reportDesktopMap = new mapgl.Map('rs-map', {
                center: [this.reportData.location.lng, this.reportData.location.lat],
                zoom: 14,
                key: 'bfd8bbca-8abf-11ea-b033-5fa57aae2de7',
                zoomControl: false,
                style: isDark ? 'a112cbc8-fbd3-4f93-b816-e5dfbb93026a' : 'c080bb6a-8134-4993-93a1-5b4d8c36a59b'
            });
            
            this.reportMarker = new mapgl.HtmlMarker(this.reportDesktopMap, {
                coordinates: [this.reportData.location.lng, this.reportData.location.lat],
                html: '<div style="width:24px;height:24px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(16,185,129,0.8);transform:translate(-50%, -50%);"></div>'
            });

            this.reportDesktopMap.on('click', (e) => {
                if (this.reportMarker) {
                    const coords = e.lngLat;
                    this.reportMarker.setCoordinates(coords);
                    this.reportData.location = { lat: coords[1], lng: coords[0] };
                }
            });
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

    openTaskDetail: function(index) {
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
        const adminContent = document.querySelector('.admin-content');
        if (tabName === 'dashboard') {
            // Show everything (default state)
            adminContent.querySelectorAll('.stats-row, .admin-grid').forEach(el => el.style.display = '');
            const placeholder = document.getElementById('admin-placeholder');
            if (placeholder) placeholder.remove();
        } else {
            // Hide dashboard content, show placeholder
            adminContent.querySelectorAll('.stats-row, .admin-grid').forEach(el => el.style.display = 'none');
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
                        this.reportDesktopMap.setCenter([lng, lat]);
                        this.reportDesktopMap.setZoom(16);
                        if (this.reportMarker) this.reportMarker.setCoordinates([lng, lat]);
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
                        `<div class="media-item"><img src="${m.url}"></div>`
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
});
