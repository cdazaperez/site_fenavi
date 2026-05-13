'use strict';

const Admin = {
  token: localStorage.getItem('fenavi_token'),
  user: JSON.parse(localStorage.getItem('fenavi_user') || 'null'),
  currentSection: 'dashboard',

  // ── Helpers ──

  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  async api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`/admin${path}`, { ...options, headers });

    if (res.status === 401) {
      this.logout();
      throw new Error('Sesión expirada');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return res.json();
  },

  async apiUpload(path, formData, method = 'POST') {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`/admin${path}`, { method, headers, body: formData });

    if (res.status === 401) {
      this.logout();
      throw new Error('Sesión expirada');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return res.json();
  },

  // ── Auth ──

  async login(username, password) {
    const data = await this.api('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem('fenavi_token', data.token);
    localStorage.setItem('fenavi_user', JSON.stringify(data.user));
    this.render();
  },

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('fenavi_token');
    localStorage.removeItem('fenavi_user');
    this.render();
  },

  // ── Render ──

  render() {
    const app = document.getElementById('admin-app');
    if (!this.token) {
      app.innerHTML = this.loginTemplate();
      this.bindLogin();
    } else {
      app.innerHTML = this.panelTemplate();
      this.bindPanel();
      this.navigateTo(this.currentSection);
    }
  },

  loginTemplate() {
    return `
      <div class="login-page">
        <div class="login-card">
          <h1>Panel de Administración</h1>
          <p>FENAVI - Importaciones Avícolas</p>
          <div id="login-error"></div>
          <form id="login-form">
            <div class="form-group">
              <label for="username">Usuario</label>
              <input type="text" id="username" autocomplete="username" required>
            </div>
            <div class="form-group">
              <label for="password">Contraseña</label>
              <input type="password" id="password" autocomplete="current-password" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem">
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>`;
  },

  panelTemplate() {
    return `
      <div class="admin-layout">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <h2>FENAVI Admin</h2>
            <small>${this.escapeHTML(this.user?.nombre || '')}</small>
          </div>
          <ul class="sidebar-nav">
            <li><a href="#" data-section="dashboard" class="active">Dashboard</a></li>
            <li><a href="#" data-section="productos">Productos</a></li>
            <li><a href="#" data-section="normatividad">Normatividad</a></li>
            <li><a href="#" data-section="pasos">Pasos Importación</a></li>
            <li><a href="#" data-section="tlc">TLC</a></li>
            <li><a href="#" data-section="documentos">Documentos</a></li>
            ${this.user?.rol === 'admin' ? '<li><a href="#" data-section="usuarios">Usuarios</a></li>' : ''}
            ${this.user?.rol === 'admin' ? '<li><a href="#" data-section="audit">Auditoría</a></li>' : ''}
          </ul>
          <div class="sidebar-footer">
            <button class="btn btn-sm" id="btn-logout" style="color:rgba(255,255,255,0.6);background:none;border:none;cursor:pointer;font-family:inherit">
              Cerrar sesión
            </button>
            <br>
            <a href="/" style="font-size:0.75rem">Volver al sitio</a>
          </div>
        </aside>
        <main class="admin-main" id="admin-content">
          <div class="loading"><div class="spinner"></div><p>Cargando...</p></div>
        </main>
      </div>
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal" id="modal">
          <div class="modal-header">
            <h3 id="modal-title">Modal</h3>
            <button class="modal-close" id="modal-close">&times;</button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer" id="modal-footer"></div>
        </div>
      </div>`;
  },

  // ── Binding ──

  bindLogin() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('login-error');
      try {
        await this.login(username, password);
      } catch (err) {
        errorDiv.innerHTML = `<div class="alert alert--error">${this.escapeHTML(err.message)}</div>`;
      }
    });
  },

  bindPanel() {
    document.getElementById('btn-logout').addEventListener('click', () => this.logout());

    document.querySelectorAll('.sidebar-nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.navigateTo(section);
      });
    });

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });
  },

  // ── Navigation ──

  async navigateTo(section) {
    this.currentSection = section;
    const content = document.getElementById('admin-content');
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';

    try {
      switch (section) {
        case 'dashboard': await this.renderDashboard(content); break;
        case 'productos': await this.renderCRUD(content, 'productos', 'Productos', this.productosColumns()); break;
        case 'normatividad': await this.renderCRUD(content, 'normatividad', 'Normatividad', this.normatividadColumns()); break;
        case 'pasos': await this.renderCRUD(content, 'pasos', 'Pasos de Importación', this.pasosColumns()); break;
        case 'tlc': await this.renderCRUD(content, 'tlc', 'Información TLC', this.tlcColumns()); break;
        case 'documentos': await this.renderCRUD(content, 'documentos', 'Documentos', this.documentosColumns()); break;
        case 'usuarios': await this.renderUsuarios(content); break;
        case 'audit': await this.renderAudit(content); break;
      }
    } catch (err) {
      content.innerHTML = `<div class="alert alert--error">${this.escapeHTML(err.message)}</div>`;
    }
  },

  // ── Dashboard ──

  async renderDashboard(container) {
    const [productos, normatividad, pasos, tlc, documentos] = await Promise.all([
      this.api('/productos'), this.api('/normatividad'),
      this.api('/pasos'), this.api('/tlc'), this.api('/documentos'),
    ]);

    container.innerHTML = `
      <div class="admin-header"><h1>Dashboard</h1></div>
      <div class="stats-grid">
        <div class="stat-card"><h3>Productos</h3><div class="stat-value">${productos.data.length}</div></div>
        <div class="stat-card"><h3>Normas</h3><div class="stat-value">${normatividad.data.length}</div></div>
        <div class="stat-card"><h3>Pasos</h3><div class="stat-value">${pasos.data.length}</div></div>
        <div class="stat-card"><h3>Info TLC</h3><div class="stat-value">${tlc.data.length}</div></div>
        <div class="stat-card"><h3>Documentos</h3><div class="stat-value">${documentos.data.length}</div></div>
      </div>
      <div class="card" style="padding:1.5rem">
        <h3 style="margin-bottom:1rem">Bienvenido al Panel de Administración</h3>
        <p style="color:var(--color-text-light)">Desde aquí puede gestionar todo el contenido del portal de importaciones de FENAVI. Use el menú lateral para navegar entre las diferentes secciones.</p>
        <ul style="margin-top:1rem;color:var(--color-text-light);padding-left:1.25rem">
          <li><strong>Productos:</strong> Subpartidas arancelarias y tributos</li>
          <li><strong>Normatividad:</strong> Decretos, resoluciones, circulares y leyes</li>
          <li><strong>Pasos:</strong> Proceso paso a paso de importación</li>
          <li><strong>TLC:</strong> Información del Tratado de Libre Comercio</li>
        </ul>
      </div>`;
  },

  // ── Generic CRUD ──

  async renderCRUD(container, resource, title, columns) {
    const { data } = await this.api(`/${resource}`);

    container.innerHTML = `
      <div class="admin-header">
        <h1>${this.escapeHTML(title)}</h1>
        <button class="btn btn-primary btn-sm" id="btn-create">+ Nuevo</button>
      </div>
      <div class="table-wrapper" style="overflow-x:auto">
        <table class="admin-table">
          <thead>
            <tr>
              ${columns.map(c => `<th>${this.escapeHTML(c.label)}</th>`).join('')}
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="crud-body"></tbody>
        </table>
      </div>`;

    const tbody = document.getElementById('crud-body');
    for (const item of data) {
      const row = document.createElement('tr');
      row.innerHTML = `
        ${columns.map(c => `<td>${c.render ? c.render(item) : this.escapeHTML(String(item[c.key] ?? ''))}</td>`).join('')}
        <td><span class="${item.activo ? 'status-active' : 'status-inactive'}">${item.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td class="actions">
          <button class="btn btn-sm btn-edit" data-id="${item.id}">Editar</button>
          <button class="btn btn-sm btn-toggle" data-id="${item.id}" data-active="${item.activo}">${item.activo ? 'Desactivar' : 'Activar'}</button>
          ${this.user?.rol === 'admin' ? `<button class="btn btn-sm btn-delete" data-id="${item.id}">Eliminar</button>` : ''}
        </td>`;
      tbody.appendChild(row);
    }

    const openForm = resource === 'documentos'
      ? (item) => this.openDocFormModal(item)
      : (item) => this.openFormModal(resource, title, columns, item);

    document.getElementById('btn-create').addEventListener('click', () => openForm(null));

    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = parseInt(btn.dataset.id, 10);
      const item = data.find(d => d.id === id);

      if (btn.classList.contains('btn-edit')) {
        openForm(item);
      } else if (btn.classList.contains('btn-toggle')) {
        await this.toggleActive(resource, item, columns);
      } else if (btn.classList.contains('btn-delete')) {
        await this.deleteItem(resource, id);
      }
    });
  },

  openFormModal(resource, title, columns, item) {
    const isEdit = !!item;
    document.getElementById('modal-title').textContent = isEdit ? `Editar ${title}` : `Nuevo ${title}`;

    const formFields = columns
      .filter(c => c.editable !== false)
      .map(c => {
        const val = item ? (item[c.key] ?? '') : (c.default ?? '');
        if (c.type === 'select') {
          return `<div class="form-group">
            <label for="field-${c.key}">${this.escapeHTML(c.label)}</label>
            <select id="field-${c.key}">
              ${c.options.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('')}
            </select>
          </div>`;
        }
        if (c.type === 'textarea') {
          return `<div class="form-group">
            <label for="field-${c.key}">${this.escapeHTML(c.label)}</label>
            <textarea id="field-${c.key}" rows="4" style="width:100%;padding:0.625rem;border:2px solid var(--color-border);border-radius:var(--radius-md);font-family:inherit;resize:vertical">${this.escapeHTML(String(val))}</textarea>
          </div>`;
        }
        return `<div class="form-group">
          <label for="field-${c.key}">${this.escapeHTML(c.label)}</label>
          <input type="${c.type || 'text'}" id="field-${c.key}" value="${this.escapeHTML(String(val))}" ${c.required ? 'required' : ''}>
        </div>`;
      }).join('');

    document.getElementById('modal-body').innerHTML = `
      <form id="crud-form">${formFields}<div id="form-error"></div></form>`;

    document.getElementById('modal-footer').innerHTML = `
      <button class="btn btn-outline btn-sm" id="modal-cancel">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="modal-save">${isEdit ? 'Guardar' : 'Crear'}</button>`;

    this.openModal();

    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-save').addEventListener('click', async () => {
      const formData = {};
      columns.filter(c => c.editable !== false).forEach(c => {
        const el = document.getElementById(`field-${c.key}`);
        if (!el) return;
        let val = el.value;
        if (c.type === 'number') val = parseFloat(val) || 0;
        formData[c.key] = val;
      });

      try {
        if (isEdit) {
          if (item.activo !== undefined) formData.activo = item.activo;
          await this.api(`/${resource}/${item.id}`, { method: 'PUT', body: JSON.stringify(formData) });
        } else {
          await this.api(`/${resource}`, { method: 'POST', body: JSON.stringify(formData) });
        }
        this.closeModal();
        this.navigateTo(this.currentSection);
      } catch (err) {
        document.getElementById('form-error').innerHTML =
          `<div class="alert alert--error" style="margin-top:1rem">${this.escapeHTML(err.message)}</div>`;
      }
    });
  },

  async toggleActive(resource, item, columns) {
    const updated = { ...item, activo: item.activo ? 0 : 1 };
    const body = {};
    columns.filter(c => c.editable !== false).forEach(c => {
      body[c.key] = updated[c.key];
    });
    body.activo = updated.activo;
    await this.api(`/${resource}/${item.id}`, { method: 'PUT', body: JSON.stringify(body) });
    this.navigateTo(this.currentSection);
  },

  async deleteItem(resource, id) {
    if (!confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) return;
    await this.api(`/${resource}/${id}`, { method: 'DELETE' });
    this.navigateTo(this.currentSection);
  },

  // ── Column Definitions ──

  productosColumns() {
    return [
      { key: 'subpartida', label: 'Subpartida', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea', required: true },
      { key: 'arancel_base', label: 'Arancel Base (%)', type: 'number', required: true },
      { key: 'arancel_tlc', label: 'Arancel TLC (%)', type: 'number', required: true },
      { key: 'iva', label: 'IVA (%)', type: 'number', required: true },
      { key: 'categoria_desgravacion', label: 'Categoría', default: '' },
      { key: 'contingente', label: 'Contingente', default: '' },
      { key: 'notas', label: 'Notas', type: 'textarea', default: '' },
    ];
  },

  normatividadColumns() {
    return [
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['decreto', 'resolucion', 'circular', 'ley', 'otro'],
        render: (item) => `<span class="badge badge--${this.escapeHTML(item.tipo)}">${this.escapeHTML(item.tipo)}</span>` },
      { key: 'numero', label: 'Número', required: true },
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'entidad', label: 'Entidad', required: true },
      { key: 'titulo', label: 'Título', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea' },
      { key: 'url_documento', label: 'URL Documento', editable: true },
    ];
  },

  pasosColumns() {
    return [
      { key: 'orden', label: 'Orden', type: 'number', required: true },
      { key: 'titulo', label: 'Título', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea', required: true },
      { key: 'entidad_responsable', label: 'Entidad Responsable' },
      { key: 'documentos_requeridos', label: 'Documentos Requeridos', type: 'textarea' },
      { key: 'tiempo_estimado', label: 'Tiempo Estimado' },
      { key: 'icono', label: 'Icono' },
    ];
  },

  tlcColumns() {
    return [
      { key: 'seccion', label: 'Sección', required: true },
      { key: 'titulo', label: 'Título', required: true },
      { key: 'contenido', label: 'Contenido', type: 'textarea', required: true },
      { key: 'orden', label: 'Orden', type: 'number', required: true },
    ];
  },

  documentosColumns() {
    return [
      { key: 'titulo', label: 'Título', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea' },
      { key: 'categoria', label: 'Categoría', type: 'select', options: ['guia', 'manual', 'normativa', 'formato', 'general'],
        render: (item) => `<span class="badge badge--${this.escapeHTML(item.categoria)}">${this.escapeHTML(item.categoria)}</span>` },
      { key: 'nombre_archivo', label: 'Archivo', editable: false,
        render: (item) => item.url_archivo && item.url_archivo.startsWith('/docs/')
          ? `<a href="${this.escapeHTML(item.url_archivo)}" target="_blank" rel="noopener">${this.escapeHTML(item.nombre_archivo)}</a>`
          : this.escapeHTML(item.nombre_archivo || '') },
      { key: 'tamano', label: 'Tamaño', editable: false },
    ];
  },

  // ── Document Upload Modal ──

  openDocFormModal(item) {
    const isEdit = !!item;
    document.getElementById('modal-title').textContent = isEdit ? 'Editar Documento' : 'Nuevo Documento';

    const cats = ['guia', 'manual', 'normativa', 'formato', 'general'];
    const catOptions = cats.map(c =>
      `<option value="${c}" ${item && item.categoria === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    document.getElementById('modal-body').innerHTML = `
      <form id="crud-form" enctype="multipart/form-data">
        <div class="form-group">
          <label for="field-titulo">Título</label>
          <input type="text" id="field-titulo" value="${this.escapeHTML(item?.titulo || '')}" required>
        </div>
        <div class="form-group">
          <label for="field-descripcion">Descripción</label>
          <textarea id="field-descripcion" rows="3" style="width:100%;padding:0.625rem;border:2px solid var(--color-border);border-radius:var(--radius-md);font-family:inherit;resize:vertical">${this.escapeHTML(item?.descripcion || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="field-categoria">Categoría</label>
          <select id="field-categoria">${catOptions}</select>
        </div>
        <div class="form-group">
          <label for="field-archivo">Archivo (PDF, Word, Excel — máx. 20 MB)</label>
          <input type="file" id="field-archivo" accept=".pdf,.doc,.docx,.xls,.xlsx" ${isEdit ? '' : 'required'}
            style="padding:0.5rem;border:2px dashed var(--color-border);border-radius:var(--radius-md);width:100%;cursor:pointer">
          ${isEdit && item.nombre_archivo ? `<small style="color:var(--color-text-light);margin-top:0.25rem;display:block">Actual: ${this.escapeHTML(item.nombre_archivo)} (${this.escapeHTML(item.tamano || '')}). Deje vacío para conservar.</small>` : ''}
        </div>
        <div id="form-error"></div>
      </form>`;

    document.getElementById('modal-footer').innerHTML = `
      <button class="btn btn-outline btn-sm" id="modal-cancel">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="modal-save">${isEdit ? 'Guardar' : 'Crear'}</button>`;

    this.openModal();

    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-save').addEventListener('click', async () => {
      const titulo = document.getElementById('field-titulo').value.trim();
      const descripcion = document.getElementById('field-descripcion').value.trim();
      const categoria = document.getElementById('field-categoria').value;
      const fileInput = document.getElementById('field-archivo');
      const file = fileInput.files[0];

      if (!titulo) {
        document.getElementById('form-error').innerHTML =
          '<div class="alert alert--error" style="margin-top:1rem">El título es requerido.</div>';
        return;
      }
      if (!isEdit && !file) {
        document.getElementById('form-error').innerHTML =
          '<div class="alert alert--error" style="margin-top:1rem">Debe seleccionar un archivo.</div>';
        return;
      }

      const fd = new FormData();
      fd.append('titulo', titulo);
      fd.append('descripcion', descripcion);
      fd.append('categoria', categoria);
      if (file) fd.append('archivo', file);
      if (isEdit && item.activo !== undefined) fd.append('activo', item.activo);

      try {
        if (isEdit) {
          await this.apiUpload(`/documentos/${item.id}`, fd, 'PUT');
        } else {
          await this.apiUpload('/documentos', fd, 'POST');
        }
        this.closeModal();
        this.navigateTo(this.currentSection);
      } catch (err) {
        document.getElementById('form-error').innerHTML =
          `<div class="alert alert--error" style="margin-top:1rem">${this.escapeHTML(err.message)}</div>`;
      }
    });
  },

  // ── Usuarios ──

  async renderUsuarios(container) {
    const { data } = await this.api('/usuarios');
    container.innerHTML = `
      <div class="admin-header">
        <h1>Usuarios</h1>
        <button class="btn btn-primary btn-sm" id="btn-create-user">+ Nuevo Usuario</button>
      </div>
      <div class="table-wrapper" style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>ID</th><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Último Login</th><th>Acciones</th></tr></thead>
          <tbody id="users-body"></tbody>
        </table>
      </div>`;

    const tbody = document.getElementById('users-body');
    for (const u of data) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${u.id}</td>
        <td><strong>${this.escapeHTML(u.username)}</strong></td>
        <td>${this.escapeHTML(u.nombre)}</td>
        <td><span class="badge badge--${u.rol === 'admin' ? 'ley' : 'decreto'}">${this.escapeHTML(u.rol)}</span></td>
        <td><span class="${u.activo ? 'status-active' : 'status-inactive'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>${u.last_login || 'Nunca'}</td>
        <td class="actions">
          <button class="btn btn-sm btn-edit" data-id="${u.id}">Cambiar Contraseña</button>
        </td>`;
      tbody.appendChild(row);
    }

    document.getElementById('btn-create-user').addEventListener('click', () => {
      this.openUserModal();
    });

    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-edit');
      if (!btn) return;
      this.openPasswordModal(parseInt(btn.dataset.id, 10));
    });
  },

  openUserModal() {
    document.getElementById('modal-title').textContent = 'Nuevo Usuario';
    document.getElementById('modal-body').innerHTML = `
      <form id="user-form">
        <div class="form-group"><label>Usuario</label><input type="text" id="field-username" required minlength="3"></div>
        <div class="form-group"><label>Nombre</label><input type="text" id="field-nombre" required></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="field-password" required minlength="8" autocomplete="new-password"></div>
        <div class="form-group"><label>Rol</label><select id="field-rol"><option value="editor">Editor</option><option value="admin">Admin</option></select></div>
        <div id="form-error"></div>
      </form>`;
    document.getElementById('modal-footer').innerHTML = `
      <button class="btn btn-outline btn-sm" id="modal-cancel">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="modal-save">Crear</button>`;
    this.openModal();

    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-save').addEventListener('click', async () => {
      try {
        await this.api('/usuarios', {
          method: 'POST',
          body: JSON.stringify({
            username: document.getElementById('field-username').value.trim(),
            nombre: document.getElementById('field-nombre').value.trim(),
            password: document.getElementById('field-password').value,
            rol: document.getElementById('field-rol').value,
          }),
        });
        this.closeModal();
        this.navigateTo('usuarios');
      } catch (err) {
        document.getElementById('form-error').innerHTML =
          `<div class="alert alert--error" style="margin-top:1rem">${this.escapeHTML(err.message)}</div>`;
      }
    });
  },

  openPasswordModal(userId) {
    document.getElementById('modal-title').textContent = 'Cambiar Contraseña';
    document.getElementById('modal-body').innerHTML = `
      <form id="pw-form">
        <div class="form-group"><label>Nueva Contraseña</label><input type="password" id="field-newpw" required minlength="8" autocomplete="new-password"></div>
        <div id="form-error"></div>
      </form>`;
    document.getElementById('modal-footer').innerHTML = `
      <button class="btn btn-outline btn-sm" id="modal-cancel">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="modal-save">Guardar</button>`;
    this.openModal();

    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-save').addEventListener('click', async () => {
      try {
        await this.api(`/usuarios/${userId}/password`, {
          method: 'PUT',
          body: JSON.stringify({ password: document.getElementById('field-newpw').value }),
        });
        this.closeModal();
        alert('Contraseña actualizada');
      } catch (err) {
        document.getElementById('form-error').innerHTML =
          `<div class="alert alert--error" style="margin-top:1rem">${this.escapeHTML(err.message)}</div>`;
      }
    });
  },

  // ── Audit ──

  async renderAudit(container) {
    const { data } = await this.api('/audit');
    container.innerHTML = `
      <div class="admin-header"><h1>Log de Auditoría</h1></div>
      <div class="table-wrapper" style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Tabla</th><th>Registro</th></tr></thead>
          <tbody>${data.map(a => `
            <tr>
              <td>${this.escapeHTML(a.created_at)}</td>
              <td>${this.escapeHTML(a.username)}</td>
              <td><span class="badge badge--${a.accion === 'eliminar' ? 'resolucion' : a.accion === 'crear' ? 'ley' : 'decreto'}">${this.escapeHTML(a.accion)}</span></td>
              <td>${this.escapeHTML(a.tabla)}</td>
              <td>${a.registro_id || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // ── Modal ──

  openModal() {
    document.getElementById('modal-overlay').classList.add('open');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  },
};

document.addEventListener('DOMContentLoaded', () => Admin.render());
