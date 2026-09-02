// Operational indicators, KPI reporting and scoring helpers.

function renderIndicators() {
  const container = $("#indicators-content");
  if (state.indicatorsTab === "kpis") {
    renderKpiIndicators(container);
    return;
  }
  renderOperationalIndicators(container);
}

function renderOperationalIndicators(container) {
  const members = filterRecords(state.data.members ?? []);
  const allMembers = state.data.members ?? [];
  const allTasks = state.data.tasks ?? [];
  const allBugs = state.data.bugs ?? [];
  const allTestCases = state.data.testCases ?? [];
  const allSpMigrations = state.data.spMigrations ?? [];
  const savedFilters = state.indicatorsFilters ?? { lote: "", funcionalidad: "", microservicio: "" };
  const lote = loteOptions().includes(savedFilters.lote) ? savedFilters.lote : "";
  const funcionalidad = funcionalidadOptions(lote).includes(savedFilters.funcionalidad) ? savedFilters.funcionalidad : "";
  const microservicio = microservicioOptions(lote, funcionalidad).includes(savedFilters.microservicio) ? savedFilters.microservicio : "";
  state.indicatorsFilters = { lote, funcionalidad, microservicio };

  const scopeActive = Boolean(lote || funcionalidad || microservicio);
  const scopedSpMigrations = scopeActive
    ? allSpMigrations.filter((sp) =>
      (!lote || sp.numeroLote === lote) &&
      (!funcionalidad || sp.funcionalidad === funcionalidad) &&
      (!microservicio || sp.nombreMicroservicio === microservicio))
    : allSpMigrations;
  const scopedMicroservicios = new Set(scopedSpMigrations.map((sp) => sp.nombreMicroservicio).filter(Boolean));

  const tasks = scopeActive ? allTasks.filter((task) => scopedMicroservicios.has(effectiveMicroservicio("tasks", task))) : allTasks;
  const testCases = scopeActive ? allTestCases.filter((test) => scopedMicroservicios.has(effectiveMicroservicio("testCases", test))) : allTestCases;
  const bugs = scopeActive
    ? allBugs.filter((bug) => scopedMicroservicios.has(effectiveMicroservicio("bugs", bug)))
    : allBugs;
  const spMigrations = scopedSpMigrations;
  const executionValues = catalogValues("testCases", "executionStatus");
  const bankApprovalValues = catalogValues("testCases", "bankApproval");
  const successfulExecutionValue = catalogValueByTerms("testCases", "executionStatus", ["Exitoso", "Passed", "Pass", "OK"], 0);
  const failedExecutionValue = catalogValueByTerms("testCases", "executionStatus", ["Fallido", "Failed", "Fail"], 1);
  const bankApprovedValue = catalogValueByTerms("testCases", "bankApproval", ["Aprobado", "Approved"], 0);
  const bankRejectedValue = catalogValueByTerms("testCases", "bankApproval", ["No Aprobado", "Rechazado", "Rejected"], 1);
  const activeTasks = tasks.filter((task) => !isTaskDone(task));
  const activeBugs = bugs.filter((bug) => !isBugClosed(bug));
  const executedTests = testCases.filter((test) => hasExecutionResult(test)).length;
  const successfulTests = testCases.filter((test) => effectiveCatalogValue("testCases", test, "executionStatus") === successfulExecutionValue).length;
  const failedTests = testCases.filter((test) => effectiveCatalogValue("testCases", test, "executionStatus") === failedExecutionValue).length;
  const pendingExecutionTests = testCases.length - executedTests;
  const bankApprovedTests = testCases.filter((test) => effectiveCatalogValue("testCases", test, "bankApproval") === bankApprovedValue).length;
  const bankRejectedTests = testCases.filter((test) => effectiveCatalogValue("testCases", test, "bankApproval") === bankRejectedValue).length;
  const bankPendingTests = testCases.length - bankApprovedTests - bankRejectedTests;
  const blockedTests = testCases.filter((test) => isBlockedTest(test)).length;
  const highPriorityActiveBugs = activeBugs.filter((bug) => isHighPriorityBug(bug)).length;
  const completedSp = spMigrations.filter((sp) => isCompletedSp(sp)).length;
  const qmetryReady = spMigrations.filter((sp) => isQmetryReady(sp)).length;
  const matrixReady = spMigrations.filter((sp) => isMatrixReady(sp)).length;
  const averageCapacity = allMembers.length
    ? Math.round(allMembers.reduce((total, member) => total + Number(member.capacity || 0), 0) / allMembers.length)
    : 0;
  const defectDensity = executedTests > 0 ? Math.round((bugs.length / executedTests) * 100) : 0;
  const blockRate = percentage(blockedTests, testCases.length);
  const successRateExecuted = percentage(successfulTests, executedTests);
  const failedRateExecuted = percentage(failedTests, executedTests);
  const bankReadiness = readinessScore({
    executedPct: percentage(executedTests, testCases.length),
    bankApprovedPct: percentage(bankApprovedTests, testCases.length),
    matrixPct: percentage(matrixReady, spMigrations.length),
    qmetryPct: percentage(qmetryReady, spMigrations.length),
    highPriorityActiveBugs,
    blockedTests
  });
  const health = healthStatus({
    readiness: bankReadiness,
    failedPct: failedRateExecuted,
    blockedPct: blockRate,
    highPriorityActiveBugs
  });

  const memberStats = members.map((member) => {
    const memberTasks = activeTasks.filter((task) => task.memberId === member.id);
    const memberBugs = activeBugs.filter((bug) => bug.memberId === member.id);
    const memberSp = spMigrations.filter((sp) => sp.qaId === member.id && !isCompletedSp(sp));
    const capacity = Number(member.capacity || 0);
    const riskScore = operationalRiskScore({
      activeTasks: memberTasks.length,
      reviewTasks: memberTasks.filter((task) => isTaskInReview(task)).length,
      activeBugs: memberBugs.length,
      activeSp: memberSp.length,
      capacity
    });
    return {
      ...member,
      activeTasks: memberTasks.length,
      reviewTasks: memberTasks.filter((task) => isTaskInReview(task)).length,
      activeBugs: memberBugs.length,
      activeSp: memberSp.length,
      capacity,
      riskScore
    };
  }).sort((a, b) => (b.activeTasks + b.activeBugs + b.activeSp) - (a.activeTasks + a.activeBugs + a.activeSp));

  const scopeLabel = microservicio || funcionalidad || lote || "Todos los lotes";
  const riskiestMember = [...memberStats].sort((a, b) => b.riskScore - a.riskScore)[0];
  const scopedLoteNames = uniqueValues(spMigrations, "numeroLote");
  const scopedFuncionalidadNames = uniqueValues(spMigrations, "funcionalidad");
  const scopedMicroservicioNames = uniqueValues(spMigrations, "nombreMicroservicio");
  const microservicioHealthItems = scopedMicroservicioNames.map((name) => microservicioHealthItem(name, allTestCases, allBugs));

  const savedRiskFilters = state.riskFilters ?? { dateFrom: "", dateTo: "", lote: "", funcionalidad: "", microservicio: "" };
  const riskLote = loteOptions().includes(savedRiskFilters.lote) ? savedRiskFilters.lote : "";
  const riskFuncionalidad = funcionalidadOptions(riskLote).includes(savedRiskFilters.funcionalidad) ? savedRiskFilters.funcionalidad : "";
  const riskMicroservicio = microservicioOptions(riskLote, riskFuncionalidad).includes(savedRiskFilters.microservicio) ? savedRiskFilters.microservicio : "";
  state.riskFilters = { ...savedRiskFilters, lote: riskLote, funcionalidad: riskFuncionalidad, microservicio: riskMicroservicio };
  const riskScopeActive = Boolean(riskLote || riskFuncionalidad || riskMicroservicio);
  const riskSpMigrations = riskScopeActive
    ? allSpMigrations.filter((sp) =>
      (!riskLote || sp.numeroLote === riskLote) &&
      (!riskFuncionalidad || sp.funcionalidad === riskFuncionalidad) &&
      (!riskMicroservicio || sp.nombreMicroservicio === riskMicroservicio))
    : allSpMigrations;
  const riskMicroservicioNames = [...new Set(riskSpMigrations.map((sp) => sp.nombreMicroservicio).filter(Boolean))];
  const microservicioOverdueItems = riskMicroservicioNames.map((name) => microservicioOverdueItem(name, allTasks, state.riskFilters.dateFrom, state.riskFilters.dateTo));
  const cards = [
    indicatorScopeMetric({
      lotes: scopedLoteNames.length,
      funcionalidades: scopedFuncionalidadNames.length,
      microservicios: scopedMicroservicioNames.length,
      scopeLabel
    }),
    indicatorMetric("Casos ejecutados", `${percentage(executedTests, testCases.length)}%`, `${executedTests} de ${testCases.length} con ${fieldLabel("testCases", "executionStatus")}`, metricTone(percentage(executedTests, testCases.length), "high"), `Mide avance real de ejecucion. Formula: TC con ${fieldLabel("testCases", "executionStatus")} informado / total de TC.`),
    indicatorMetric("TC aprobados banco", `${percentage(bankApprovedTests, testCases.length)}%`, `${bankApprovedTests} de ${testCases.length} aprobados`, metricTone(percentage(bankApprovedTests, testCases.length), "high"), `Mide aceptacion del banco. Formula: TC con ${fieldLabel("testCases", "bankApproval")} = ${catalogLabel("testCases", "bankApproval", bankApprovedValue)} / total de TC.`),
    indicatorMetric("Calidad entrega", `${successRateExecuted}%`, `${failedRateExecuted}% fallidos sobre ejecutados`, metricTone(successRateExecuted, "high"), `Mide calidad solo sobre lo ejecutado. Formula: TC con ${fieldLabel("testCases", "executionStatus")} = ${catalogLabel("testCases", "executionStatus", successfulExecutionValue)} / TC ejecutados.`),
    indicatorMetric("Sin ejecutar", `${percentage(pendingExecutionTests, testCases.length)}%`, `${pendingExecutionTests} de ${testCases.length} pendientes`, metricTone(percentage(pendingExecutionTests, testCases.length), "low"), "Mide deuda de ejecucion. Formula: TC sin resultado de ejecucion / total de TC."),
    indicatorMetric("Densidad defectos", defectDensity, "errores por 100 TC ejecutados", metricTone(defectDensity, "low", { good: 10, warning: 25 }), "Mide concentracion de errores. Formula: errores registrados / TC ejecutados * 100."),
    indicatorMetric("Tasa bloqueo", `${blockRate}%`, `${blockedTests} de ${testCases.length} casos bloqueados`, metricTone(blockRate, "low"), `Mide bloqueo de pruebas. Formula: TC con ${fieldLabel("testCases", "status")} = Bloqueado / total de TC.`),
    indicatorMetric("Preparacion banco", `${bankReadiness}%`, `${matrixReady} matriz, ${qmetryReady} QMetry`, metricTone(bankReadiness, "high"), "Score ponderado. Formula: ejecucion 25% + aprobacion banco 35% + matriz 20% + QMetry 20% - penalizacion por errores altos y bloqueos."),
    indicatorMetric("Salud por Microservicio", health.label, `${health.score}% de salud operativa`, metricTone(health.score, "high"), "Semaforo operativo. Formula: preparacion banco - penalizacion por fallidos, bloqueos y errores activos de severidad Critica/Alta."),
    indicatorMetric("SP finalizados", `${percentage(completedSp, spMigrations.length)}%`, `${completedSp} de ${spMigrations.length} cerrados`, metricTone(percentage(completedSp, spMigrations.length), "high"), "Mide cierre de alcance. Formula: SP con estado Finalizado / total de SP."),
    indicatorMetric("Total errores", bugs.length, scopeActive ? `para ${scopeLabel}` : "en todos los lotes", metricTone(bugs.length, "lowCount", { good: 0, warning: 10 }), "Cuenta todos los errores registrados para el alcance seleccionado. Formula: errores cuyo microservicio pertenece al lote, funcionalidad o microservicio filtrado."),
    indicatorMetric("Errores activos", activeBugs.length, `${highPriorityActiveBugs} de alta prioridad`, metricTone(activeBugs.length, "lowCount", { good: 0, warning: 5 }), "Errores abiertos para seguimiento. Formula: errores cuyo estado no es Resuelto ni Cerrado."),
    indicatorMetric("QMetry listo", qmetryReady, scopeActive ? "para el alcance elegido" : "evidencia o etapa QMetry", metricTone(percentage(qmetryReady, spMigrations.length), "high"), "Mide evidencia lista. Formula: SP con evidencia QMetry marcada o estado Evidencia QMetry."),
    indicatorMetric("Riesgo QA", riskiestMember ? riskiestMember.riskScore : 0, riskiestMember ? riskiestMember.name : "sin asignaciones", metricTone(riskiestMember?.riskScore || 0, "low", { good: 25, warning: 50 }), "Mide carga operativa por QA. Formula: SP activos*12 + errores activos*8 + tareas en revision*4 + tareas activas*3 + carga/5."),
    indicatorMetric("Carga promedio", `${averageCapacity}%`, `${allMembers.length} miembro(s) QA`, metricTone(averageCapacity, "balanced"), "Promedio de carga declarada del equipo. Formula: suma de carga de miembros QA / numero de miembros."),
    indicatorMetric("Total de tareas", tasks.length, scopeActive ? `para ${scopeLabel}` : "en todos los lotes", "neutral", "Cuenta todas las tareas creadas para el alcance seleccionado, sin importar su estado. Formula: tareas con SP = filtro elegido (o todas si no hay filtro).")
  ];

  container.innerHTML = `
    ${indicatorTabs()}
    <section class="panel indicator-toolbar">
      <div class="indicator-scope">
        <div>
          <p class="eyebrow">Filtro</p>
          <h2>${escapeHtml(scopeLabel)}</h2>
        </div>
        <div class="indicator-filter-row">
          <label class="indicator-select" for="indicator-lote-filter">
            <span>Lote</span>
            <select id="indicator-lote-filter">
              <option value="">Todos los lotes</option>
              ${loteOptions().map((value) => `<option value="${escapeHtml(value)}" ${value === lote ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
            </select>
          </label>
          <label class="indicator-select" for="indicator-funcionalidad-filter">
            <span>Funcionalidad</span>
            <select id="indicator-funcionalidad-filter">
              <option value="">Todas las funcionalidades</option>
              ${funcionalidadOptions(lote).map((value) => `<option value="${escapeHtml(value)}" ${value === funcionalidad ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
            </select>
          </label>
          <label class="indicator-select" for="indicator-microservicio-filter">
            <span>Microservicio</span>
            <select id="indicator-microservicio-filter">
              <option value="">Todos los microservicios</option>
              ${microservicioOptions(lote, funcionalidad).map((value) => `<option value="${escapeHtml(value)}" ${value === microservicio ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
            </select>
          </label>
        </div>
      </div>
    </section>

    <div class="indicator-grid">
      ${cards.map(metricCard).join("")}
    </div>

    ${spOverdueSemaphore(microservicioOverdueItems, state.riskFilters)}

    <div class="detail-grid">
      ${detailBreakdown(fieldLabel("testCases", "executionStatus"), [
        ...executionValues.map((value) => ({
          label: catalogLabel("testCases", "executionStatus", value),
          value: testCases.filter((test) => effectiveCatalogValue("testCases", test, "executionStatus") === value).length,
          tone: value === successfulExecutionValue ? "good" : value === failedExecutionValue ? "danger" : "neutral",
          tooltip: `Formula: TC con ${fieldLabel("testCases", "executionStatus")} = ${catalogLabel("testCases", "executionStatus", value)} / total de TC.`
        })),
        { label: "Sin ejecutar", value: pendingExecutionTests, tone: "warning", tooltip: "Formula: TC sin resultado de ejecucion / total de TC." }
      ], testCases.length)}
      ${detailBreakdown(fieldLabel("testCases", "bankApproval"), [
        ...bankApprovalValues.map((value) => ({
          label: catalogLabel("testCases", "bankApproval", value),
          value: testCases.filter((test) => effectiveCatalogValue("testCases", test, "bankApproval") === value).length,
          tone: value === bankApprovedValue ? "good" : value === bankRejectedValue ? "danger" : "neutral",
          tooltip: `Formula: TC con ${fieldLabel("testCases", "bankApproval")} = ${catalogLabel("testCases", "bankApproval", value)} / total de TC.`
        })),
        { label: "Sin decision", value: bankPendingTests, tone: "warning", tooltip: "Formula: TC sin valor de aprobacion banco / total de TC." }
      ], testCases.length)}
      ${detailBreakdown("Errores por estado", catalogValues("bugs", "status").map((status) => ({
        label: catalogLabel("bugs", "status", status),
        value: bugs.filter((bug) => bug.status === status).length,
        tone: isCatalogMatch("bugs", "status", status, ["Resuelto", "Cerrado", "Closed", "Done"]) ? "good" : "danger",
        tooltip: `Formula: errores con estado ${catalogLabel("bugs", "status", status)} / total de errores.`
      })), bugs.length)}
      ${detailBreakdown("Casos por estado", catalogValues("testCases", "status").map((status) => ({
        label: catalogLabel("testCases", "status", status),
        value: testCases.filter((test) => test.status === status).length,
        tone: isCatalogMatch("testCases", "status", status, ["Ejecutado", "Finalizado", "Completado"]) ? "good" : isCatalogMatch("testCases", "status", status, ["Bloqueado"]) ? "danger" : "neutral",
        tooltip: `Formula: TC con estado ${catalogLabel("testCases", "status", status)} / total de TC.`
      })), testCases.length)}
      ${detailBreakdown(fieldLabel("testCases", "priority"), catalogValues("testCases", "priority").map((priority) => ({
        label: catalogLabel("testCases", "priority", priority),
        value: testCases.filter((test) => effectiveCatalogValue("testCases", test, "priority") === priority).length,
        tone: isCatalogMatch("testCases", "priority", priority, ["Alta", "High"]) ? "warning" : "neutral",
        tooltip: `Formula: TC con ${fieldLabel("testCases", "priority")} = ${catalogLabel("testCases", "priority", priority)} / total de TC.`
      })), testCases.length)}
      ${detailBreakdown(fieldLabel("bugs", "severity"), catalogValues("bugs", "severity").map((severity) => ({
        label: catalogLabel("bugs", "severity", severity),
        value: bugs.filter((bug) => effectiveCatalogValue("bugs", bug, "severity") === severity).length,
        tone: isCatalogMatch("bugs", "severity", severity, ["Critica", "Alta", "Critical", "High"]) ? "danger" : "neutral",
        tooltip: `Formula: errores con ${fieldLabel("bugs", "severity")} = ${catalogLabel("bugs", "severity", severity)} / total de errores.`
      })), bugs.length)}
      ${detailBreakdown("Calidad sobre ejecutados", [
        { label: catalogLabel("testCases", "executionStatus", successfulExecutionValue), value: successfulTests, tone: "good", tooltip: `Formula: TC con ${fieldLabel("testCases", "executionStatus")} = ${catalogLabel("testCases", "executionStatus", successfulExecutionValue)} / TC ejecutados.` },
        { label: catalogLabel("testCases", "executionStatus", failedExecutionValue), value: failedTests, tone: "danger", tooltip: `Formula: TC con ${fieldLabel("testCases", "executionStatus")} = ${catalogLabel("testCases", "executionStatus", failedExecutionValue)} / TC ejecutados.` }
      ], executedTests)}
      ${detailBreakdown("Artefactos SP", [
        { label: fieldLabel("spMigrations", "equivalenceMatrixReady"), value: matrixReady, tone: "good", tooltip: "Formula: SP con matriz lista o estado equivalente / total de SP." },
        { label: fieldLabel("spMigrations", "qmetryEvidenceReady"), value: qmetryReady, tone: "good", tooltip: "Formula: SP con evidencia QMetry o estado equivalente / total de SP." }
      ], spMigrations.length)}
      ${percentBreakdown("Preparacion banco", [
        { label: "TC ejecutados", value: `${executedTests}/${testCases.length}`, pct: percentage(executedTests, testCases.length), tooltip: "Formula: TC ejecutados / total de TC." },
        { label: "TC aprobados", value: `${bankApprovedTests}/${testCases.length}`, pct: percentage(bankApprovedTests, testCases.length), tooltip: "Formula: TC aprobados por banco / total de TC." },
        { label: "Matriz lista", value: `${matrixReady}/${spMigrations.length}`, pct: percentage(matrixReady, spMigrations.length), tooltip: "Formula: SP con matriz lista / total de SP." },
        { label: "QMetry listo", value: `${qmetryReady}/${spMigrations.length}`, pct: percentage(qmetryReady, spMigrations.length), tooltip: "Formula: SP con evidencia QMetry / total de SP." }
      ])}
    </div>

    <div class="indicators-layout">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Miembros</p>
            <h2>Indicadores por miembro</h2>
          </div>
        </div>
        <div class="member-indicators">
          ${memberStats.length ? memberStats.map(memberIndicatorRow).join("") : `<div class="empty-state">No hay miembros para mostrar.</div>`}
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Graficas</p>
            <h2>Distribucion operativa</h2>
          </div>
        </div>
        <div class="chart-grid">
          ${barChart("Tareas por estado", Object.entries(statusLabels).map(([status, label]) => ({
            label,
            value: tasks.filter((task) => task.status === status).length
          })))}
          ${barChart("SP por estado", spMigrationStatuses.map((status) => ({
            label: catalogLabel("spMigrations", "status", status),
            value: spMigrations.filter((sp) => sp.status === status).length
          })))}
          ${barChart("Errores por estado", catalogValues("bugs", "status").map((status) => ({
            label: catalogLabel("bugs", "status", status),
            value: bugs.filter((bug) => bug.status === status).length
          })))}
          ${barChart("Errores activos por severidad", catalogValues("bugs", "severity").map((severity) => ({
            label: catalogLabel("bugs", "severity", severity),
            value: activeBugs.filter((bug) => effectiveCatalogValue("bugs", bug, "severity") === severity).length
          })))}
          ${barChart("Casos por prioridad", catalogValues("testCases", "priority").map((priority) => ({
            label: catalogLabel("testCases", "priority", priority),
            value: testCases.filter((test) => effectiveCatalogValue("testCases", test, "priority") === priority).length
          })))}
          ${barChart("Artefactos por SP", [
            { label: fieldLabel("spMigrations", "equivalenceMatrixReady"), value: matrixReady },
            { label: fieldLabel("spMigrations", "qmetryEvidenceReady"), value: qmetryReady }
          ])}
          ${barChart("Salud por Microservicio", microservicioHealthItems.map((item) => ({
            label: `${item.label} (${item.status})`,
            value: item.score,
            suffix: "%",
            tone: metricTone(item.score, "high"),
            tooltip: "Formula: preparacion banco - penalizacion por fallidos, bloqueos y errores activos Critica/Alta."
          })))}
          ${barChart("Riesgo por miembro", memberStats.map((member) => ({
            label: member.name,
            value: member.riskScore,
            tone: metricTone(member.riskScore, "low", { good: 25, warning: 50 }),
            tooltip: "Formula: SP activos*12 + errores activos*8 + tareas en revision*4 + tareas activas*3 + carga/5."
          })))}
          ${barChart("Carga por miembro", memberStats.map((member) => ({
            label: member.name,
            value: member.capacity,
            suffix: "%",
            tone: metricTone(member.capacity, "balanced"),
            tooltip: "Formula: porcentaje de carga declarado para el miembro QA."
          })))}
        </div>
      </section>
    </div>
  `;

  bindIndicatorTabs(container);
  container.querySelector("#indicator-lote-filter")?.addEventListener("change", (event) => {
    state.indicatorsFilters = { lote: event.target.value, funcionalidad: "", microservicio: "" };
    renderIndicators();
  });
  container.querySelector("#indicator-funcionalidad-filter")?.addEventListener("change", (event) => {
    state.indicatorsFilters = { ...state.indicatorsFilters, funcionalidad: event.target.value, microservicio: "" };
    renderIndicators();
  });
  container.querySelector("#indicator-microservicio-filter")?.addEventListener("change", (event) => {
    state.indicatorsFilters = { ...state.indicatorsFilters, microservicio: event.target.value };
    renderIndicators();
  });

  container.querySelector("[data-risk-date-from]")?.addEventListener("change", (event) => {
    state.riskFilters = { ...state.riskFilters, dateFrom: event.target.value };
    renderIndicators();
  });
  container.querySelector("[data-risk-date-to]")?.addEventListener("change", (event) => {
    state.riskFilters = { ...state.riskFilters, dateTo: event.target.value };
    renderIndicators();
  });
  container.querySelector("[data-risk-lote]")?.addEventListener("change", (event) => {
    const riskLote = event.target.value;
    const clearedDates = riskLote ? { dateFrom: "", dateTo: "" } : {};
    state.riskFilters = { ...state.riskFilters, lote: riskLote, funcionalidad: "", microservicio: "", ...clearedDates };
    renderIndicators();
  });
  container.querySelector("[data-risk-funcionalidad]")?.addEventListener("change", (event) => {
    const riskFuncionalidad = event.target.value;
    const clearedDates = riskFuncionalidad ? { dateFrom: "", dateTo: "" } : {};
    state.riskFilters = { ...state.riskFilters, funcionalidad: riskFuncionalidad, microservicio: "", ...clearedDates };
    renderIndicators();
  });
  container.querySelector("[data-risk-microservicio]")?.addEventListener("change", (event) => {
    const riskMicroservicio = event.target.value;
    const clearedDates = riskMicroservicio ? { dateFrom: "", dateTo: "" } : {};
    state.riskFilters = { ...state.riskFilters, microservicio: riskMicroservicio, ...clearedDates };
    renderIndicators();
  });
  container.querySelector("[data-risk-clear]")?.addEventListener("click", () => {
    state.riskFilters = { dateFrom: "", dateTo: "", lote: "", funcionalidad: "", microservicio: "" };
    renderIndicators();
  });
}

function indicatorTabs() {
  const activeTab = state.indicatorsTab || "operational";
  return `
    <div class="indicator-tabs" role="tablist" aria-label="Indicadores">
      <button type="button" role="tab" data-indicator-tab="operational" aria-selected="${activeTab === "operational"}" class="${activeTab === "operational" ? "active" : ""}">Operativos</button>
      <button type="button" role="tab" data-indicator-tab="kpis" aria-selected="${activeTab === "kpis"}" class="${activeTab === "kpis" ? "active" : ""}">KPIs</button>
    </div>
  `;
}

function bindIndicatorTabs(container) {
  container.querySelectorAll("[data-indicator-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.indicatorsTab = button.dataset.indicatorTab;
      renderIndicators();
    });
  });
}

function renderKpiIndicators(container) {
  const period = validKpiPeriod(state.kpiPeriod) ? state.kpiPeriod : currentKpiPeriod();
  state.kpiPeriod = period;
  const periodTasks = (state.data.tasks ?? []).filter((task) => taskDueDateIsInPeriod(task, period));
  const rows = kpiMemberRows(periodTasks);
  const totals = kpiPeriodTotals(period, periodTasks);
  const periodLabel = kpiPeriodLabel(period);

  container.innerHTML = `
    ${indicatorTabs()}
    <section class="panel indicator-toolbar">
      <div class="indicator-scope">
        <div>
          <p class="eyebrow">Reporte automatico</p>
          <h2>KPIs QA - ${escapeHtml(periodLabel)}</h2>
        </div>
        <label class="indicator-select" for="kpi-period-filter">
          <span>Mes / Ano</span>
          <input id="kpi-period-filter" type="month" value="${escapeHtml(period)}" aria-label="Mes y ano del reporte KPI">
        </label>
      </div>
    </section>

    ${kpiSection({
      number: 1,
      title: "Eficiencia",
      formula: `Eficiencia (%) = (tareas que entraron a "En revision" a tiempo / tareas planeadas de ${periodLabel}) x 100.`,
      headers: ["Persona", "Tareas planeadas", "En revision a tiempo", "Eficiencia"],
      rows: rows.map((row) => [row.name, row.plannedTasks, row.reviewOnTime, formatKpiPercent(row.efficiency)])
    })}

    ${kpiSection({
      number: 2,
      title: "Calidad",
      formula: "Calidad (%) = (1 - (puntos / (3 x tareas del periodo))) x 100; puntos suma Alta=3, Media=2, Baja=1 en tareas kind=\"Correccion\".",
      headers: ["Persona", "Correcciones", "Puntos", "Tareas planeadas", "Calidad"],
      rows: rows.map((row) => [row.name, row.corrections, row.points, row.plannedTasks, formatKpiPercent(row.quality)])
    })}

    ${kpiSection({
      number: 3,
      title: "Eficacia",
      formula: "Eficacia (%) = (1 - (cantidad de tareas kind=\"Correccion\" / tareas del periodo)) x 100.",
      headers: ["Persona", "Correcciones", "Tareas planeadas", "Eficacia"],
      rows: rows.map((row) => [row.name, row.corrections, row.plannedTasks, formatKpiPercent(row.efficacy)])
    })}

    <section class="panel kpi-section">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Seccion 4</p>
          <h2>Totales (${escapeHtml(periodLabel)})</h2>
        </div>
      </div>
      <div class="table-wrap kpi-table-wrap">
        <table class="kpi-table">
          <thead>
            <tr><th>Dato</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr><td>Tareas del periodo</td><td>${escapeHtml(totals.tasksInPeriod)}</td></tr>
            <tr><td>Microservicios creados</td><td>${escapeHtml(totals.microservicesCreated)}</td></tr>
            <tr><td>Casos de prueba creados</td><td>${escapeHtml(totals.testCasesCreated)}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  bindIndicatorTabs(container);
  container.querySelector("#kpi-period-filter")?.addEventListener("change", (event) => {
    state.kpiPeriod = validKpiPeriod(event.target.value) ? event.target.value : currentKpiPeriod();
    renderIndicators();
  });
}

function kpiSection({ number, title, formula, headers, rows }) {
  return `
    <section class="panel kpi-section">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Seccion ${number}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
      </div>
      <div class="kpi-formula"><strong>Formula:</strong> ${escapeHtml(formula)}</div>
      <div class="table-wrap kpi-table-wrap">
        <table class="kpi-table">
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}"><div class="empty-state">No hay tareas con responsable en este periodo.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function kpiMemberRows(periodTasks) {
  const membersById = new Map((state.data.members ?? []).map((member) => [member.id, member]));
  const tasksByMember = new Map();
  periodTasks.forEach((task) => {
    if (!task.memberId || !membersById.has(task.memberId)) return;
    tasksByMember.set(task.memberId, [...(tasksByMember.get(task.memberId) ?? []), task]);
  });
  return [...tasksByMember.entries()]
    .map(([memberId, tasks]) => kpiMemberRow(membersById.get(memberId), tasks))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function kpiMemberRow(member, tasks) {
  const plannedTasks = tasks.length;
  const corrections = tasks.filter(isKpiCorrectionTask);
  const points = corrections.reduce((total, task) => total + correctionPriorityWeight(task.priority), 0);
  const reviewOnTime = tasks.filter(taskEnteredReviewOnOrBeforeDueDate).length;
  return {
    name: member.name || "Sin nombre",
    plannedTasks,
    reviewOnTime,
    corrections: corrections.length,
    points,
    efficiency: (reviewOnTime / plannedTasks) * 100,
    quality: corrections.length ? (1 - (points / (3 * plannedTasks))) * 100 : 100,
    efficacy: (1 - (corrections.length / plannedTasks)) * 100
  };
}

function kpiPeriodTotals(period, periodTasks = []) {
  return {
    tasksInPeriod: periodTasks.length,
    microservicesCreated: countCreatedInPeriod(state.data.spMigrations, period),
    testCasesCreated: countCreatedInPeriod(state.data.testCases, period)
  };
}

function countCreatedInPeriod(records = [], period) {
  return records.filter((record) => periodFromDate(record.createdAt) === period).length;
}

function isKpiCorrectionTask(task) {
  return task.kind === "Correccion";
}

function correctionPriorityWeight(priority) {
  return { Alta: 3, Media: 2, Baja: 1 }[priority] ?? 0;
}

function taskEnteredReviewOnOrBeforeDueDate(task) {
  const reviewDate = dateKey(taskReviewEntryAt(task));
  const dueDate = dateKey(task.dueDate);
  return Boolean(reviewDate && dueDate && reviewDate <= dueDate);
}

function taskDueDateIsInPeriod(task, period) {
  return periodFromDate(task.dueDate) === period;
}

function validKpiPeriod(period) {
  return /^\d{4}-\d{2}$/.test(String(period || ""));
}

function currentKpiPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodFromDate(value) {
  const key = dateKey(value);
  return key ? key.slice(0, 7) : "";
}

function dateKey(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function kpiPeriodLabel(period) {
  const [year, month] = String(period || currentKpiPeriod()).split("-").map(Number);
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${months[Math.min(Math.max((month || 1) - 1, 0), 11)]} ${year || new Date().getFullYear()}`;
}

function formatKpiPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function hasExecutionResult(testCase) {
  const value = effectiveCatalogValue("testCases", testCase, "executionStatus");
  return Boolean(value && catalogValues("testCases", "executionStatus").includes(value));
}

function effectiveCatalogValue(store, record, fieldName) {
  return String(effectiveFieldValue(store, record, fieldName) ?? "").trim();
}

function fieldLabel(store, fieldName) {
  return fieldConfig[store]?.find((field) => field.name === fieldName)?.label || fieldName;
}

function catalogValueByTerms(store, fieldName, terms, fallbackIndex = 0) {
  const items = catalogOptions(store, fieldName);
  const normalizedTerms = terms.map(normalizeFilterText);
  const item = items.find((entry) => {
    return [entry.value, entry.label].some((text) => normalizedTerms.includes(normalizeFilterText(text)));
  });
  return item?.value || items[fallbackIndex]?.value || "";
}

function isCatalogMatch(store, fieldName, value, terms) {
  const normalizedTerms = terms.map(normalizeFilterText);
  const item = catalogOptions(store, fieldName).find((entry) => entry.value === value);
  return [value, item?.label].some((text) => normalizedTerms.includes(normalizeFilterText(text)));
}

function isTaskDone(task) {
  return isCatalogMatch("tasks", "status", effectiveCatalogValue("tasks", task, "status"), ["done", "Finalizado", "Completado", "Cerrado"]);
}

function isTaskInReview(task) {
  return isTaskReviewStatus(effectiveCatalogValue("tasks", task, "status"));
}

function isBugClosed(bug) {
  return isCatalogMatch("bugs", "status", effectiveCatalogValue("bugs", bug, "status"), ["Resuelto", "Cerrado", "Closed", "Done"]);
}

function isHighPriorityBug(bug) {
  return isCatalogMatch("bugs", "severity", effectiveCatalogValue("bugs", bug, "severity"), ["Critica", "Alta", "Critical", "High"]);
}

function isBlockedTest(testCase) {
  return isCatalogMatch("testCases", "status", effectiveCatalogValue("testCases", testCase, "status"), ["Bloqueado", "Blocked"]);
}

function isCompletedSp(sp) {
  return isCatalogMatch("spMigrations", "status", effectiveCatalogValue("spMigrations", sp, "status"), ["Finalizado", "Completado", "Cerrado", "Done"]);
}

function spStatusReached(sp, terms) {
  const status = effectiveCatalogValue("spMigrations", sp, "status");
  const targetValue = catalogValueByTerms("spMigrations", "status", terms, -1);
  const statusIndex = spMigrationStatuses.indexOf(status);
  const targetIndex = spMigrationStatuses.indexOf(targetValue);
  if (statusIndex >= 0 && targetIndex >= 0) return statusIndex >= targetIndex;
  return isCatalogMatch("spMigrations", "status", status, terms);
}

function isMatrixReady(sp) {
  return Boolean(sp.equivalenceMatrixReady || spStatusReached(sp, ["Matriz lista", "Evidencia QMetry", "En revision por banco", "Finalizado"]));
}

function isQmetryReady(sp) {
  return Boolean(sp.qmetryEvidenceReady || spStatusReached(sp, ["Evidencia QMetry", "Finalizado"]));
}

function indicatorMetric(label, value, detail, tone, tooltip) {
  return { label, value, detail, tone, tooltip };
}

function indicatorScopeMetric({ lotes, funcionalidades, microservicios, scopeLabel }) {
  return {
    type: "scope",
    label: "Alcance filtrado",
    value: microservicios,
    detail: `para ${scopeLabel}`,
    tone: "neutral",
    tooltip: "Cuenta valores unicos dentro del filtro superior. Formula: lotes, funcionalidades y microservicios distintos en Lotes y funcionalidades.",
    items: [
      { label: "Lotes", value: lotes },
      { label: "Funcionalidades", value: funcionalidades },
      { label: "Microservicios", value: microservicios }
    ]
  };
}

function metricCard(metric) {
  if (metric.type === "scope") return scopeMetricCard(metric);
  return `
    <article class="metric indicator-card indicator-${escapeHtml(metric.tone || "neutral")}" title="${escapeHtml(metric.tooltip || "")}" aria-label="${escapeHtml(`${metric.label}. ${metric.detail}. ${metric.tooltip || ""}`)}">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <span>${escapeHtml(metric.detail)}</span>
    </article>
  `;
}

function scopeMetricCard(metric) {
  return `
    <article class="metric indicator-card indicator-${escapeHtml(metric.tone || "neutral")}" title="${escapeHtml(metric.tooltip || "")}" aria-label="${escapeHtml(`${metric.label}. ${metric.detail}. ${metric.tooltip || ""}`)}">
      <span>${escapeHtml(metric.label)}</span>
      <div class="metric-triplet">
        ${metric.items.map((item) => `
          <span>
            <strong>${escapeHtml(item.value)}</strong>
            <small>${escapeHtml(item.label)}</small>
          </span>
        `).join("")}
      </div>
      <span>${escapeHtml(metric.detail)}</span>
    </article>
  `;
}

function uniqueValues(records, fieldName) {
  return [...new Set((records ?? []).map((record) => String(record?.[fieldName] ?? "").trim()).filter(Boolean))];
}

function metricTone(value, direction, thresholds = {}) {
  const number = Number(value || 0);
  const good = thresholds.good ?? (direction === "high" ? 70 : 10);
  const warning = thresholds.warning ?? (direction === "high" ? 40 : 30);
  if (direction === "high") {
    if (number >= good) return "good";
    if (number >= warning) return "warning";
    return "danger";
  }
  if (direction === "low" || direction === "lowCount") {
    if (number <= good) return "good";
    if (number <= warning) return "warning";
    return "danger";
  }
  if (direction === "balanced") {
    if (number <= 80) return "good";
    if (number <= 95) return "warning";
    return "danger";
  }
  return "neutral";
}

function readinessScore({ executedPct, bankApprovedPct, matrixPct, qmetryPct, highPriorityActiveBugs, blockedTests }) {
  const penalty = Math.min((highPriorityActiveBugs * 8) + (blockedTests * 4), 35);
  return clampPercent(Math.round(
    (executedPct * 0.25)
    + (bankApprovedPct * 0.35)
    + (matrixPct * 0.2)
    + (qmetryPct * 0.2)
    - penalty
  ));
}

function healthStatus({ readiness, failedPct, blockedPct, highPriorityActiveBugs }) {
  const score = clampPercent(Math.round(readiness - (failedPct * 0.25) - (blockedPct * 0.2) - Math.min(highPriorityActiveBugs * 6, 24)));
  if (score >= 75) return { label: "Verde", score };
  if (score >= 45) return { label: "Amarillo", score };
  return { label: "Rojo", score };
}

function operationalRiskScore({ activeTasks, reviewTasks, activeBugs, activeSp, capacity }) {
  return Math.round((activeSp * 12) + (activeBugs * 8) + (reviewTasks * 4) + (activeTasks * 3) + (clampPercent(capacity) / 5));
}

function microservicioHealthItem(name, allTestCases, allBugs) {
  const spTests = allTestCases.filter((test) => effectiveMicroservicio("testCases", test) === name);
  const spBugs = allBugs.filter((bug) => effectiveMicroservicio("bugs", bug) === name);
  const spActiveBugs = spBugs.filter((bug) => !isBugClosed(bug));
  const spExecuted = spTests.filter((test) => hasExecutionResult(test)).length;
  const successfulExecutionValue = catalogValueByTerms("testCases", "executionStatus", ["Exitoso", "Passed", "Pass", "OK"], 0);
  const failedExecutionValue = catalogValueByTerms("testCases", "executionStatus", ["Fallido", "Failed", "Fail"], 1);
  const bankApprovedValue = catalogValueByTerms("testCases", "bankApproval", ["Aprobado", "Approved"], 0);
  const spSuccessful = spTests.filter((test) => effectiveCatalogValue("testCases", test, "executionStatus") === successfulExecutionValue).length;
  const spFailed = spTests.filter((test) => effectiveCatalogValue("testCases", test, "executionStatus") === failedExecutionValue).length;
  const spApproved = spTests.filter((test) => effectiveCatalogValue("testCases", test, "bankApproval") === bankApprovedValue).length;
  const spBlocked = spTests.filter((test) => isBlockedTest(test)).length;
  const spHighPriorityBugs = spActiveBugs.filter((bug) => isHighPriorityBug(bug)).length;
  const spRows = (state.data.spMigrations ?? []).filter((sp) => sp.nombreMicroservicio === name);
  const matrixPct = percentage(spRows.filter(isMatrixReady).length, spRows.length);
  const qmetryPct = percentage(spRows.filter(isQmetryReady).length, spRows.length);
  const readiness = readinessScore({
    executedPct: percentage(spExecuted, spTests.length),
    bankApprovedPct: percentage(spApproved, spTests.length),
    matrixPct,
    qmetryPct,
    highPriorityActiveBugs: spHighPriorityBugs,
    blockedTests: spBlocked
  });
  const health = healthStatus({
    readiness,
    failedPct: percentage(spFailed, spExecuted),
    blockedPct: percentage(spBlocked, spTests.length),
    highPriorityActiveBugs: spHighPriorityBugs
  });
  return {
    label: name || "Sin nombre",
    status: health.label,
    score: health.score,
    successful: spSuccessful,
    failed: spFailed
  };
}

function microservicioOverdueItem(name, allTasks, dateFrom = "", dateTo = "") {
  const spTasks = allTasks.filter((task) => {
    if (effectiveMicroservicio("tasks", task) !== name) return false;
    if (dateFrom && (!task.dueDate || task.dueDate < dateFrom)) return false;
    if (dateTo && (!task.dueDate || task.dueDate > dateTo)) return false;
    return true;
  });
  const overdueCount = spTasks.filter(taskIsOverdue).length;
  const pct = percentage(overdueCount, spTasks.length);
  return {
    label: name || "Sin nombre",
    pct,
    overdueCount,
    total: spTasks.length,
    tone: metricTone(pct, "low", { good: 10, warning: 50 })
  };
}

function spOverdueSemaphore(items, filters) {
  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.lote || filters.funcionalidad || filters.microservicio;
  return `
    <section class="panel sp-overdue-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Riesgo por fechas</p>
          <h2>Tareas vencidas por Microservicio</h2>
        </div>
      </div>
      <div class="kanban-filter-bar">
        <div class="kanban-filter-controls">
          <label class="kanban-filter-field">
            <span>Desde</span>
            <input type="date" data-risk-date-from value="${escapeHtml(filters.dateFrom || "")}">
          </label>
          <label class="kanban-filter-field">
            <span>Hasta</span>
            <input type="date" data-risk-date-to value="${escapeHtml(filters.dateTo || "")}">
          </label>
          <label class="kanban-filter-field">
            <span>Lote</span>
            <select data-risk-lote>
              <option value="">Todos los lotes</option>
              ${loteOptions().map((value) => `<option value="${escapeHtml(value)}" ${value === filters.lote ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
            </select>
          </label>
          <label class="kanban-filter-field">
            <span>Funcionalidad</span>
            <select data-risk-funcionalidad>
              <option value="">Todas las funcionalidades</option>
              ${funcionalidadOptions(filters.lote).map((value) => `<option value="${escapeHtml(value)}" ${value === filters.funcionalidad ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
            </select>
          </label>
          <label class="kanban-filter-field">
            <span>Microservicio</span>
            <select data-risk-microservicio>
              <option value="">Todos los microservicios</option>
              ${microservicioOptions(filters.lote, filters.funcionalidad).map((value) => `<option value="${escapeHtml(value)}" ${value === filters.microservicio ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
            </select>
          </label>
          <button class="ghost-button ${hasActiveFilters ? "" : "hidden"}" type="button" data-risk-clear>Limpiar</button>
        </div>
      </div>
      <div class="legend-row">
        <p class="legend-line tone-good"><i class="legend-dot"></i><strong>Verde</strong> — la mayoria se entrego a tiempo</p>
        <p class="legend-line tone-warning"><i class="legend-dot"></i><strong>Amarillo</strong> — varias tareas empiezan a atrasarse</p>
        <p class="legend-line tone-danger"><i class="legend-dot"></i><strong>Rojo</strong> — faltan muchas tareas por entregar</p>
      </div>
      ${items.length ? `<div class="sp-ring-grid">${items.map(spOverdueRing).join("")}</div>` : `<div class="empty-state">No hay SP para mostrar.</div>`}
    </section>
  `;
}

function spOverdueRing(item) {
  return `
    <div class="sp-ring-tile" title="Formula: tareas vencidas / total de tareas del microservicio. ${item.overdueCount} de ${item.total} tareas vencidas.">
      <div class="ring tone-${escapeHtml(item.tone)}"><span>${item.pct}%</span></div>
      <span class="sp-name">${escapeHtml(item.label)}</span>
      <span class="sp-count">${item.overdueCount} de ${item.total} tareas</span>
    </div>
  `;
}

function detailBreakdown(title, items, total) {
  const visibleItems = items.length ? items : [{ label: "Sin datos", value: 0 }];
  return `
    <article class="detail-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="detail-list">
        ${visibleItems.map((item) => {
          const value = Number(item.value || 0);
          const pct = percentage(value, total);
          const tone = item.tone || metricTone(pct, "high");
          const tooltip = item.tooltip || `Formula: ${item.label} / total (${total}).`;
          return `
            <div class="detail-row detail-${escapeHtml(tone)}" title="${escapeHtml(tooltip)}">
              <div class="detail-label">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(value)} (${pct}%)</strong>
              </div>
              <div class="bar-track"><span style="width: ${Math.max(pct, value ? 4 : 0)}%"></span></div>
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function percentBreakdown(title, items) {
  const visibleItems = items.length ? items : [{ label: "Sin datos", value: "0", pct: 0 }];
  return `
    <article class="detail-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="detail-list">
        ${visibleItems.map((item) => {
          const pct = clampPercent(item.pct);
          const tone = item.tone || metricTone(pct, "high");
          const tooltip = item.tooltip || `Formula: ${item.label}.`;
          return `
            <div class="detail-row detail-${escapeHtml(tone)}" title="${escapeHtml(tooltip)}">
              <div class="detail-label">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.value)} (${pct}%)</strong>
              </div>
              <div class="bar-track"><span style="width: ${Math.max(pct, pct ? 4 : 0)}%"></span></div>
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function memberIndicatorRow(member) {
  const initials = member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return `
    <article class="member-indicator-row">
      <div class="member-top">
        <div class="avatar">${escapeHtml(initials)}</div>
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <div class="card-meta">${escapeHtml(catalogLabel("members", "role", member.role) || "QA")} - ${escapeHtml(catalogLabel("members", "status", member.status) || "Disponible")}</div>
        </div>
        <span class="status-pill">${member.capacity}% carga</span>
      </div>
      <div class="progress" aria-label="Carga ${member.capacity}%"><span style="width: ${clampPercent(member.capacity)}%"></span></div>
      <div class="member-kpis">
        <span><strong>${member.activeTasks}</strong> tareas activas</span>
        <span><strong>${member.reviewTasks}</strong> en revision</span>
        <span><strong>${member.activeBugs}</strong> errores activos</span>
        <span><strong>${member.activeSp}</strong> SP asignados</span>
      </div>
    </article>
  `;
}

function barChart(title, items) {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
  const visibleItems = items.filter((item) => Number(item.value || 0) > 0);
  return `
    <article class="chart-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="bar-list">
        ${visibleItems.length ? visibleItems.map((item) => {
          const value = Number(item.value || 0);
          const width = Math.max(Math.round((value / max) * 100), 4);
          const tone = item.tone || "neutral";
          const tooltip = item.tooltip || `${title}. Valor: ${item.label} = ${value}${item.suffix || ""}.`;
          return `
            <div class="bar-row bar-${escapeHtml(tone)}" title="${escapeHtml(tooltip)}">
              <div class="bar-label">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(value)}${escapeHtml(item.suffix || "")}</strong>
              </div>
              <div class="bar-track"><span style="width: ${width}%"></span></div>
            </div>
          `;
        }).join("") : `<div class="empty-state compact-empty">Sin datos</div>`}
      </div>
    </article>
  `;
}

function percentage(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function clampPercent(value) {
  return Math.min(Math.max(Number(value || 0), 0), 100);
}
