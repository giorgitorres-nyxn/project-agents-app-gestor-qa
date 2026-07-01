const { stores } = require("../../src/domain/projectConfig");
const { supabase } = require("./supabaseClient");

async function getAllData() {
  const entries = await Promise.all(stores.map(async (store) => [store, await listRecords(store)]));
  return Object.fromEntries(entries);
}

async function listRecords(store) {
  const { data, error } = await supabase()
    .from(store)
    .select("id,payload,created_at,updated_at")
    .order("created_at", { ascending: true });
  if (error && store === "catalogs" && isMissingTableError(error)) return [];
  if (error) throw error;
  return data.map(rowToRecord);
}

async function getRecord(store, recordId) {
  const { data, error } = await supabase()
    .from(store)
    .select("id,payload,created_at,updated_at")
    .eq("id", recordId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data) : null;
}

async function saveRecord(store, record, recordId = null) {
  const row = { payload: record };
  if (recordId) row.id = recordId;

  const query = recordId
    ? supabase().from(store).upsert({ ...row, id: recordId })
    : supabase().from(store).insert(row);

  const { data, error } = await query.select("id,payload,created_at,updated_at").single();
  if (error && store === "catalogs" && isMissingTableError(error)) {
    throw new Error("Falta ejecutar la migracion de Supabase para crear la tabla catalogs.");
  }
  if (error) throw error;
  return rowToRecord(data);
}

async function deleteRecord(store, recordId) {
  const { error } = await supabase().from(store).delete().eq("id", recordId);
  if (error) throw error;
}

function isMissingTableError(error) {
  return (
    ["42P01", "PGRST205"].includes(error?.code) ||
    /relation .* does not exist/i.test(error?.message || "") ||
    /could not find .* table .*catalogs/i.test(error?.message || "")
  );
}

function rowToRecord(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    createdAt: row.payload?.createdAt || row.created_at,
    updatedAt: row.payload?.updatedAt || row.updated_at
  };
}

module.exports = {
  deleteRecord,
  getAllData,
  getRecord,
  listRecords,
  saveRecord
};
