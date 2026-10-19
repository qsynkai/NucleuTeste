/**
 * Auditoria HTTP: participantes + preview por link.
 * Uso: node scripts/audit-event-participants.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3000";
const PASS = "SenhaTeste123!";
const ADMIN_PASS = "0000";

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`✔ ${name}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`✘ ${name}: ${detail}`);
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  const body = await res.json();
  return { status: res.status, cookie, body };
}

async function api(method, path, cookie, json) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, data };
}

async function main() {
  const admin = await login("admin", ADMIN_PASS);
  if (admin.status !== 200) {
    fail("login admin", `status ${admin.status}`);
    process.exit(1);
  }
  pass("login admin");

  const collab = await login("colaborador@nucleuomnisagenda.local", PASS);
  if (collab.status !== 200) fail("login colaborador", `status ${collab.status}`);
  else pass("login colaborador");

  const partner = await login("parceiro@nucleuomnisagenda.local", PASS);
  if (partner.status !== 200) fail("login parceiro", `status ${partner.status}`);
  else pass("login parceiro");

  const inviteAdmin = await api("GET", "/api/users/invite-options", admin.cookie);
  if (inviteAdmin.status !== 200 || !inviteAdmin.data?.users?.length) {
    fail("invite-options admin", `status ${inviteAdmin.status}`);
  } else pass("invite-options admin");

  const invitePartner = await api("GET", "/api/users/invite-options", partner.cookie);
  if (invitePartner.status !== 403) {
    fail("invite-options parceiro bloqueado", `status ${invitePartner.status}`);
  } else pass("invite-options parceiro bloqueado");

  const collabUser = inviteAdmin.data.users.find(
    (u) => u.email === "colaborador@nucleuomnisagenda.local",
  );
  if (!collabUser) {
    fail("usuário colaborador na lista", "não encontrado");
    process.exit(1);
  }

  const projects = await api("GET", "/api/projects", admin.cookie);
  const projectId = projects.data?.projects?.[0]?.id;
  if (!projectId) {
    fail("projeto para teste", "nenhum projeto");
    process.exit(1);
  }
  pass("projeto carregado");

  const scheduledAt = new Date(Date.now() + 86400000).toISOString();
  const create = await api("POST", "/api/events", admin.cookie, {
    entryType: "SIMPLE_REMINDER",
    projectId,
    title: `QA participantes ${Date.now()}`,
    content: "nota interna sensível",
    scheduledAt,
    mediaUrls: [],
    participants: [{ userId: collabUser.id, accessLevel: "VIEW" }],
  });

  if (create.status !== 201 || !create.data?.id) {
    fail("criar lembrete com participante", `status ${create.status}`);
    process.exit(1);
  }
  const eventId = create.data.id;
  pass("criar lembrete com participante VIEW");

  if (!create.data.participants?.some((p) => p.userId === collabUser.id)) {
    fail("participante persistido no create", "ausente na resposta");
  } else pass("participante persistido no create");

  const postsCollab = await api("GET", "/api/posts", collab.cookie);
  const visible = postsCollab.data?.posts?.some((p) => p.id === eventId);
  if (!visible) fail("calendário colaborador vê evento convidado", "não listado");
  else pass("calendário colaborador vê evento convidado");

  const getCollab = await api("GET", `/api/events/${eventId}`, collab.cookie);
  if (getCollab.status !== 200) {
    fail("GET evento como participante VIEW", `status ${getCollab.status}`);
  } else pass("GET evento como participante VIEW");

  const patchCollab = await api("PATCH", `/api/events/${eventId}`, collab.cookie, {
    title: "tentativa edição",
  });
  if (patchCollab.status === 200) {
    fail("participante VIEW não edita", "PATCH aceito");
  } else pass("participante VIEW não edita");

  const share = await api("POST", `/api/events/${eventId}/share-preview`, admin.cookie);
  if (share.status !== 200 || !share.data?.sharePreview?.enabled) {
    fail("ativar link preview", `status ${share.status}`);
  } else pass("ativar link preview");

  const token = share.data.sharePreview.url?.split("/preview/")[1];
  if (!token) {
    fail("token preview", "ausente");
  } else {
    const pub = await api("GET", `/api/public/event-preview/${token}`);
    if (pub.status !== 200) fail("API preview pública", `status ${pub.status}`);
    else pass("API preview pública");
    const raw = JSON.stringify(pub.data);
    if (raw.includes("nota interna") || raw.includes("clientPhone")) {
      fail("preview sem dados sensíveis", "vazou conteúdo");
    } else pass("preview sem dados sensíveis");

    const page = await fetch(`${BASE}/preview/${token}`);
    if (!page.ok) fail("página /preview", `status ${page.status}`);
    else pass("página /preview");
  }

  const revoke = await api("DELETE", `/api/events/${eventId}/share-preview`, admin.cookie);
  if (revoke.status !== 200 || revoke.data?.sharePreview?.enabled) {
    fail("revogar preview", `status ${revoke.status}`);
  } else pass("revogar preview");

  await api("DELETE", `/api/events/${eventId}`, admin.cookie);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
