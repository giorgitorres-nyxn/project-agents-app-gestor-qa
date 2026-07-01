// Operational indicators view and scoring helpers.

function renderIndicators() {
  const container = $("#indicators-content");
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
  const activeTasks = tasks.filter((task) => task.status !== "done");
  const activeBugs = bugs.filter((bug) => !["Resuelto", "Cerrado"].includes(bug.status));
  const executedTests = testCases.filter((test) => hasExecutionResult(test)).length;
  const successfulTests = testCases.filter((test) => effectiveFieldValue("testCases", test, "executionStatus") === "Exitoso").length;
  const failedTests = testCases.filter((test) => effectiveFieldValue("testCases", test, "executionStatus") === "Fallido").length;
  const pendingExecutionTests = testCases.length - executedTests;
  const bankApprovedTests = testCases.filter((test) => effectiveFieldValue("testCases", test, "bankApproval") === "Aprobado").length;
  const bankRejectedTests = testCases.filter((test) => effectiveFieldValue("testCases", test, "bankApproval") === "No Aprobado").length;
  const bankPendingTests = testCases.length - bankApprovedTests - bankRejectedTests;
  const blockedTests = testCases.filter((test) => test.status === "Bloqueado").length;
  const highPriorityActiveBugs = activeBugs.filter((bug) => ["Critica", "Alta"].includes(bug.severity)).length;
  const completedSp = spMigrations.filter((sp) => sp.status === "Finalizado").length;
  const qmetryReady = spMigrations.filter((sp) => sp.qmetryEvidenceReady || sp.status === "Evidencia QMetry").length;
  const matrixReady = spMigrations.filter((sp) => sp.equivalenceMatrixReady || ["Matriz lista", "Evidencia QMetry", "En revision por banco", "Finalizado"].includes(sp.status)).length;
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
    const memberSp = spMigrations.filter((sp) => sp.qaId === member.id && sp.status !== "Finalizado");
    const capacity = Number(member.capacity || 0);
    const riskScore = operationalRiskScore({
      activeTasks: memberTasks.length,
      reviewTasks: memberTasks.filter((task) => task.status === "review").length,
      activeBugs: memberBugs.length,
      activeSp: memberSp.length,
      capacity
    });
    return {
      ...member,
      activeTasks: memberTasks.length,
      reviewTasks: memberTasks.filter((task) => task.status === "review").length,
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
    indicatorMetric("Casos ejecutados", `${percentage(executedTests, testCases.length)}%`, `${executedTests} de ${testCases.length} con resultado`, metricTone(percentage(executedTests, testCases.length), "high"), "Mide avance real de ejecucion. Formula: TC con ejecucion Exitoso o Fallido / total de TC."),
    indicatorMetric("TC aprobados banco", `${percentage(bankApprovedTests, testCases.length)}%`, `${bankApprovedTests} de ${testCases.length} aprobados`, metricTone(percentage(bankApprovedTests, testCases.length), "high"), "Mide aceptacion del banco. Formula: TC con Aprobado Banco = Aprobado / total de TC."),
    indicatorMetric("Calidad entrega", `${successRateExecuted}%`, `${failedRateExecuted}% fallidos sobre ejecutados`, metricTone(successRateExecuted, "high"), "Mide calidad solo sobre lo ejecutado. Formula: TC Exitosos / TC ejecutados."),
    indicatorMetric("Sin ejecutar", `${percentage(pendingExecutionTests, testCases.length)}%`, `${pendingExecutionTests} de ${testCases.length} pendientes`, metricTone(percentage(pendingExecutionTests, testCases.length), "low"), "Mide deuda de ejecucion. Formula: TC sin resultado de ejecucion / total de TC."),
    indicatorMetric("Densidad defectos", defectDensity, "errores por 100 TC ejecutados", metricTone(defectDensity, "low", { good: 10, warning: 25 }), "Mide concentracion de errores. Formula: errores registrados / TC ejecutados * 100."),
    indicatorMetric("Tasa bloqueo", `${blockRate}%`, `${blockedTests} de ${testCases.length} casos bloqueados`, metricTone(blockRate, "low"), "Mide bloqueo de pruebas. Formula: TC con estado Bloqueado / total de TC."),
    indicatorMetric("Preparacion banco", `${bankReadiness}%`, `${matrixReady} matriz, ${qmetryReady} QMetry`, metricTone(bankReadiness, "high"), "Score ponderado. Formula: ejecucion 25% + aprobacion banco 35% + matriz 20% + QMetry 20% - penalizacion por errores altos y bloqueos."),
    indicatorMetric("Salud SP", health.label, `${health.score}% de salud operativa`, metricTone(health.score, "high"), "Semaforo operativo. Formula: preparacion banco - penalizacion por fallidos, bloqueos y errores activos de severidad Critica/Alta."),
    indicatorMetric("SP finalizados", `${percentage(completedSp, spMigrations.length)}%`, `${completedSp} de ${spMigrations.length} cerrados`, metricTone(percentage(completedSp, spMigrations.length), "high"), "Mide cierre de alcance. Formula: SP con estado Finalizado / total de SP."),
    indicatorMetric("Errores activos", activeBugs.length, `${highPriorityActiveBugs} de alta prioridad`, metricTone(activeBugs.length, "lowCount", { good: 0, warning: 5 }), "Errores abiertos para seguimiento. Formula: errores cuyo estado no es Resuelto ni Cerrado."),
    indicatorMetric("QMetry listo", qmetryReady, selectedSpId ? "para el SP elegido" : "evidencia o etapa QMetry", metricTone(percentage(qmetryReady, spMigrations.length), "high"), "Mide evidencia lista. Formula: SP con evidencia QMetry marcada o estado Evidencia QMetry."),
    indicatorMetric("Riesgo QA", riskiestMember ? riskiestMember.riskScore : 0, riskiestMember ? riskiestMember.name : "sin asignaciones", metricTone(riskiestMember?.riskScore || 0, "low", { good: 25, warning: 50 }), "Mide carga operativa por QA. Formula: SP activos*12 + errores activos*8 + tareas en revision*4 + tareas activas*3 + carga/5."),
    indicatorMetric("Carga promedio", `${averageCapacity}%`, `${allMembers.length} miembro(s) QA`, metricTone(averageCapacity, "balanced"), "Promedio de carga declarada del equipo. Formula: suma de carga de miembros QA / numero de miembros.")
  ];

  container.innerHTML = `
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
      ${detailBreakdown("Ejecucion de casos", [
        { label: "Exitosos", value: successfulTests, tone: "good", tooltip: "Formula: TC con Ejecucion = Exitoso / total de TC." },
        { label: "Fallidos", value: failedTests, tone: "danger", tooltip: "Formula: TC con Ejecucion = Fallido / total de TC." },
        { label: "Sin ejecutar", value: pendingExecutionTests, tone: "warning", tooltip: "Formula: TC sin resultado de ejecucion / total de TC." }
      ], testCases.length)}
      ${detailBreakdown("Aprobacion banco", [
        { label: "Aprobados", value: bankApprovedTests, tone: "good", tooltip: "Formula: TC con Aprobado Banco = Aprobado / total de TC." },
        { label: "No aprobados", value: bankRejectedTests, tone: "danger", tooltip: "Formula: TC con Aprobado Banco = No Aprobado / total de TC." },
        { label: "Sin decision", value: bankPendingTests, tone: "warning", tooltip: "Formula: TC sin valor de aprobacion banco / total de TC." }
      ], testCases.length)}
      ${detailBreakdown("Errores por estado", catalogValues("bugs", "status").map((status) => ({
        label: catalogLabel("bugs", "status", status),
        value: bugs.filter((bug) => bug.status === status).length,
        tone: ["Resuelto", "Cerrado"].includes(status) ? "good" : "danger",
        tooltip: `Formula: errores con estado ${catalogLabel("bugs", "status", status)} / total de errores.`
      })), bugs.length)}
      ${detailBreakdown("Casos por estado", catalogValues("testCases", "status").map((status) => ({
        label: catalogLabel("testCases", "status", status),
        value: testCases.filter((test) => test.status === status).length,
        tone: status === "Ejecutado" ? "good" : status === "Bloqueado" ? "danger" : "neutral",
        tooltip: `Formula: TC con estado ${catalogLabel("testCases", "status", status)} / total de TC.`
      })), testCases.length)}
      ${detailBreakdown("Calidad sobre ejecutados", [
        { label: "Exitosos", value: successfulTests, tone: "good", tooltip: "Formula: TC con Ejecucion = Exitoso / TC ejecutados." },
        { label: "Fallidos", value: failedTests, tone: "danger", tooltip: "Formula: TC con Ejecucion = Fallido / TC ejecutados." }
      ], executedTests)}
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
            value: activeBugs.filter((bug) => bug.severity === severity).length
          })))}
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

  container.querySelector("#indicator-sp-filter")?.addEventListener("change", (event) => {
    state.indicatorsSpMigrationId = event.target.value;
    renderIndicators();
  });
}

function hasExecutionResult(testCase) {
  return ["Exitoso", "Fallido"].includes(effectiveFieldValue("testCases", testCase, "executionStatus"));
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
  const spActiveBugs = spBugs.filter((bug) => !["Resuelto", "Cerrado"].includes(bug.status));
  const spExecuted = spTests.filter((test) => hasExecutionResult(test)).length;
  const spSuccessful = spTests.filter((test) => test.executionStatus === "Exitoso").length;
  const spFailed = spTests.filter((test) => test.executionStatus === "Fallido").length;
  const spApproved = spTests.filter((test) => test.bankApproval === "Aprobado").length;
  const spBlocked = spTests.filter((test) => test.status === "Bloqueado").length;
  const spHighPriorityBugs = spActiveBugs.filter((bug) => ["Critica", "Alta"].includes(bug.severity)).length;
  const matrixPct = sp.equivalenceMatrixReady || ["Matriz lista", "Evidencia QMetry", "En revision por banco", "Finalizado"].includes(sp.status) ? 100 : 0;
  const qmetryPct = sp.qmetryEvidenceReady || sp.status === "Evidencia QMetry" || sp.status === "Finalizado" ? 100 : 0;
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
