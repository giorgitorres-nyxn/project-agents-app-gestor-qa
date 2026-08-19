// List, filters, pagination and inline editing view.

function renderList() {
  const config = viewConfig[state.listView];
  $("#list-kicker").textContent = config.kicker;
  $("#list-title").textContent = config.title;
  renderTableHead(config);
  renderFilters(config);
  renderOverdueToggle(config);
  renderMicroFilterBar(config);

  const storeData = state.data[config.store] ?? [];
  let records = applyCustomFilters(filterRecords(storeData), config.store);
  if (config.store === "tasks" && state.showOnlyOverdueTasks) {
    records = records.filter(taskIsOverdue);
  }
  records = applyMicroFilter(records, config.store);
  records = applySort(records, config.store);
  const pagination = paginationFor(config.store);
  const totalPages = Math.max(1, Math.ceil(records.length / pagination.pageSize));
  if (pagination.page > totalPages) pagination.page = totalPages;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const pageRecords = records.slice(startIndex, startIndex + pagination.pageSize);

  $("#table-body").innerHTML = pageRecords.length
    ? pageRecords.map((record) => tableRow(config.store, record)).join("")
    : `<tr><td colspan="${config.columns.length}"><div class="empty-state">No hay registros para mostrar.</div></td></tr>`;
  renderPagination(config.store, records.length, pageRecords.length, startIndex);

  $("#table-body").querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditor(config.store, button.dataset.edit));
  });
  $("#table-body").querySelectorAll("[data-inline-field]").forEach((control) => {
    control.addEventListener("change", () => handleInlineUpdate(config.store, control));
  });
}

function renderPagination(store, totalRecords, visibleRecords, startIndex) {
  const pagination = paginationFor(store);
  const totalPages = Math.max(1, Math.ceil(totalRecords / pagination.pageSize));
  const from = totalRecords ? startIndex + 1 : 0;
  const to = totalRecords ? startIndex + visibleRecords : 0;

  $("#table-pagination").innerHTML = `
    <div class="pagination-summary">${from}-${to} de ${totalRecords}</div>
    <div class="pagination-controls">
      <label>
        Filas
        <select id="page-size" aria-label="Filas por pagina">
          ${pageSizeOptions.map((size) => `<option value="${size}" ${size === pagination.pageSize ? "selected" : ""}>${size}</option>`).join("")}
        </select>
      </label>
      <button class="ghost-button" type="button" data-page-action="prev" ${pagination.page <= 1 ? "disabled" : ""}>Anterior</button>
      <span>Pagina ${pagination.page} de ${totalPages}</span>
      <button class="ghost-button" type="button" data-page-action="next" ${pagination.page >= totalPages ? "disabled" : ""}>Siguiente</button>
    </div>
  `;

  $("#page-size").addEventListener("change", (event) => {
    pagination.pageSize = Number(event.target.value) || defaultPageSize;
    pagination.page = 1;
    renderList();
  });
  $("#table-pagination").querySelectorAll("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      pagination.page += button.dataset.pageAction === "next" ? 1 : -1;
      renderList();
    });
  });
}

function paginationFor(store) {
  if (!state.pagination[store]) state.pagination[store] = { page: 1, pageSize: defaultPageSize };
  return state.pagination[store];
}

function resetPage(store) {
  paginationFor(store).page = 1;
}

function resetAllPages() {
  Object.keys(state.pagination).forEach(resetPage);
}

function renderTableHead(config) {
  const sortable = sortableStores.has(config.store);
  const currentSort = state.sort[config.store];
  $("#table-head").innerHTML = `<tr>${config.columns.map((column) => {
    const label = typeof column === "string" ? column : column.label;
    const key = typeof column === "string" ? null : column.key;
    if (!sortable || !key) return `<th>${escapeHtml(label)}</th>`;
    const isActive = currentSort?.key === key;
    const arrow = isActive ? `<span class="sort-arrow">${currentSort.direction === "asc" ? "↑" : "↓"}</span>` : "";
    return `<th class="sortable-column ${isActive ? "is-sorted" : ""}" data-sort-key="${escapeHtml(key)}" role="button" tabindex="0">${escapeHtml(label)}${arrow}</th>`;
  }).join("")}</tr>`;

  if (!sortable) return;
  $("#table-head").querySelectorAll("[data-sort-key]").forEach((th) => {
    th.addEventListener("click", () => toggleSort(config.store, th.dataset.sortKey));
    th.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleSort(config.store, th.dataset.sortKey);
      }
    });
  });
}

