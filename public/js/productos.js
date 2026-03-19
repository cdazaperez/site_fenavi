// Products page logic
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = App.$('#productos-body');
  const searchInput = App.$('#buscar-producto');
  const container = App.$('#productos-container');
  if (!tableBody || !container) return;

  let debounceTimer;

  async function loadProductos(buscar = '') {
    App.showLoading(container);
    try {
      const params = new URLSearchParams();
      if (buscar) params.set('buscar', buscar);
      const { data } = await App.fetchJSON(`/api/productos?${params}`);

      if (data.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>No se encontraron productos${buscar ? ` para "${App.escapeHTML(buscar)}"` : ''}.</p>
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Subpartida</th>
                <th>Descripción</th>
                <th>Arancel Base</th>
                <th>Arancel TLC</th>
                <th>IVA</th>
                <th>Categoría</th>
              </tr>
            </thead>
            <tbody id="productos-body"></tbody>
          </table>
        </div>`;

      const tbody = App.$('#productos-body');
      for (const p of data) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${App.escapeHTML(p.subpartida)}</strong></td>
          <td>${App.escapeHTML(p.descripcion)}</td>
          <td>${p.arancel_base}%</td>
          <td>${p.arancel_tlc}%</td>
          <td>${p.iva}%</td>
          <td><span class="badge badge--ley">${App.escapeHTML(p.categoria_desgravacion || '-')}</span></td>`;
        tbody.appendChild(row);
      }
    } catch (err) {
      App.showError(container, err.message);
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadProductos(e.target.value.trim());
      }, 300);
    });
  }

  loadProductos();
});
