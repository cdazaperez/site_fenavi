// Documentos page logic
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('#docs-container');
  const filterSelect = document.querySelector('#filtro-categoria');
  if (!container) return;

  const categoryLabels = {
    guia: 'Guías',
    manual: 'Manuales',
    normativa: 'Normativa',
    formato: 'Formatos',
    general: 'General',
  };

  async function loadDocs(categoria = '') {
    App.showLoading(container);
    try {
      const params = new URLSearchParams();
      if (categoria) params.set('categoria', categoria);
      const { data } = await App.fetchJSON(`/api/documentos?${params}`);

      if (data.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No se encontraron documentos.</p></div>';
        return;
      }

      container.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'card-grid';

      for (const doc of data) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.75rem">
            <span class="badge badge--${App.escapeHTML(doc.categoria)}">${App.escapeHTML(categoryLabels[doc.categoria] || doc.categoria)}</span>
            ${doc.tamano ? `<span style="color:var(--color-text-light);font-size:0.75rem">${App.escapeHTML(doc.tamano)}</span>` : ''}
          </div>
          <h4 style="margin-bottom:0.5rem;font-size:0.9375rem">${App.escapeHTML(doc.titulo)}</h4>
          ${doc.descripcion ? `<p style="font-size:0.8125rem;color:var(--color-text-light);margin-bottom:1rem">${App.escapeHTML(doc.descripcion)}</p>` : ''}
          <a href="${App.escapeHTML(doc.url_archivo)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="font-size:0.8125rem" download>
            Descargar
          </a>`;
        grid.appendChild(card);
      }
      container.appendChild(grid);
    } catch (err) {
      App.showError(container, err.message);
    }
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => loadDocs(e.target.value));
  }

  loadDocs();
});
