const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = "https://project-agents-app-gestor-qa.vercel.app/";
const longName = "EP: @campo_largo debe verse completo sin puntos suspensivos y mantener toda la respuesta para copiar";

function dataPayload() {
  return {
    tasks: [],
    spMigrations: [],
    testCases: [],
    useCases: [],
    bugs: [],
    members: [],
    catalogs: []
  };
}

function sqlRows() {
  return Array.from({ length: 45 }, (_, index) => ({
    id: index === 0 ? "b29fab6c-dcaf-4113-8fd7-7b178117381f" : `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    code: index === 0 ? "TC97" : `TC${index + 100}`,
    name: index === 0 ? `${longName} :: fila principal ${"detalle ".repeat(16)}` : `${longName} :: fila ${index}`,
    expected: `Respuesta esperada completa ${index} ${"sin truncar ".repeat(10)}`,
    status: "Activo",
    owner: "QA",
    severity: index % 2 ? "Media" : "Alta",
    payload: {
      source: "supabase-console-validation",
      index,
      notes: `Objeto JSON completo ${"contenido ".repeat(12)}`
    }
  }));
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl.slice(0, -1) });
  const page = await context.newPage();
  const rows = sqlRows();

  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: { email: "qa.dba@example.com", role: "DBA" } })
  }));
  await page.route("**/api/data", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(dataPayload())
  }));
  await page.route("**/api/sql-console", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ command: "SELECT", rowCount: rows.length, durationMs: 14, rows })
  }));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Configuracion" }).click();
  await page.getByRole("button", { name: "Consola Supabase" }).click();
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await page.locator(".sql-result-table-wrap").waitFor();

  const firstName = await page.locator(".sql-result-table tbody tr:first-child td").nth(2).textContent();
  assert.ok(firstName.includes("detalle detalle detalle"), "La celda larga debe mostrar el texto completo.");
  assert.ok(!firstName.includes("@..."), "La celda larga no debe renderizar la version truncada.");

  const cellStyle = await page.locator(".sql-result-table tbody tr:first-child td").nth(2).evaluate((cell) => {
    const style = getComputedStyle(cell);
    return {
      overflow: style.overflow,
      textOverflow: style.textOverflow,
      whiteSpace: style.whiteSpace
    };
  });
  assert.notEqual(cellStyle.overflow, "hidden", "Las celdas SQL no deben ocultar contenido.");
  assert.notEqual(cellStyle.textOverflow, "ellipsis", "Las celdas SQL no deben usar puntos suspensivos.");

  const scroll = await page.locator(".sql-result-table-wrap").evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX,
    overflowY: getComputedStyle(element).overflowY
  }));
  assert.equal(scroll.overflowX, "scroll", "El contenedor debe exponer scroll horizontal.");
  assert.equal(scroll.overflowY, "scroll", "El contenedor debe exponer scroll vertical.");
  assert.ok(scroll.scrollHeight > scroll.clientHeight, "Debe haber desplazamiento vertical para muchos resultados.");
  assert.ok(scroll.scrollWidth > scroll.clientWidth, "Debe haber desplazamiento horizontal para muchas columnas.");

  await page.getByRole("button", { name: "Copiar resultado" }).click();
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  assert.ok(copiedText.startsWith("id\tcode\tname\texpected\tstatus\towner\tseverity\tpayload"), "El copiado debe incluir encabezados.");
  assert.ok(copiedText.includes("b29fab6c-dcaf-4113-8fd7-7b178117381f\tTC97\tEP: @campo_largo"), "El copiado debe incluir respuestas.");
  assert.ok(copiedText.includes('"source":"supabase-console-validation"'), "El copiado debe incluir JSON completo.");

  await browser.close();
  console.log("SQL console Vercel validation passed.");
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
