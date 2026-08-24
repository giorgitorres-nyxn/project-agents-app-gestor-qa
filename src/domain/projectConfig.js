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

  const taskIterationSourceStatuses = new Set(["review", "done"]);
  const taskIterationTargetStatuses = new Set(["active", "backlog"]);

  function isTaskIterationTransition(oldStatus, newStatus) {
    return taskIterationSourceStatuses.has(oldStatus) && taskIterationTargetStatuses.has(newStatus);
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
    isTaskIterationTransition,
    isTaskOverdue
  };
});
