// Tributos calculator page logic
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const selectProducto = App.$('#calc-subpartida');
  const inputCif = App.$('#calc-valor-cif');
  const btnCalcular = App.$('#btn-calcular');
  const resultContainer = App.$('#resultado-calculo');
  const productosContainer = App.$('#productos-container');

  if (!selectProducto) return;

  // Load products into select
  try {
    const { data } = await App.fetchJSON('/api/productos');
    selectProducto.innerHTML = '<option value="">-- Seleccione un producto --</option>';
    for (const p of data) {
      const opt = document.createElement('option');
      opt.value = p.subpartida;
      opt.textContent = `${p.subpartida} - ${p.descripcion}`;
      selectProducto.appendChild(opt);
    }
  } catch (err) {
    App.showError(resultContainer, 'Error cargando productos');
  }

  // Load products table
  if (productosContainer) {
    try {
      const { data } = await App.fetchJSON('/api/productos');
      productosContainer.innerHTML = `
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
            <tbody>
              ${data.map(p => `
                <tr>
                  <td><strong>${App.escapeHTML(p.subpartida)}</strong></td>
                  <td>${App.escapeHTML(p.descripcion)}</td>
                  <td>${p.arancel_base}%</td>
                  <td>${p.arancel_tlc}%</td>
                  <td>${p.iva}%</td>
                  <td><span class="badge badge--ley">${App.escapeHTML(p.categoria_desgravacion || '-')}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      App.showError(productosContainer, err.message);
    }
  }

  if (btnCalcular) {
    btnCalcular.addEventListener('click', async () => {
      const subpartida = selectProducto.value;
      const valorCif = parseFloat(inputCif.value);

      if (!subpartida) {
        App.showError(resultContainer, 'Seleccione un producto');
        return;
      }
      if (isNaN(valorCif) || valorCif <= 0) {
        App.showError(resultContainer, 'Ingrese un valor CIF válido');
        return;
      }

      App.showLoading(resultContainer);
      try {
        const params = new URLSearchParams({
          subpartida,
          valor_cif: valorCif.toString(),
        });
        const result = await App.fetchJSON(`/api/calcular-tributos?${params}`);

        resultContainer.innerHTML = `
          <div class="result-box">
            <h4>Resultado del cálculo</h4>
            <p style="margin-bottom:1rem;font-size:0.875rem;color:var(--color-text-light)">
              ${App.escapeHTML(result.producto)}
            </p>
            <div class="result-row">
              <span>Valor CIF</span>
              <span>${App.formatCurrency(result.valor_cif)}</span>
            </div>
            <div class="result-row">
              <span>Arancel base (${result.arancel_base_pct}%)</span>
              <span style="text-decoration:line-through;color:var(--color-text-light)">
                ${App.formatCurrency(result.valor_cif * result.arancel_base_pct / 100)}
              </span>
            </div>
            <div class="result-row">
              <span>Arancel TLC (${result.arancel_tlc_pct}%)</span>
              <span>${App.formatCurrency(result.arancel_tlc_valor)}</span>
            </div>
            <div class="result-row">
              <span>IVA (${result.iva_pct}%)</span>
              <span>${App.formatCurrency(result.iva_valor)}</span>
            </div>
            <div class="result-row">
              <span>Total a pagar</span>
              <span>${App.formatCurrency(result.total_importacion)}</span>
            </div>
          </div>
          ${result.contingente ? `
            <div class="alert alert--info" style="margin-top:1rem">
              <strong>Contingente:</strong> ${App.escapeHTML(result.contingente)}.
              ${result.notas ? App.escapeHTML(result.notas) : ''}
            </div>` : ''}`;
      } catch (err) {
        App.showError(resultContainer, err.message);
      }
    });
  }
});
