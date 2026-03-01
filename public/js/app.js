/* ============================================
   CeramicDB — Core Application Module
   ============================================ */

const App = {
    user: null,
    currentPage: 'dashboard',

    // ---- API Client ----
    async api(url, options = {}) {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            credentials: 'same-origin',
            ...options
        });
        if (res.status === 401 && url !== '/api/auth/me') {
            this.showAuth();
            throw new Error('Not authenticated');
        }
        const data = options.raw ? res : await res.json();
        if (!res.ok && !options.raw) throw new Error(data.error || 'Request failed');
        return data;
    },

    // ---- Notifications ----
    notify(message, type = 'info') {
        const area = document.getElementById('notification-area');
        const el = document.createElement('div');
        el.className = `notification notification-${type}`;
        el.textContent = message;
        area.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
    },

    // ---- Auth ----
    showAuth() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    },

    showApp() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        if (this.user) {
            const initials = (this.user.first_name[0] + this.user.last_name[0]).toUpperCase();
            document.getElementById('user-avatar').textContent = initials;
            document.getElementById('user-name').textContent = `${this.user.first_name} ${this.user.last_name}`;
            document.getElementById('user-role').textContent = this.user.role;
        }
        this.navigate('dashboard');
    },

    showLogin() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
    },

    showRegister() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    },

    async login(e) {
        e.preventDefault();
        try {
            const data = await this.api('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: document.getElementById('login-email').value,
                    password: document.getElementById('login-password').value
                })
            });
            this.user = data.user;
            this.showApp();
            this.notify(`Welcome back, ${this.user.first_name}!`, 'success');
        } catch (err) {
            this.notify(err.message, 'error');
        }
        return false;
    },

    async register(e) {
        e.preventDefault();
        try {
            const data = await this.api('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: document.getElementById('reg-email').value,
                    password: document.getElementById('reg-password').value,
                    first_name: document.getElementById('reg-fname').value,
                    last_name: document.getElementById('reg-lname').value,
                    university: document.getElementById('reg-university').value,
                    department: document.getElementById('reg-department').value
                })
            });
            this.user = data.user;
            this.showApp();
            this.notify('Account created successfully!', 'success');
        } catch (err) {
            this.notify(err.message, 'error');
        }
        return false;
    },

    async logout() {
        await this.api('/api/auth/logout', { method: 'POST' });
        this.user = null;
        this.showAuth();
    },

    async checkAuth() {
        try {
            const data = await this.api('/api/auth/me');
            this.user = data.user;
            this.showApp();
        } catch {
            this.showAuth();
        }
    },

    // ---- Navigation ----
    navigate(page) {
        this.currentPage = page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));

        const pageEl = document.getElementById(`page-${page}`);
        const navEl = document.getElementById(`nav-${page}`);
        if (pageEl) pageEl.classList.add('active');
        if (navEl) navEl.classList.add('active');

        // Load page content
        switch (page) {
            case 'dashboard': Dashboard.load(); break;
            case 'samples': Samples.load(); break;
            case 'analyses': Analyses.load(); break;
            case 'petrography': Petrography.load(); break;
            case 'processing': Processing.load(); break;
            case 'projects': Projects.load(); break;
            case 'fabric-groups': Petrography.loadFabricGroups(); break;
            case 'import-export': ImportExport.init(); break;
            case 'sop': SOP.init(); break;
        }
    },

    // ---- Modal ----
    openModal(html) {
        document.getElementById('modal-content').innerHTML = html;
        document.getElementById('modal-overlay').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
        document.getElementById('modal-content').innerHTML = '';
    },

    // ---- Helpers ----
    formatDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
};

// Setup nav click handlers
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            App.navigate(link.dataset.page);
        });
    });

    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) App.closeModal();
    });

    App.checkAuth();
});
