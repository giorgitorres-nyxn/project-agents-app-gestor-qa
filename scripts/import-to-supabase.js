const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const stores = ["members", "useCases", "testCases", "bugs", "tasks", "spMigrations", "catalogs"];

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Uso: npm run import:supabase -- ruta/al/export.json");
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  }

  const absolutePath = path.resolve(inputPath);
  const data = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  for (const store of stores) {
    const records = Array.isArray(data[store]) ? data[store] : [];
    if (!records.length) {
      console.log(`${store}: 0 registros`);
      continue;
    }

    const rows = records.map((record) => {
      if (!record.id) throw new Error(`Registro sin id en ${store}`);
      return {
        id: record.id,
        payload: record,
        created_at: record.createdAt || new Date().toISOString(),
        updated_at: record.updatedAt || new Date().toISOString()
      };
    });

    const { error } = await supabase.from(store).upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`${store}: ${error.message}`);
    console.log(`${store}: ${records.length} registros importados`);
  }

  console.log("Importacion completada.");
}
