const crypto = require("crypto");
const { parseCookies } = require("./http");
const { listRecords } = require("./recordsRepository");

const defaultPassword = "BbQAGestor";
const sessionCookie = "qa_session";
const sessionTtlSeconds = 8 * 60 * 60;

async function currentUser(req) {
  const token = parseCookies(req.headers.cookie || "")[sessionCookie];
  const email = verifySession(token || "");
  return email ? userFromEmail(email) : null;
}

async function userFromEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  const members = await listRecords("members");
  const member = members.find((item) => String(item.email || "").trim().toLowerCase() === normalizedEmail);
  if (!member) return null;
  return {
    id: member.id || "",
    name: member.name || "",
    email: member.email || "",
    role: member.role || ""
  };
}

function signSession(email) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlSeconds;
  const payload = `${String(email).trim().toLowerCase()}|${expiresAt}`;
  const signature = crypto.createHmac("sha256", defaultPassword).update(payload).digest("hex");
  return Buffer.from(`${payload}|${signature}`, "utf8").toString("base64url");
}

function verifySession(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [email, expiresAt, signature] = parts;
    if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return null;
    const payload = `${email}|${expiresAt}`;
    const expected = crypto.createHmac("sha256", defaultPassword).update(payload).digest("hex");
    const signatureBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    if (signatureBytes.length !== expectedBytes.length) return null;
    return crypto.timingSafeEqual(signatureBytes, expectedBytes) ? email : null;
  } catch {
    return null;
  }
}

function cookieHeader(token) {
  return `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionTtlSeconds}`;
}

function clearCookieHeader() {
  return `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

module.exports = {
  clearCookieHeader,
  cookieHeader,
  currentUser,
  defaultPassword,
  signSession,
  userFromEmail
};
