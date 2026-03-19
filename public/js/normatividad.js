// Normatividad page logic
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const container = App.$('#normas-container');
  const filterSelect = App.$('#filtro-tipo');
  if (!container) return;

  async function loadNormas(tipo = '') {
    App.showLoading(container);
    try {
      const params = new URLSearchParams();
      if (tipo) params.set('tipo', tipo);
      const { data } = await App.fetchJSON(`/api/normatividad?${params}`);

      if (data.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>No se encontraron normas${tipo ? ` de tipo "${App.escapeHTML(tipo)}"` : ''}.</p>
          </div>`;
        return;
      }

      container.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'card-grid';

      for (const n of data) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.75rem">
            <span class="badge badge--${App.escapeHTML(n.tipo)}">${App.escapeHTML(n.tipo)}</span>
            <span style="color:var(--color-text-light);font-size:0.8125rem">${App.escapeHTML(n.fecha)}</span>
          </div>
          <h4 style="margin-bottom:0.5rem;font-size:0.9375rem">${App.escapeHTML(n.titulo)}</h4>
          <p style="font-size:0.8125rem;color:var(--color-text-light);margin-bottom:0.5rem">
            <strong>${App.escapeHTML(n.entidad)}</strong> - ${App.escapeHTML(n.tipo)} ${App.escapeHTML(n.numero)}
          </p>
          ${n.descripcion ? `<p style="font-size:0.8125rem;color:var(--color-text-light)">${App.escapeHTML(n.descripcion)}</p>` : ''}`;
        grid.appendChild(card);
      }
      container.appendChild(grid);
    } catch (err) {
      App.showError(container, err.message);
    }
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => loadNormas(e.target.value));
  }

  loadNormas();
});
