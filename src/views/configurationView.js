// Configuration and Supabase SQL console views.

function renderConfiguration() {
  const sectionKey = state.configurationSection;
  const section = catalogDefinitions[sectionKey];
  const container = $("#configuration-content");
  if (!container || (sectionKey !== sqlConsoleSection && !section)) return;

  container.innerHTML = `
    <div class="configuration-layout">
      <aside class="config-menu" aria-label="Submenus de configuracion">
        ${configurationSections.map((key) => `
          <button class="config-menu-item ${key === sectionKey ? "active" : ""}" type="button" data-config-section="${escapeHtml(key)}">
            ${escapeHtml(configurationSectionTitle(key))}
          </button>
        `).join("")}
      </aside>
      ${sectionKey === sqlConsoleSection ? sqlConsolePanel() : catalogConfigPanel(sectionKey, section)}
    </div>
  `;

  bindConfigurationEvents(container, sectionKey);
}

function configurationSectionTitle(key) {
  if (key === sqlConsoleSection) return "Consola Supabase";
  return catalogDefinitions[key]?.title || key;
}

function catalogConfigPanel(sectionKey, section) {
  return `
    <section class="panel config-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Listas editables</p>
          <h2>${escapeHtml(section.title)}</h2>
        </div>
      </div>
      <div class="config-field-grid">
        ${Object.entries(section.fields).map(([fieldKey, field]) => catalogFieldCard(sectionKey, fieldKey, field)).join("")}
      </div>
    </section>
  `;
}

function sqlConsolePanel() {
  const consoleState = state.sqlConsole;
  return `
    <section class="panel config-panel sql-console-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Base de datos</p>
          <h2>Consola Supabase</h2>
        </div>
        <div class="sql-console-actions">
          ${sqlConsoleExamples.map((example) => `
            <button class="ghost-button" type="button" data-sql-example="${escapeHtml(example.query)}">${escapeHtml(example.label)}</button>
          `).join("")}
        </div>
      </div>
      <form id="sql-console-form" class="sql-console-editor">
        <label for="sql-console-query">SQL</label>
        <textarea id="sql-console-query" spellcheck="false" autocomplete="off">${escapeHtml(consoleState.query)}</textarea>
        <div class="sql-console-toolbar">
          <button class="ghost-button" type="button" data-sql-clear>Limpiar</button>
          <button class="primary-button" type="submit" ${consoleState.running ? "disabled" : ""}>${consoleState.running ? "Ejecutando" : "Ejecutar"}</button>
        </div>
      </form>
      ${sqlConsoleResult()}
    </section>
  `;
}

function sqlConsoleResult() {
  const { result, error, running } = state.sqlConsole;
  if (running) {
    return `<div class="sql-console-empty">Ejecutando consulta</div>`;
  }
  if (error) {
    return `<div class="sql-console-error">${escapeHtml(error)}</div>`;
  }
  if (!result) {
    return `<div class="sql-console-empty">Sin resultados</div>`;
  }

  const rows = Array.isArray(result.rows) ? result.rows : [];
  const meta = [
    result.command || "SQL",
    `${Number(result.rowCount || 0)} fila(s)`,
    `${Number(result.durationMs || 0)} ms`
  ].join(" · ");

  return `
    <div class="sql-console-result">
      <div class="sql-console-meta">${escapeHtml(meta)}</div>
      ${rows.length ? sqlConsoleTable(rows) : `<div class="sql-console-empty">Operacion ejecutada</div>`}
    </div>
  `;
}

function sqlConsoleTable(rows) {
  const columns = sqlConsoleColumns(rows);
  return `
    <div class="sql-result-table-wrap">
      <table class="sql-result-table">
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `<td>${sqlConsoleCell(row?.[column])}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function sqlConsoleColumns(rows) {
  const columns = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!columns.includes(key)) columns.push(key);
    });
  });
  return columns;
}

function sqlConsoleCell(value) {
  if (value === null || value === undefined) return `<span class="sql-null">NULL</span>`;
  if (typeof value === "object") return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
  return escapeHtml(String(value));
}

function catalogFieldCard(store, fieldKey, field) {
  const items = catalogOptions(store, fieldKey);
  return `
    <article class="config-field-card">
      <div class="config-field-heading">
        <h3>${escapeHtml(field.label)}</h3>
        <span class="count-pill">${items.length}</span>
      </div>
      <div class="catalog-list">
        ${items.map((item) => catalogItemRow(store, fieldKey, item)).join("")}
      </div>
      <div class="catalog-add-row">
        <input type="text" placeholder="Nuevo valor" data-catalog-input data-store="${escapeHtml(store)}" data-field="${escapeHtml(fieldKey)}">
        <button class="secondary-button" type="button" data-catalog-add data-store="${escapeHtml(store)}" data-field="${escapeHtml(fieldKey)}">Agregar</button>
      </div>
    </article>
  `;
}

function catalogItemRow(store, fieldKey, item) {
  const usageCount = catalogUsageCount(store, fieldKey, item.value);
  const deleteDisabled = usageCount > 0 ? "disabled" : "";
  const usageLabel = usageCount ? `${usageCount} en uso` : "Sin uso";
  return `
    <div class="catalog-row">
      <input type="text" value="${escapeHtml(item.label)}" aria-label="Valor de catalogo" data-catalog-edit="${escapeHtml(item.value)}">
      <span class="catalog-usage">${escapeHtml(usageLabel)}</span>
      <button class="ghost-button" type="button" data-catalog-save data-store="${escapeHtml(store)}" data-field="${escapeHtml(fieldKey)}" data-value="${escapeHtml(item.value)}">Guardar</button>
      <button class="ghost-button danger" type="button" data-catalog-delete data-store="${escapeHtml(store)}" data-field="${escapeHtml(fieldKey)}" data-value="${escapeHtml(item.value)}" ${deleteDisabled}>Eliminar</button>
    </div>
  `;
}

function catalogUsageCount(store, fieldKey, value) {
  return (state.data[store] ?? []).filter((record) => String(record[fieldKey] ?? "") === value).length;
}
