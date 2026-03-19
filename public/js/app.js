// FENAVI Importaciones - Modern vanilla JS (no jQuery)
'use strict';

const App = {
  // Safe DOM query
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  // Fetch with error handling
  async fetchJSON(url) {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Error de conexión' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Text content sanitization (prevent XSS in dynamic content)
  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Format currency
  formatCurrency(value) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  },

  // Show loading state
  showLoading(container) {
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Cargando...</p>
      </div>`;
  },

  // Show error
  showError(container, message) {
    container.innerHTML = `
      <div class="alert alert--error">
        ${this.escapeHTML(message)}
      </div>`;
  },

  // Mobile nav toggle
  initNav() {
    const toggle = this.$('.nav-toggle');
    const menu = this.$('.nav-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        menu.classList.toggle('open');
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
      });
      // Close menu on link click
      this.$$('.nav-menu a', menu).forEach(link => {
        link.addEventListener('click', () => menu.classList.remove('open'));
      });
    }
  },

  // Mark active nav link
  setActiveNav() {
    const path = window.location.pathname;
    this.$$('.nav-menu a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === path || (path === '/' && href === '/')) {
        link.classList.add('active');
      }
    });
  },

  init() {
    this.initNav();
    this.setActiveNav();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