function toggleSort(store, key) {
  const current = state.sort[store];
  state.sort[store] = current?.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" };
  resetPage(store);
  renderList();
}

function applySort(records, store) {
  const sort = state.sort[store];
  if (!sort?.key) return records;
  const direction = sort.direction === "desc" ? -1 : 1;
  return [...records].sort((a, b) => direction * compareSortValues(filterValueFor(store, a, sort.key), filterValueFor(store, b, sort.key)));
}

function compareSortValues(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (a !== "" && b !== "" && !Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
  return normalizeFilterText(a).localeCompare(normalizeFilterText(b), "es");
}

function renderOverdueToggle(config) {
  const container = $("#overdue-toggle");
  if (!container) return;
  if (config.store !== "tasks") {
    container.innerHTML = "";
    return;
  }
  const overdueCount = (state.data.tasks ?? []).filter(taskIsOverdue).length;
  container.innerHTML = `
    <label class="overdue-toggle-control">
      <input type="checkbox" id="overdue-only" ${state.showOnlyOverdueTasks ? "checked" : ""}>
      Solo vencidas (${overdueCount})
    </label>
  `;
  $("#overdue-only").addEventListener("change", (event) => {
    state.showOnlyOverdueTasks = event.target.checked;
    resetPage(config.store);
    renderList();
  });
}

function renderMicroFilterBar(config) {
  const container = $("#list-micro-filters");
  if (!container) return;
  if (!microservicioFilterableStores.has(config.store)) {
    container.innerHTML = "";
    return;
  }
  const filters = state.listMicroFilters[config.store] ?? emptyMicroFilter();
  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.lote || filters.funcionalidad || filters.microservicio;
  container.innerHTML = `
    <div class="kanban-filter-controls">
      <label class="kanban-filter-field">
        <span>Desde</span>
        <input type="date" data-mf-date-from value="${escapeHtml(filters.dateFrom || "")}">
      </label>
      <label class="kanban-filter-field">
        <span>Hasta</span>
        <input type="date" data-mf-date-to value="${escapeHtml(filters.dateTo || "")}">
      </label>
      <label class="kanban-filter-field">
        <span>Lote</span>
        <select data-mf-lote>
          <option value="">Todos los lotes</option>
          ${loteOptions().map((value) => `<option value="${escapeHtml(value)}" ${value === filters.lote ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
      <label class="kanban-filter-field">
        <span>Funcionalidad</span>
        <select data-mf-funcionalidad>
          <option value="">Todas las funcionalidades</option>
          ${funcionalidadOptions(filters.lote).map((value) => `<option value="${escapeHtml(value)}" ${value === filters.funcionalidad ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
      <label class="kanban-filter-field">
        <span>Microservicio</span>
        <select data-mf-microservicio>
          <option value="">Todos los microservicios</option>
          ${microservicioOptions(filters.lote, filters.funcionalidad).map((value) => `<option value="${escapeHtml(value)}" ${value === filters.microservicio ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
      <button class="ghost-button ${hasActiveFilters ? "" : "hidden"}" type="button" data-mf-clear>Limpiar</button>
    </div>
  `;

  const updateFilter = (patch) => {
    state.listMicroFilters[config.store] = { ...state.listMicroFilters[config.store], ...patch };
    resetPage(config.store);
    renderList();
  };

  container.querySelector("[data-mf-date-from]").addEventListener("change", (event) => updateFilter({ dateFrom: event.target.value }));
  container.querySelector("[data-mf-date-to]").addEventListener("change", (event) => updateFilter({ dateTo: event.target.value }));
  container.querySelector("[data-mf-lote]").addEventListener("change", (event) => {
    const lote = event.target.value;
    updateFilter({ lote, funcionalidad: "", microservicio: "", ...(lote ? { dateFrom: "", dateTo: "" } : {}) });
  });
  container.querySelector("[data-mf-funcionalidad]").addEventListener("change", (event) => {
    const funcionalidad = event.target.value;
    updateFilter({ funcionalidad, microservicio: "", ...(funcionalidad ? { dateFrom: "", dateTo: "" } : {}) });
  });
  container.querySelector("[data-mf-microservicio]").addEventListener("change", (event) => {
    const microservicio = event.target.value;
    updateFilter({ microservicio, ...(microservicio ? { dateFrom: "", dateTo: "" } : {}) });
  });
  container.querySelector("[data-mf-clear]").addEventListener("click", () => {
    state.listMicroFilters[config.store] = emptyMicroFilter();
    resetPage(config.store);
    renderList();
  });
}

function applyMicroFilter(records, store) {
  if (!microservicioFilterableStores.has(store)) return records;
  const filters = state.listMicroFilters[store] ?? emptyMicroFilter();
  const { dateFrom, dateTo, lote, funcionalidad, microservicio } = filters;
  const spMigrations = state.data.spMigrations ?? [];
  return records.filter((record) => {
    if (lote || funcionalidad || microservicio) {
      const recordMicro = effectiveMicroservicio(store, record);
      if (microservicio && recordMicro !== microservicio) return false;
      const sp = recordMicro ? spMigrations.find((item) => item.nombreMicroservicio === recordMicro) : null;
      if (lote && sp?.numeroLote !== lote) return false;
      if (funcionalidad && sp?.funcionalidad !== funcionalidad) return false;
    }
    const createdDate = String(record.createdAt || "").slice(0, 10);
    if (dateFrom && (!createdDate || createdDate < dateFrom)) return false;
    if (dateTo && (!createdDate || createdDate > dateTo)) return false;
    return true;
  });
}

function renderFilters(config) {
  const fields = listFilterFields[config.store] ?? [];
  const activeFilters = state.customFilters[config.store] ?? [];
  $("#list-filters").innerHTML = `
    <div class="filter-builder">
      <select id="filter-field" aria-label="Campo para filtrar">
        ${fields.map((field) => `<option value="${escapeHtml(field.key)}">${escapeHtml(field.label)}</option>`).join("")}
      </select>
      <select id="filter-operator" aria-label="Condicion del filtro">
        <option value="contains">Contiene</option>
        <option value="equals">Es igual a</option>
        <option value="notContains">No contiene</option>
        <option value="empty">Esta vacio</option>
        <option value="notEmpty">No esta vacio</option>
      </select>
      <input id="filter-value" type="search" placeholder="Valor del filtro" aria-label="Valor del filtro">
      <button class="secondary-button" id="add-filter" type="button">Agregar filtro</button>
      <button class="ghost-button ${activeFilters.length ? "" : "hidden"}" id="clear-filters" type="button">Limpiar</button>
    </div>
    <div class="filter-chips">
      ${activeFilters.map((filter) => filterChip(config.store, filter)).join("")}
    </div>
  `;

  $("#add-filter").addEventListener("click", () => addCustomFilter(config.store));
  $("#filter-value").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomFilter(config.store);
    }
  });
  $("#clear-filters").addEventListener("click", () => {
    state.customFilters[config.store] = [];
    resetPage(config.store);
    renderList();
  });
  $("#list-filters").querySelectorAll("[data-remove-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.customFilters[config.store] = activeFilters.filter((filter) => filter.id !== button.dataset.removeFilter);
      resetPage(config.store);
      renderList();
    });
  });
}

function addCustomFilter(store) {
  const fieldKey = $("#filter-field").value;
  const operator = $("#filter-operator").value;
  const value = $("#filter-value").value.trim();
  if (!["empty", "notEmpty"].includes(operator) && !value) return;

  const filters = state.customFilters[store] ?? [];
  state.customFilters[store] = [
    ...filters,
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      fieldKey,
      operator,
      value
    }
  ];
  resetPage(store);
  renderList();
}

function filterChip(store, filter) {
  const field = (listFilterFields[store] ?? []).find((item) => item.key === filter.fieldKey);
  const label = `${field?.label || filter.fieldKey} ${operatorLabel(filter.operator)}${filter.value ? ` "${filter.value}"` : ""}`;
  return `
    <span class="filter-chip">
      ${escapeHtml(label)}
      <button type="button" aria-label="Quitar filtro" data-remove-filter="${escapeHtml(filter.id)}">×</button>
    </span>
  `;
}

function operatorLabel(operator) {
  return {
    contains: "contiene",
    equals: "es igual a",
    notContains: "no contiene",
    empty: "esta vacio",
    notEmpty: "no esta vacio"
  }[operator] || "contiene";
}

function applyCustomFilters(records, store) {
  const activeFilters = state.customFilters[store] ?? [];
  if (!activeFilters.length) return records;
  return records.filter((record) => activeFilters.every((filter) => matchesCustomFilter(store, record, filter)));
}

function matchesCustomFilter(store, record, filter) {
  const values = filterValuesFor(store, record, filter.fieldKey);
  const texts = values.map(normalizeFilterText).filter(Boolean);
  const expected = normalizeFilterText(filter.value);

  if (filter.operator === "empty") return !texts.length;
  if (filter.operator === "notEmpty") return Boolean(texts.length);
  if (filter.operator === "equals") return texts.some((text) => text === expected);
  if (filter.operator === "notContains") return texts.every((text) => !text.includes(expected));
  return texts.some((text) => text.includes(expected));
}

function filterValuesFor(store, record, fieldKey) {
  const values = [filterValueFor(store, record, fieldKey)];
  if (hasCatalogField(store, fieldKey)) {
    const effectiveValue = effectiveFieldValue(store, record, fieldKey);
    values.push(record[fieldKey]);
    values.push(effectiveValue);
    values.push(catalogLabel(store, fieldKey, effectiveValue));
  }
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function filterValueFor(store, record, fieldKey) {
  if (fieldKey === "microservicio") return effectiveMicroservicio(store, record) || "Sin microservicio";
  if (fieldKey === "member") return findName("members", record.memberId) || "Sin responsable";
  if (fieldKey === "qa") return findName("members", record.qaId) || "Sin QA";
  if (fieldKey === "testCase") return findTestCase(record.testCaseId);
  if (fieldKey === "status" && store === "tasks") return statusLabels[record.status] || record.status;
  if (fieldKey === "status" && hasCatalogField(store, "status")) return catalogLabel(store, "status", record.status);
  if (fieldKey === "priority" && hasCatalogField(store, "priority")) return catalogLabel(store, "priority", record.priority);
  if (fieldKey === "severity" && hasCatalogField(store, "severity")) return catalogLabel(store, "severity", record.severity);
  if (fieldKey === "kind" && hasCatalogField(store, "kind")) return catalogLabel(store, "kind", record.kind);
  if (fieldKey === "role" && hasCatalogField(store, "role")) return catalogLabel(store, "role", record.role);
  if (fieldKey === "executionStatus" && hasCatalogField(store, "executionStatus")) return catalogLabel(store, "executionStatus", effectiveFieldValue(store, record, "executionStatus"));
  if (fieldKey === "bankApproval" && hasCatalogField(store, "bankApproval")) return catalogLabel(store, "bankApproval", effectiveFieldValue(store, record, "bankApproval"));
  if (fieldKey === "capacity") return `${record.capacity || 0}%`;
  if (fieldKey === "matrix") return artifactFilterText(record.equivalenceMatrixReady);
  if (fieldKey === "qmetry") return artifactFilterText(record.qmetryEvidenceReady);
  return record[fieldKey] ?? "";
}

function hasCatalogField(store, fieldKey) {
  return Boolean(catalogDefinitions[store]?.fields?.[fieldKey]);
}

function effectiveFieldValue(store, record, fieldName) {
  const value = record?.[fieldName];
  if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  const field = fieldConfig[store]?.find((item) => item.name === fieldName);
  return defaultValue(field);
}

function artifactFilterText(done) {
  return done ? "Listo" : "Pendiente";
}

function normalizeFilterText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tableRow(store, record) {
  const edit = { html: `<div class="row-actions"><button class="ghost-button" type="button" data-edit="${escapeHtml(record.id)}">Editar</button></div>` };
  if (store === "tasks") {
    const statusText = statusLabels[record.status] || record.status;
    const overdue = taskIsOverdue(record);
    return row([
      record.title,
      effectiveMicroservicio(store, record) || "Sin microservicio",
      findName("members", record.memberId) || "Sin responsable",
      { html: statusBadge(statusText) },
      record.iterations || 0,
      { html: pill(catalogLabel("tasks", "priority", record.priority), `priority-${cssToken(record.priority)}`) },
      { html: overdue ? `<span class="overdue-flag">Vencida</span> ${escapeHtml(record.dueDate || "")}` : escapeHtml(record.dueDate || "Sin fecha") },
      edit
    ], overdue ? "row-overdue" : "");
  }
  if (store === "spMigrations") {
    return row([
      record.numeroLote || "Sin lote",
      record.funcionalidad || "Sin funcionalidad",
      record.nombreMicroservicio || "Sin microservicio",
      record.spName,
      record.devName || "Sin dev",
      findName("members", record.qaId) || "Sin QA",
      { html: statusBadge(catalogLabel("spMigrations", "status", record.status)) },
      { html: artifactBadge(record.equivalenceMatrixReady, "Matriz") },
      { html: artifactBadge(record.qmetryEvidenceReady, "QMetry") },
      edit
    ]);
  }
  if (store === "testCases") {
    return row([
      effectiveMicroservicio(store, record) || "Sin microservicio",
      record.code,
      record.name,
      { html: inlineSelect(store, record, "status") },
      { html: inlineSelect(store, record, "executionStatus") },
      { html: inlineSelect(store, record, "bankApproval") },
      { html: pill(catalogLabel("testCases", "priority", record.priority), `priority-${cssToken(record.priority)}`) },
      record.observation || "Sin observacion",
      edit
    ]);
  }
  if (store === "bugs") {
    return row([
      record.title,
      effectiveMicroservicio(store, record) || "Sin microservicio",
      findTestCase(record.testCaseId),
      { html: pill(catalogLabel("bugs", "severity", record.severity), `severity-${cssToken(record.severity)}`) },
      { html: statusBadge(catalogLabel("bugs", "status", record.status)) },
      findName("members", record.memberId) || "Sin responsable",
      edit
    ]);
  }
  return row([
    record.name,
    catalogLabel("members", "role", record.role),
    { html: statusBadge(catalogLabel("members", "status", record.status)) },
    `${record.capacity || 0}%`,
    record.email || "Sin correo",
    edit
  ]);
}

function row(cells, rowClass = "") {
  return `<tr class="${escapeHtml(rowClass)}">${cells.map((cell) => `<td>${cell?.html || escapeHtml(cell || "")}</td>`).join("")}</tr>`;
}

function pill(text, className) {
  return `<span class="priority-pill ${escapeHtml(className)}">${escapeHtml(text || "Media")}</span>`;
}

function inlineSelect(store, record, fieldName) {
  if (!inlineEditableFields[store]?.has(fieldName)) return escapeHtml(record[fieldName] || "");
  const field = fieldConfig[store]?.find((item) => item.name === fieldName);
  const value = record[fieldName] ?? defaultValue(field);
  let selectOptions = (field?.options ?? []).map((option) => typeof option === "string" ? { value: option, label: option } : option);
  if (field?.emptyLabel) selectOptions = [{ value: "", label: field.emptyLabel }, ...selectOptions];
  const options = selectOptions.map((item) => {
    return `<option value="${escapeHtml(item.value)}" ${item.value === value ? "selected" : ""}>${escapeHtml(item.label)}</option>`;
  }).join("");
  return `
    <select class="inline-select status-${cssToken(value || "pendiente")}" data-inline-field="${escapeHtml(fieldName)}" data-record-id="${escapeHtml(record.id)}" aria-label="${escapeHtml(field?.label || fieldName)}">
      ${options}
    </select>
  `;
}

async function handleInlineUpdate(store, control) {
  const allowed = inlineEditableFields[store];
  const fieldName = control.dataset.inlineField;
  const recordId = control.dataset.recordId;
  if (!allowed?.has(fieldName) || !recordId) return;

  const storeData = state.data[store] ?? [];
  const record = storeData.find((item) => item.id === recordId);
  if (!record) return;

  const previousValue = record[fieldName] ?? "";
  const nextValue = control.value;
  if (previousValue === nextValue) return;

  control.disabled = true;
  try {
    const savedRecord = await saveRecord(store, { ...record, [fieldName]: nextValue });
    mergeImportedRecord(store, savedRecord);
    renderList();
  } catch (error) {
    control.value = previousValue;
    alert(`Error: ${error.message}`);
  } finally {
    control.disabled = false;
  }
}

function statusBadge(text) {
  return `<span class="status-pill status-${cssToken(text)}">${escapeHtml(text || "Sin estado")}</span>`;
}

function artifactBadge(done, title) {
  const label = done ? "Listo" : "Pendiente";
  return `<span class="artifact-pill ${done ? "complete" : "pending"}" title="${escapeHtml(title || label)}">${label}</span>`;
}

function cssToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
