// Operational indicators view and scoring helpers.

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
  const allUseCases = state.data.useCases ?? [];
  const allSpMigrations = state.data.spMigrations ?? [];
  const selectedSpId = allSpMigrations.some((sp) => sp.id === state.indicatorsSpMigrationId)
    ? state.indicatorsSpMigrationId
    : "";
  state.indicatorsSpMigrationId = selectedSpId;

  const selectedSp = allSpMigrations.find((sp) => sp.id === selectedSpId);
  const tasks = selectedSpId ? allTasks.filter((task) => task.spMigrationId === selectedSpId) : allTasks;
  const testCases = selectedSpId ? allTestCases.filter((test) => testCaseBelongsToSp(test, selectedSpId)) : allTestCases;
  const useCases = selectedSpId ? allUseCases.filter((useCase) => useCase.spMigrationId === selectedSpId) : allUseCases;
  const bugs = selectedSpId
    ? allBugs.filter((bug) => (bug.spMigrationId || findBugSpMigrationId(bug)) === selectedSpId)
    : allBugs;
  const spMigrations = selectedSpId ? allSpMigrations.filter((sp) => sp.id === selectedSpId) : allSpMigrations;
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
  const sqlReady = spMigrations.filter((sp) => sp.sqlReceived).length;
  const restReady = spMigrations.filter((sp) => sp.restReceived).length;
  const grpcReady = spMigrations.filter((sp) => sp.grpcReceived).length;
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

  const scopeLabel = selectedSp ? selectedSp.spName : "Todos los SP";
  const riskiestMember = [...memberStats].sort((a, b) => b.riskScore - a.riskScore)[0];
  const spHealthItems = spMigrations.map((sp) => spHealthItem(sp, allTestCases, allBugs));
  const cards = [
    indicatorMetric("Casos ejecutados", `${percentage(executedTests, testCases.length)}%`, `${executedTests} de ${testCases.length} con ${fieldLabel("testCases", "executionStatus")}`, metricTone(percentage(executedTests, testCases.length), "high"), `Mide avance real de ejecucion. Formula: TC con ${fieldLabel("testCases", "executionStatus")} informado / total de TC.`),
    indicatorMetric("TC aprobados banco", `${percentage(bankApprovedTests, testCases.length)}%`, `${bankApprovedTests} de ${testCases.length} aprobados`, metricTone(percentage(bankApprovedTests, testCases.length), "high"), `Mide aceptacion del banco. Formula: TC con ${fieldLabel("testCases", "bankApproval")} = ${catalogLabel("testCases", "bankApproval", bankApprovedValue)} / total de TC.`),
    indicatorMetric("Calidad entrega", `${successRateExecuted}%`, `${failedRateExecuted}% fallidos sobre ejecutados`, metricTone(successRateExecuted, "high"), `Mide calidad solo sobre lo ejecutado. Formula: TC con ${fieldLabel("testCases", "executionStatus")} = ${catalogLabel("testCases", "executionStatus", successfulExecutionValue)} / TC ejecutados.`),
    indicatorMetric("Sin ejecutar", `${percentage(pendingExecutionTests, testCases.length)}%`, `${pendingExecutionTests} de ${testCases.length} pendientes`, metricTone(percentage(pendingExecutionTests, testCases.length), "low"), "Mide deuda de ejecucion. Formula: TC sin resultado de ejecucion / total de TC."),
    indicatorMetric("Densidad defectos", defectDensity, "errores por 100 TC ejecutados", metricTone(defectDensity, "low", { good: 10, warning: 25 }), "Mide concentracion de errores. Formula: errores registrados / TC ejecutados * 100."),
    indicatorMetric("Tasa bloqueo", `${blockRate}%`, `${blockedTests} de ${testCases.length} casos bloqueados`, metricTone(blockRate, "low"), `Mide bloqueo de pruebas. Formula: TC con ${fieldLabel("testCases", "status")} = Bloqueado / total de TC.`),
    indicatorMetric("Preparacion banco", `${bankReadiness}%`, `${matrixReady} matriz, ${qmetryReady} QMetry`, metricTone(bankReadiness, "high"), "Score ponderado. Formula: ejecucion 25% + aprobacion banco 35% + matriz 20% + QMetry 20% - penalizacion por errores altos y bloqueos."),
    indicatorMetric("Salud SP", health.label, `${health.score}% de salud operativa`, metricTone(health.score, "high"), "Semaforo operativo. Formula: preparacion banco - penalizacion por fallidos, bloqueos y errores activos de severidad Critica/Alta."),
    indicatorMetric("SP finalizados", `${percentage(completedSp, spMigrations.length)}%`, `${completedSp} de ${spMigrations.length} cerrados`, metricTone(percentage(completedSp, spMigrations.length), "high"), "Mide cierre de alcance. Formula: SP con estado Finalizado / total de SP."),
    indicatorMetric("Errores activos", activeBugs.length, `${highPriorityActiveBugs} de alta prioridad`, metricTone(activeBugs.length, "lowCount", { good: 0, warning: 5 }), "Errores abiertos para seguimiento. Formula: errores cuyo estado no es Resuelto ni Cerrado."),
    indicatorMetric("QMetry listo", qmetryReady, selectedSpId ? "para el SP elegido" : "evidencia o etapa QMetry", metricTone(percentage(qmetryReady, spMigrations.length), "high"), "Mide evidencia lista. Formula: SP con evidencia QMetry marcada o estado Evidencia QMetry."),
    indicatorMetric("REST/gRPC listos", `${percentage(Math.min(restReady, grpcReady), spMigrations.length)}%`, `${restReady} REST, ${grpcReady} gRPC`, metricTone(percentage(Math.min(restReady, grpcReady), spMigrations.length), "high"), "Mide disponibilidad de endpoints. Formula: SP con REST y gRPC listos / total de SP."),
    indicatorMetric("Riesgo QA", riskiestMember ? riskiestMember.riskScore : 0, riskiestMember ? riskiestMember.name : "sin asignaciones", metricTone(riskiestMember?.riskScore || 0, "low", { good: 25, warning: 50 }), "Mide carga operativa por QA. Formula: SP activos*12 + errores activos*8 + tareas en revision*4 + tareas activas*3 + carga/5."),
    indicatorMetric("Carga promedio", `${averageCapacity}%`, `${allMembers.length} miembro(s) QA`, metricTone(averageCapacity, "balanced"), "Promedio de carga declarada del equipo. Formula: suma de carga de miembros QA / numero de miembros.")
  ];

  container.innerHTML = `
    ${indicatorTabs()}
    <section class="panel indicator-toolbar">
      <div class="indicator-scope">
        <div>
          <p class="eyebrow">Filtro</p>
          <h2>${escapeHtml(scopeLabel)}</h2>
        </div>
        <label class="indicator-select" for="indicator-sp-filter">
          <span>SP</span>
          <select id="indicator-sp-filter">
            <option value="">Todos los SP</option>
            ${allSpMigrations.map((sp) => `<option value="${escapeHtml(sp.id)}" ${sp.id === selectedSpId ? "selected" : ""}>${escapeHtml(sp.spName || "Sin nombre")}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>

    <div class="indicator-grid">
      ${cards.map(metricCard).join("")}
    </div>

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
        { label: fieldLabel("spMigrations", "sqlReceived"), value: sqlReady, tone: "neutral", tooltip: "Formula: SP con SQL recibido / total de SP." },
        { label: fieldLabel("spMigrations", "restReceived"), value: restReady, tone: "neutral", tooltip: "Formula: SP con REST recibido / total de SP." },
        { label: fieldLabel("spMigrations", "grpcReceived"), value: grpcReady, tone: "neutral", tooltip: "Formula: SP con gRPC recibido / total de SP." },
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
            { label: fieldLabel("spMigrations", "sqlReceived"), value: sqlReady },
            { label: fieldLabel("spMigrations", "restReceived"), value: restReady },
            { label: fieldLabel("spMigrations", "grpcReceived"), value: grpcReady },
            { label: fieldLabel("spMigrations", "equivalenceMatrixReady"), value: matrixReady },
            { label: fieldLabel("spMigrations", "qmetryEvidenceReady"), value: qmetryReady }
          ])}
          ${barChart("Casos de uso por estado", catalogValues("useCases", "status").map((status) => ({
            label: catalogLabel("useCases", "status", status),
            value: useCases.filter((useCase) => useCase.status === status).length
          })))}
          ${barChart("Salud por SP", spHealthItems.map((item) => ({
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
  container.querySelector("#indicator-sp-filter")?.addEventListener("change", (event) => {
    state.indicatorsSpMigrationId = event.target.value;
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
  const tasks = state.data.tasks ?? [];
  const periods = availableKpiPeriods(tasks);
  if (!state.kpiPeriod || !periods.includes(state.kpiPeriod)) {
    state.kpiPeriod = currentKpiPeriod();
  }
  if (!periods.includes(state.kpiPeriod)) periods.unshift(state.kpiPeriod);

  const periodTasks = tasks.filter((task) => task.memberId && taskIsInKpiPeriod(task, state.kpiPeriod));
  const memberIds = [...new Set(periodTasks.map((task) => task.memberId))];
  const members = (state.data.members ?? [])
    .filter((member) => memberIds.includes(member.id))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));
  const rows = members.map((member) => kpiMemberRow(member, periodTasks.filter((task) => task.memberId === member.id)));

  container.innerHTML = `
    ${indicatorTabs()}
    <section class="panel indicator-toolbar">
      <div class="indicator-scope kpi-scope">
        <div>
          <p class="eyebrow">Reporte mensual</p>
          <h2>Desempeno QA - ${escapeHtml(kpiPeriodLabel(state.kpiPeriod))}</h2>
          <p class="kpi-source">Fuente de calculo: tabla tasks; la planeacion se toma de Fecha limite.</p>
        </div>
        <label class="indicator-select" for="kpi-period-filter">
          <span>Periodo</span>
          <select id="kpi-period-filter">
            ${periods.map((period) => `<option value="${escapeHtml(period)}" ${period === state.kpiPeriod ? "selected" : ""}>${escapeHtml(kpiPeriodLabel(period))}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Modelo 3 factores</p>
          <h2>KPIs por miembro</h2>
        </div>
      </div>
      <div class="table-wrap kpi-table-wrap">
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Eficiencia</th>
              <th>Calidad</th>
              <th>Eficacia</th>
              <th>Auditoria</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(renderKpiTableRow).join("") : `<tr><td colspan="5"><div class="empty-state">No hay tareas para miembros QA en este periodo.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;

  bindIndicatorTabs(container);
  container.querySelector("#kpi-period-filter")?.addEventListener("change", (event) => {
    state.kpiPeriod = event.target.value;
    renderIndicators();
  });
}

function kpiMemberRow(member, periodTasks) {
  const plannedTasks = periodTasks.filter((task) => taskDueDateIsInPeriod(task, state.kpiPeriod));
  const doneOnTime = plannedTasks.filter((task) => isTaskDone(task) && taskDoneOnOrBeforeDueDate(task));
  const correctionTasks = periodTasks.filter(isCorrectionTask);
  const weightedCorrections = correctionTasks.reduce((total, task) => total + correctionWeight(task), 0);
  const returnValues = periodTasks.map((task) => ({ task, value: taskReturnMetric(task) }));
  const populatedReturns = returnValues.filter((entry) => entry.value !== null);
  const zeroReturnTasks = returnValues.filter((entry) => entry.value === 0);

  return {
    member,
    periodTasks,
    plannedTasks,
    correctionTasks,
    efficiency: plannedTasks.length
      ? {
        value: `${percentage(doneOnTime.length, plannedTasks.length)}%`,
        detail: `${doneOnTime.length}/${plannedTasks.length} a tiempo`,
        tone: metricTone(percentage(doneOnTime.length, plannedTasks.length), "high")
      }
      : {
        value: "Sin tareas planeadas",
        detail: "0 tareas con fecha limite",
        tone: "neutral"
      },
    quality: plannedTasks.length
      ? qualityKpi(correctionTasks, weightedCorrections, plannedTasks.length)
      : {
        value: "Sin tareas planeadas",
        detail: "No hay denominador",
        tone: "neutral"
      },
    efficacy: periodTasks.length && populatedReturns.length
      ? {
        value: `${percentage(zeroReturnTasks.length, periodTasks.length)}%`,
        detail: `${zeroReturnTasks.length}/${periodTasks.length} sin devoluciones`,
        tone: metricTone(percentage(zeroReturnTasks.length, periodTasks.length), "high"),
        missing: periodTasks.length - populatedReturns.length
      }
      : {
        value: "No calculable",
        detail: "falta registrar devoluciones/iteraciones",
        tone: "neutral",
        missing: periodTasks.length
      }
  };
}

function qualityKpi(correctionTasks, weightedCorrections, plannedCount) {
  if (!correctionTasks.length) {
    return {
      value: "100%",
      detail: "sin correcciones registradas",
      tone: "good"
    };
  }
  const score = clampPercent(Math.round((1 - (weightedCorrections / (3 * plannedCount))) * 100));
  return {
    value: `${score}%`,
    detail: `${weightedCorrections} puntos de correccion`,
    tone: metricTone(score, "high")
  };
}

function renderKpiTableRow(rowData) {
  const initials = String(rowData.member.name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return `
    <tr>
      <td>
        <div class="kpi-person">
          <div class="avatar">${escapeHtml(initials)}</div>
          <div>
            <strong>${escapeHtml(rowData.member.name || "Sin nombre")}</strong>
            <span>${rowData.periodTasks.length} tarea(s), ${rowData.plannedTasks.length} planeada(s)</span>
          </div>
        </div>
      </td>
      <td>${kpiCell(rowData.efficiency)}</td>
      <td>${kpiCell(rowData.quality)}</td>
      <td>${kpiCell(rowData.efficacy)}</td>
      <td>${kpiAuditDetails(rowData)}</td>
    </tr>
  `;
}

function kpiCell(metric) {
  return `
    <div class="kpi-cell kpi-${escapeHtml(metric.tone || "neutral")}">
      <strong>${escapeHtml(metric.value)}</strong>
      <span>${escapeHtml(metric.detail)}</span>
      ${metric.missing ? `<small>${escapeHtml(metric.missing)} sin dato registrado</small>` : ""}
    </div>
  `;
}

function kpiAuditDetails(rowData) {
  return `
    <details class="kpi-audit">
      <summary>Ver tareas</summary>
      <div class="kpi-audit-grid">
        ${kpiAuditSection("Eficiencia", rowData.plannedTasks.map((task) => ({
          title: task.title || task.id,
          meta: `${catalogLabel("tasks", "status", effectiveCatalogValue("tasks", task, "status")) || "Sin estado"} - vence ${task.dueDate || "sin fecha"} - actualizada ${dateKey(task.updatedAt) || "sin fecha"}`,
          result: isTaskDone(task) && taskDoneOnOrBeforeDueDate(task) ? "Cuenta a tiempo" : "No cuenta a tiempo"
        })))}
        ${kpiAuditSection("Calidad", rowData.correctionTasks.map((task) => ({
          title: task.title || task.id,
          meta: `${catalogLabel("tasks", "kind", task.kind) || "Correccion"} - ${catalogLabel("tasks", "priority", task.priority) || "Media"}`,
          result: `Peso ${correctionWeight(task)}`
        })))}
        ${kpiAuditSection("Eficacia", rowData.periodTasks.map((task) => {
          const value = taskReturnMetric(task);
          return {
            title: task.title || task.id,
            meta: `devoluciones=${metricText(task.devoluciones)} - iterations=${metricText(task.iterations)}`,
            result: value === null ? "Sin dato" : value === 0 ? "Cuenta sin devolucion" : `${value} devolucion(es)`
          };
        }))}
      </div>
    </details>
  `;
}

function kpiAuditSection(title, items) {
  return `
    <section>
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${items.length ? items.map((item) => `
          <li>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.meta)}</span>
            <em>${escapeHtml(item.result)}</em>
          </li>
        `).join("") : `<li><span>Sin tareas usadas en este factor.</span></li>`}
      </ul>
    </section>
  `;
}

function metricText(value) {
  return value === undefined || value === null || value === "" ? "sin dato" : String(value);
}

function isCorrectionTask(task) {
  return isCatalogMatch("tasks", "kind", effectiveCatalogValue("tasks", task, "kind"), ["Correccion", "Correction"]);
}

function correctionWeight(task) {
  const priority = effectiveCatalogValue("tasks", task, "priority");
  const text = normalizeFilterText(`${priority} ${catalogLabel("tasks", "priority", priority)}`);
  if (text.includes("alta") || text.includes("high")) return 3;
  if (text.includes("baja") || text.includes("low")) return 1;
  return 2;
}

function taskDoneOnOrBeforeDueDate(task) {
  const updated = dateKey(task.updatedAt);
  const due = dateKey(task.dueDate);
  return Boolean(updated && due && updated <= due);
}

function taskDueDateIsInPeriod(task, period) {
  return periodFromDate(task.dueDate) === period;
}

function taskIsInKpiPeriod(task, period) {
  return [task.dueDate, task.updatedAt, task.createdAt].some((value) => periodFromDate(value) === period);
}

function availableKpiPeriods(tasks) {
  const periods = new Set([currentKpiPeriod()]);
  tasks.forEach((task) => {
    [task.dueDate, task.createdAt, task.updatedAt].forEach((value) => {
      const period = periodFromDate(value);
      if (period) periods.add(period);
    });
  });
  return [...periods].sort().reverse();
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
  return isCatalogMatch("tasks", "status", effectiveCatalogValue("tasks", task, "status"), ["review", "En revision"]);
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

function metricCard(metric) {
  return `
    <article class="metric indicator-card indicator-${escapeHtml(metric.tone || "neutral")}" title="${escapeHtml(metric.tooltip || "")}" aria-label="${escapeHtml(`${metric.label}. ${metric.detail}. ${metric.tooltip || ""}`)}">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <span>${escapeHtml(metric.detail)}</span>
    </article>
  `;
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

function spHealthItem(sp, allTestCases, allBugs) {
  const spTests = allTestCases.filter((test) => testCaseBelongsToSp(test, sp.id));
  const spBugs = allBugs.filter((bug) => (bug.spMigrationId || findBugSpMigrationId(bug)) === sp.id);
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
  const matrixPct = isMatrixReady(sp) ? 100 : 0;
  const qmetryPct = isQmetryReady(sp) ? 100 : 0;
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
    label: sp.spName || "Sin nombre",
    status: health.label,
    score: health.score,
    successful: spSuccessful,
    failed: spFailed
  };
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
