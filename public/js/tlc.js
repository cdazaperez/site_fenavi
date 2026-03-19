// TLC page logic
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const container = App.$('#tlc-container');
  if (!container) return;

  App.showLoading(container);
  try {
    const { data } = await App.fetchJSON('/api/tlc');

    // Group by section
    const sections = {};
    for (const item of data) {
      if (!sections[item.seccion]) sections[item.seccion] = [];
      sections[item.seccion].push(item);
    }

    const sectionTitles = {
      general: 'Información General',
      desgravacion: 'Desgravación Arancelaria',
      obligaciones: 'Obligaciones y Requisitos',
    };

    container.innerHTML = '';
    for (const [key, items] of Object.entries(sections)) {
      const section = document.createElement('div');
      section.className = 'tlc-section';
      section.innerHTML = `
        <h2 style="margin-bottom:1rem">${App.escapeHTML(sectionTitles[key] || key)}</h2>
        ${items.map(item => `
          <div class="card">
            <h4>${App.escapeHTML(item.titulo)}</h4>
            <div style="font-size:0.9375rem;color:var(--color-text-light);line-height:1.7">
              ${item.contenido}
            </div>
          </div>`).join('')}`;
      container.appendChild(section);
    }
  } catch (err) {
    App.showError(container, err.message);
  }
});
