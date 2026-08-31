(function exposeProjectConfig(root, factory) {
  const config = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }
  if (root) {
    root.GestorQAProject = config;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function buildProjectConfig() {
  const stores = ["members", "useCases", "testCases", "bugs", "tasks", "spMigrations", "catalogs"];

  const catalogDefinitions = {
    tasks: {
      title: "Tareas",
      fields: {
        status: {
          label: "Estado",
          defaults: [
            { value: "backlog", label: "Pendiente" },
            { value: "active", label: "En progreso" },
            { value: "review", label: "En revision" },
            { value: "done", label: "Finalizado" }
          ]
        },
        priority: { label: "Prioridad", defaults: ["Alta", "Media", "Baja"] },
        kind: { label: "Tipo", defaults: ["Prueba", "Documentacion", "Automatizacion", "Correccion"] }
      }
    },
    spMigrations: {
      title: "Migracion SPs",
      fields: {
        status: { label: "Estado", defaults: ["SQL recibido", "REST/gRPC recibido", "En QA", "Matriz lista", "Evidencia QMetry", "En revision por banco", "Finalizado"] }
      }
    },
    testCases: {
      title: "Casos de pruebas",
      fields: {
        status: { label: "Estado", defaults: ["Borrador", "Listo", "Ejecutado", "Bloqueado"] },
        executionStatus: { label: "Ejecucion", defaults: ["Exitoso", "Fallido"] },
        bankApproval: { label: "Aprobado Banco", defaults: ["Aprobado", "No Aprobado"] },
        priority: { label: "Prioridad", defaults: ["Alta", "Media", "Baja"] }
      }
    },
    useCases: {
      title: "Casos de uso",
      fields: {
        status: { label: "Estado", defaults: ["Activo", "En analisis", "Aprobado", "Retirado"] },
        priority: { label: "Prioridad", defaults: ["Alta", "Media", "Baja"] }
      }
    },
    bugs: {
      title: "Errores",
      fields: {
        severity: { label: "Severidad", defaults: ["Critica", "Alta", "Media", "Baja"] },
        status: { label: "Estado", defaults: ["Abierto", "Asignado", "Resuelto", "Cerrado"] }
      }
    },
    members: {
      title: "Miembros QA",
      fields: {
        role: { label: "Rol", defaults: ["QA Manual", "QA Automation", "QA Lead", "Analista QA"] },
        status: { label: "Estado", defaults: ["Disponible", "Ocupado", "Ausente"] }
      }
    }
  };

  const spMigrationTransitions = {
    "SQL recibido": ["REST/gRPC recibido", "Finalizado"],
    "REST/gRPC recibido": ["En QA", "Finalizado"],
    "En QA": ["Matriz lista", "En revision por banco", "Finalizado"],
    "Matriz lista": ["Evidencia QMetry", "En revision por banco", "Finalizado"],
    "Evidencia QMetry": ["En revision por banco", "Finalizado"],
    "En revision por banco": ["Finalizado"],
    Finalizado: []
  };

  const defaultSpMigrationStatusValues = new Set(catalogDefinitions.spMigrations.fields.status.defaults);

  function spTransitionError(oldStatus, newStatus) {
    if (oldStatus === newStatus || !oldStatus) return null;
    if (!defaultSpMigrationStatusValues.has(oldStatus) || !defaultSpMigrationStatusValues.has(newStatus)) return null;
    const allowed = spMigrationTransitions[oldStatus] || [];
    if (allowed.includes(newStatus)) return null;
    return `Transicion invalida: no se puede ir de "${oldStatus}" a "${newStatus}"`;
  }

  function validateSpTransition(oldStatus, newStatus) {
    const error = spTransitionError(oldStatus, newStatus);
    if (error) throw new Error(error);
  }

  function normalizeStatusText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function statusMatches(value, terms) {
    const normalized = normalizeStatusText(value);
    return terms.map(normalizeStatusText).includes(normalized);
  }

  function isTaskDoneStatus(status) {
    return statusMatches(status, ["done", "Finalizado", "Completado", "Cerrado"]);
  }

  function isTaskReviewStatus(status) {
    return statusMatches(status, ["review", "En revision"]);
  }

  function isTaskBacklogOrActiveStatus(status) {
    return statusMatches(status, ["backlog", "active", "Pendiente", "En progreso"]);
  }

  function taskReturnMetric(record) {
    const preferred = numericMetric(record?.devoluciones);
    if (preferred !== null) return preferred;
    return numericMetric(record?.iterations);
  }

  function numericMetric(value) {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function validateTaskMetricField(record, fieldName) {
    if (record?.[fieldName] === undefined || record?.[fieldName] === null || record?.[fieldName] === "") return;
    const value = Number(record[fieldName]);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${fieldName} debe ser un numero entero igual o mayor a 0.`);
    }
  }

  function isTaskClosingStatusChange(oldStatus, newStatus) {
    return !isTaskDoneStatus(oldStatus) && isTaskDoneStatus(newStatus);
  }

  function isTaskReturnStatusChange(oldStatus, newStatus) {
    return (isTaskReviewStatus(oldStatus) || isTaskDoneStatus(oldStatus)) && isTaskBacklogOrActiveStatus(newStatus);
  }

  function prepareTaskForSave(existing, incoming) {
    const payload = { ...(existing || {}), ...(incoming || {}) };
    validateTaskMetricField(payload, "devoluciones");
    validateTaskMetricField(payload, "iterations");
    if (isTaskReturnStatusChange(existing?.status, payload.status)) {
      payload.iterations = Math.max(0, Number(existing?.iterations || incoming?.iterations || 0)) + 1;
    }
    if (isTaskClosingStatusChange(existing?.status, payload.status) && taskReturnMetric(payload) === null) {
      throw new Error("Para cerrar una tarea debes registrar devoluciones.");
    }
    return payload;
  }

  return {
    stores,
    catalogDefinitions,
    spMigrationTransitions,
    defaultSpMigrationStatusValues,
    spTransitionError,
    validateSpTransition,
    isTaskClosingStatusChange,
    prepareTaskForSave,
    taskReturnMetric
  };
});
