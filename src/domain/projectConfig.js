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

  const taskReviewStatusTerms = new Set(["review", "en revision", "revision bb", "en revision bb"]);
  const taskDevolucionBbSourceStatuses = new Set(["done"]);
  const taskDevolucionBbTargetStatuses = new Set(["active", "backlog"]);

  function normalizeTaskStatus(status) {
    return String(status ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .toLowerCase()
      .trim();
  }

  function isTaskReviewStatus(status) {
    return taskReviewStatusTerms.has(normalizeTaskStatus(status));
  }

  function isTaskDevolucionBbTransition(oldStatus, newStatus) {
    const oldStatusKey = normalizeTaskStatus(oldStatus);
    const newStatusKey = normalizeTaskStatus(newStatus);
    return (isTaskReviewStatus(oldStatus) || taskDevolucionBbSourceStatuses.has(oldStatusKey)) && taskDevolucionBbTargetStatuses.has(newStatusKey);
  }

  const overdueTaskStatuses = new Set(["backlog", "active"]);

  function isTaskOverdue(task, todayIso) {
    if (!task?.dueDate || !todayIso) return false;
    if (!overdueTaskStatuses.has(task.status)) return false;
    return task.dueDate < todayIso;
  }

  return {
    stores,
    catalogDefinitions,
    isTaskDevolucionBbTransition,
    isTaskReviewStatus,
    isTaskOverdue
  };
});
