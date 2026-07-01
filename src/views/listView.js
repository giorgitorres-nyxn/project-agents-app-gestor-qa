// List, filters, pagination and inline editing view.

function renderList() {
  const config = viewConfig[state.listView];
  $("#list-kicker").textContent = config.kicker;
  $("#list-title").textContent = config.title;
  $("#table-head").innerHTML = `<tr>${config.columns.map((column) => `<th>${column}</th>`).join("")}</tr>`;
  renderFilters(config);

  const storeData = state.data[config.store] ?? [];
  const records = applyCustomFilters(filterRecords(storeData), config.store);
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
  if (fieldKey === "spMigration") {
    if (store === "bugs") return findBugSpMigration(record);
    if (store === "testCases") return findTestCaseSp(record);
    return findSpMigration(record.spMigrationId);
  }
  if (fieldKey === "member") return findName("members", record.memberId) || "Sin responsable";
  if (fieldKey === "qa") return findName("members", record.qaId) || "Sin QA";
  if (fieldKey === "useCase") return findUseCase(record.useCaseId);
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
  if (fieldKey === "sql") return artifactFilterText(record.sqlReceived);
  if (fieldKey === "rest") return artifactFilterText(record.restReceived);
  if (fieldKey === "grpc") return artifactFilterText(record.grpcReceived);
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
    return row([
      record.title,
      findSpMigration(record.spMigrationId),
      findName("members", record.memberId) || "Sin responsable",
      { html: statusBadge(statusText) },
      { html: pill(catalogLabel("tasks", "priority", record.priority), `priority-${cssToken(record.priority)}`) },
      record.dueDate || "Sin fecha",
      edit
    ]);
  }
  if (store === "spMigrations") {
    return row([
      record.spName,
      record.devName || "Sin dev",
      findName("members", record.qaId) || "Sin QA",
      { html: statusBadge(catalogLabel("spMigrations", "status", record.status)) },
      { html: artifactBadge(record.sqlReceived, record.sqlReceivedDate) },
      { html: artifactBadge(record.restReceived, record.restReceivedDate) },
      { html: artifactBadge(record.grpcReceived, record.grpcReceivedDate) },
      { html: artifactBadge(record.equivalenceMatrixReady, "Matriz") },
      { html: artifactBadge(record.qmetryEvidenceReady, "QMetry") },
      edit
    ]);
  }
  if (store === "testCases") {
    return row([
      findTestCaseSp(record),
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
  if (store === "useCases") {
    return row([
      findSpMigration(record.spMigrationId),
      record.code,
      record.name,
      { html: statusBadge(catalogLabel("useCases", "status", record.status)) },
      { html: pill(catalogLabel("useCases", "priority", record.priority), `priority-${cssToken(record.priority)}`) },
      record.observation || "Sin observacion",
      edit
    ]);
  }
  if (store === "bugs") {
    return row([
      record.title,
      findBugSpMigration(record),
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

function row(cells) {
  return `<tr>${cells.map((cell) => `<td>${cell?.html || escapeHtml(cell || "")}</td>`).join("")}</tr>`;
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
