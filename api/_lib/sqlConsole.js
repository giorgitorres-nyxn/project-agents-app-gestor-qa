const { supabase } = require("./supabaseClient");

function canUseSqlConsole(user) {
  return /\b(admin|dba|lead)\b/i.test(String(user?.role || ""));
}

async function runSqlConsole(query) {
  const startedAt = Date.now();
  const { data, error } = await supabase().rpc("run_sql_console", { query_text: query });
  if (error) {
    if (isMissingSqlConsoleFunction(error)) {
      throw new Error("Falta aplicar la funcion public.run_sql_console desde supabase/schema.sql.");
    }
    throw error;
  }

  return {
    ...(data || {}),
    durationMs: Date.now() - startedAt
  };
}

function isMissingSqlConsoleFunction(error) {
  return (
    ["42883", "PGRST202"].includes(error?.code) ||
    /run_sql_console/i.test(error?.message || "")
  );
}

module.exports = {
  canUseSqlConsole,
  runSqlConsole
};
