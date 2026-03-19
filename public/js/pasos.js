// Paso a paso page logic
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const container = App.$('#pasos-container');
  if (!container) return;

  App.showLoading(container);
  try {
    const { data } = await App.fetchJSON('/api/pasos');

    container.innerHTML = '';
    const steps = document.createElement('div');
    steps.className = 'steps';

    for (const p of data) {
      const step = document.createElement('div');
      step.className = 'step';
      step.innerHTML = `
        <div class="step-number">${p.orden}</div>
        <div class="step-content">
          <h3>${App.escapeHTML(p.titulo)}</h3>
          <p>${App.escapeHTML(p.descripcion)}</p>
          <div class="step-meta">
            ${p.entidad_responsable ? `<span class="step-tag step-tag--entity">${App.escapeHTML(p.entidad_responsable)}</span>` : ''}
            ${p.tiempo_estimado ? `<span class="step-tag step-tag--time">${App.escapeHTML(p.tiempo_estimado)}</span>` : ''}
          </div>
          ${p.documentos_requeridos ? `
            <details style="margin-top:0.75rem">
              <summary style="cursor:pointer;font-weight:600;font-size:0.875rem;color:var(--color-primary)">
                Documentos requeridos
              </summary>
              <p style="margin-top:0.5rem;font-size:0.8125rem;color:var(--color-text-light)">
                ${App.escapeHTML(p.documentos_requeridos)}
              </p>
            </details>` : ''}
        </div>`;
      steps.appendChild(step);
    }
    container.appendChild(steps);
  } catch (err) {
    App.showError(container, err.message);
  }
});
