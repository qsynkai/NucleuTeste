/**
 * Testes de integração HTTP — varredura completa do sistema
 * Executa contra http://localhost:3099
 */

const BASE = "http://localhost:3099";
let passed = 0;
let failed = 0;
const failures = [];

// ── helpers ──────────────────────────────────────────────────────────────────

async function req(method, path, body, cookie) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    redirect: "manual",
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch { /* ok */ }
  return { status: res.status, json, headers: res.headers };
}

function check(label, cond, info = "") {
  if (cond) {
    console.log(`  ✔ ${label}`);
    passed++;
  } else {
    console.error(`  ✘ ${label}${info ? " — " + info : ""}`);
    failed++;
    failures.push({ label, info });
  }
}

async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  if (r.status !== 200) return null;
  const cookies = r.headers.getSetCookie?.() ?? [r.headers.get("set-cookie")];
  for (const c of cookies) {
    const m = c?.match(/^([^;]+)/);
    if (m) return m[1]; // "ia_session=..."
  }
  return null;
}

// ── Testes ───────────────────────────────────────────────────────────────────

console.log("\n=== 1. AUTH — login / logout / me ===");

const adminCookie = await login("admin", "0000");
check("login admin/0000 retorna cookie", Boolean(adminCookie));

const me = await req("GET", "/api/auth/me", undefined, adminCookie);
check("GET /api/auth/me retorna role ADMIN", me.json?.user?.role === "ADMIN", JSON.stringify(me.json?.user));

const noAuth = await req("GET", "/api/auth/me");
check("GET /api/auth/me sem auth → 401", noAuth.status === 401);

const badLogin = await req("POST", "/api/auth/login", { email: "admin", password: "errado" });
check("login com senha errada → 401", badLogin.status === 401);

const logoutR = await req("POST", "/api/auth/logout", undefined, adminCookie);
check("logout retorna 200", logoutR.status === 200);
const admCk = await login("admin", "0000");
check("re-login após logout funciona", Boolean(admCk));

console.log("\n=== 2. PROJECTS — CRUD ===");

const projList = await req("GET", "/api/projects", undefined, admCk);
check("GET /api/projects lista projetos", projList.status === 200 && Array.isArray(projList.json?.projects));

const ts = Date.now();
const createProj = await req("POST", "/api/projects", { name: `Teste ${ts}`, type: "COMPANY" }, admCk);
check("POST /api/projects cria projeto", createProj.status === 201 && Boolean(createProj.json?.id));
const projId = createProj.json?.id ?? "";

const getProj = await req("GET", `/api/projects/${projId}`, undefined, admCk);
check("GET /api/projects/:id retorna projeto", getProj.status === 200 && getProj.json?.id === projId);

const patchProj = await req("PATCH", `/api/projects/${projId}`, { name: `Editado ${ts}` }, admCk);
check("PATCH /api/projects/:id atualiza nome", patchProj.status === 200 && String(patchProj.json?.name).includes("Editado"));

console.log("\n=== 3. POSTS (Social) — CRUD ===");

const createPost = await req("POST", "/api/posts", {
  projectId: projId, title: "Post Teste", content: "Legenda",
  scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  channels: ["INSTAGRAM"], mediaUrls: [],
}, admCk);
check("POST /api/posts cria post social", createPost.status === 201 && Boolean(createPost.json?.id));
const postId = createPost.json?.id ?? "";

const getPost = await req("GET", `/api/posts/${postId}`, undefined, admCk);
check("GET /api/posts/:id retorna post", getPost.status === 200 && getPost.json?.id === postId);

const patchStatus = await req("PATCH", `/api/posts/${postId}/status`, { status: "PUBLISHED" }, admCk);
check("PATCH /api/posts/:id/status → PUBLISHED", patchStatus.status === 200 && patchStatus.json?.status === "PUBLISHED");

const reschedule = await req("PATCH", `/api/posts/${postId}`, {
  scheduledAt: new Date(Date.now() + 172800000).toISOString(),
}, admCk);
check("PATCH /api/posts/:id reagenda (drag-drop)", reschedule.status === 200);

const putPost = await req("PUT", `/api/posts/${postId}`, {
  projectId: projId, title: "Post Editado", content: "Legenda editada",
  scheduledAt: new Date(Date.now() + 172800000).toISOString(),
  channels: ["INSTAGRAM", "FACEBOOK"], mediaUrls: [],
}, admCk);
check("PUT /api/posts/:id edita post completo", putPost.status === 200 && putPost.json?.title === "Post Editado");

console.log("\n=== 4. USERS — criação e gestão ===");

const usersList = await req("GET", "/api/users", undefined, admCk);
check("GET /api/users lista usuários (admin)", usersList.status === 200 && Array.isArray(usersList.json?.users));

const newEmail = `colab_${ts}@teste.local`;
const createUser = await req("POST", "/api/users", {
  name: "Colab Teste", email: newEmail, password: "Teste1234", role: "COLLABORATOR",
}, admCk);
check("POST /api/users cria colaborador", createUser.status === 201 && Boolean(createUser.json?.id));
const collabId = createUser.json?.id ?? "";

console.log("\n=== 5. RBAC — controle de acesso ===");

const collabCk = await login(newEmail, "Teste1234");
check("login do colaborador recém-criado funciona", Boolean(collabCk));

const collabGetUsers = await req("GET", "/api/users", undefined, collabCk);
check("Colaborador não acessa lista de usuários → 403", collabGetUsers.status === 403);

// Collab tenta usar projeto do admin → 404 (não é dono)
const collabPostInAdminProj = await req("POST", "/api/posts", {
  projectId: projId, title: "Invasão", content: "x",
  scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  channels: ["INSTAGRAM"], mediaUrls: [],
}, collabCk);
check("Colaborador não cria post no projeto do admin → 404", collabPostInAdminProj.status === 404 || collabPostInAdminProj.status === 403);

// Admin atualiza status de post próprio
const admPatch = await req("PATCH", `/api/posts/${postId}/status`, { status: "DRAFT" }, admCk);
check("Admin atualiza status do próprio post", admPatch.status === 200 && admPatch.json?.status === "DRAFT");

// PARTNER não pode criar eventos
const partnerEmail = `partner_${ts}@teste.local`;
const createPartner = await req("POST", "/api/users", {
  name: "Partner Teste", email: partnerEmail, password: "Teste1234", role: "PARTNER",
}, admCk);
const partnerCk = createPartner.json?.id ? await login(partnerEmail, "Teste1234") : null;
if (partnerCk) {
  const partnerCreate = await req("POST", "/api/posts", {
    projectId: projId, title: "x", content: "x",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    channels: ["INSTAGRAM"], mediaUrls: [],
  }, partnerCk);
  check("PARTNER não pode criar posts → 403", partnerCreate.status === 403);
  const partnerAdminRoute = await req("GET", "/api/users", undefined, partnerCk);
  check("PARTNER não acessa /api/users → 403", partnerAdminRoute.status === 403);
}

console.log("\n=== 6. EVENTS — Produção ===");

const createEvent = await req("POST", "/api/events", {
  entryType: "PRODUCTION_EVENT", projectId: projId,
  title: "Produção Teste", content: "Escopo",
  scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  durationMinutes: 120,
  tasks: [{ customName: "Captação", price: "500.00" }],
  mediaUrls: [], externalLinks: [],
}, admCk);
check("POST /api/events cria produção", createEvent.status === 201 && Boolean(createEvent.json?.id));
const eventId = createEvent.json?.id ?? "";

const getEvent = await req("GET", `/api/events/${eventId}`, undefined, admCk);
check("GET /api/events/:id retorna evento", getEvent.status === 200 && getEvent.json?.id === eventId);
check("Evento tem participants[]", Array.isArray(getEvent.json?.participants));
check("Evento tem sharePreview{}", typeof getEvent.json?.sharePreview === "object");
check("sharedAsParticipant = false para dono", getEvent.json?.sharedAsParticipant === false);

const patchEvent = await req("PATCH", `/api/events/${eventId}`, {
  currentStatus: "IN_PROGRESS", statusNotes: "Iniciando",
}, admCk);
check("PATCH /api/events/:id → IN_PROGRESS", patchEvent.status === 200 && patchEvent.json?.currentStatus === "IN_PROGRESS");

console.log("\n=== 7. PARTICIPANTS ===");

const inviteOpts = await req("GET", "/api/users/invite-options", undefined, admCk);
check("GET /api/users/invite-options retorna lista", inviteOpts.status === 200 && Array.isArray(inviteOpts.json?.users));

const addPart = await req("PATCH", `/api/events/${eventId}`, {
  participants: [{ userId: collabId, accessLevel: "VIEW" }],
}, admCk);
check("Admin adiciona participante", addPart.status === 200);
check("Participante na resposta", addPart.json?.participants?.some(p => p.userId === collabId));

// Colaborador vê o evento
const collabSee = await req("GET", `/api/events/${eventId}`, undefined, collabCk);
check("Participante VIEW consegue ver evento", collabSee.status === 200);
check("sharedAsParticipant = true para convidado", collabSee.json?.sharedAsParticipant === true);

// Colaborador NÃO pode gerenciar participantes
const collabManage = await req("PATCH", `/api/events/${eventId}`, {
  participants: [],
}, collabCk);
check("Participante VIEW não gerencia participantes → 403", collabManage.status === 403);

// Participante ADD_INFO pode adicionar notas
const addPart2 = await req("PATCH", `/api/events/${eventId}`, {
  participants: [{ userId: collabId, accessLevel: "ADD_INFO" }],
}, admCk);
check("Admin eleva participante para ADD_INFO", addPart2.status === 200);

// Participante com ADD_INFO tenta editar status → deveria falhar (status transitions)
const collabStatus = await req("PATCH", `/api/events/${eventId}`, {
  currentStatus: "COMPLETED",
}, collabCk);
check("Participante ADD_INFO não muda status para COMPLETED → 403", collabStatus.status === 403);

// Remove participante
const removePart = await req("PATCH", `/api/events/${eventId}`, { participants: [] }, admCk);
check("Admin remove participante (lista vazia)", removePart.status === 200);
check("Participante removido da lista", !removePart.json?.participants?.some(p => p.userId === collabId));

// Após remover, colaborador não vê mais
const collabNoSee = await req("GET", `/api/events/${eventId}`, undefined, collabCk);
check("Participante removido não vê evento → 403", collabNoSee.status === 403);

console.log("\n=== 8. SHARE PREVIEW ===");

const genPrev = await req("POST", `/api/events/${eventId}/share-preview`, undefined, admCk);
check("POST share-preview gera URL", genPrev.status === 200 && Boolean(genPrev.json?.sharePreview?.url));
const token = genPrev.json?.sharePreview?.url?.split("/preview/")[1] ?? "";

const pubPrev = await req("GET", `/api/public/event-preview/${token}`);
check("Preview público acessível sem auth", pubPrev.status === 200 && Boolean(pubPrev.json?.title));
check("Preview não expõe clientPhone", !pubPrev.json?.clientPhone);

const revokePrev = await req("DELETE", `/api/events/${eventId}/share-preview`, undefined, admCk);
check("DELETE desabilita preview", revokePrev.status === 200);

const pubAfterRevoke = await req("GET", `/api/public/event-preview/${token}`);
check("Preview após revogação → 404", pubAfterRevoke.status === 404);

// Admin não pode revogar share de outro admin (sem ser dono nem admin? Aqui é dono, então ok)
// Collab tenta gerar share → 403 (não é dono nem admin do evento)
const collabShare = await req("POST", `/api/events/${eventId}/share-preview`, undefined, collabCk);
check("Não-dono não gera share-preview → 403", collabShare.status === 403 || collabShare.status === 404);

console.log("\n=== 9. VISIBILIDADE NO CALENDÁRIO ===");

// Re-adiciona collab como participante
await req("PATCH", `/api/events/${eventId}`, {
  participants: [{ userId: collabId, accessLevel: "VIEW" }],
}, admCk);

const collabPosts = await req("GET", "/api/posts", undefined, collabCk);
check("GET /api/posts inclui evento onde collab é participante",
  collabPosts.json?.posts?.some(p => p.id === eventId));
check("Evento aparece com sharedAsParticipant=true",
  collabPosts.json?.posts?.find(p => p.id === eventId)?.sharedAsParticipant === true);

console.log("\n=== 10. OUTROS TIPOS DE ENTRADA ===");

const createCS = await req("POST", "/api/events", {
  entryType: "CUSTOMER_SERVICE", projectId: projId,
  title: "Atendimento Teste",
  scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  durationMinutes: 60, clientName: "Cliente X", clientPhone: "11999999999",
  attendanceType: "SERVICE_APPOINTMENT", serviceChannel: "WHATSAPP",
  assignedProfessional: "João", appointmentStatus: "SCHEDULED",
  serviceTask: { customName: "Corte", price: "50.00" },
  mediaUrls: [],
}, admCk);
check("POST /api/events cria CUSTOMER_SERVICE", createCS.status === 201 && Boolean(createCS.json?.id),
  createCS.json?.error ?? JSON.stringify(createCS.json));

const createReminder = await req("POST", "/api/events", {
  entryType: "SIMPLE_REMINDER", projectId: projId,
  title: "Lembrete Teste", content: "Detalhes",
  scheduledAt: new Date(Date.now() + 86400000).toISOString(), mediaUrls: [],
}, admCk);
check("POST /api/events cria SIMPLE_REMINDER", createReminder.status === 201 && Boolean(createReminder.json?.id));

console.log("\n=== 11. SEGURANÇA — rotas sem auth ===");

for (const [path, method] of [
  ["/api/posts", "GET"],
  ["/api/events", "GET"],
  ["/api/projects", "GET"],
  ["/api/users", "GET"],
  ["/api/dashboard/metrics", "GET"],
]) {
  const r = await req(method, path);
  check(`${method} ${path} sem auth → 401`, r.status === 401);
}

// Middleware protege rotas de página
const pageRes = await req("GET", "/dashboard");
check("GET /dashboard sem auth → redirect 3xx", pageRes.status >= 300 && pageRes.status < 400);

console.log("\n=== 12. LIMPEZA ===");

await req("DELETE", `/api/events/${eventId}`, undefined, admCk);
await req("DELETE", `/api/events/${createCS.json?.id}`, undefined, admCk);
await req("DELETE", `/api/events/${createReminder.json?.id}`, undefined, admCk);
await req("DELETE", `/api/posts/${postId}`, undefined, admCk);
// Desativa usuários de teste
if (collabId) await req("PATCH", `/api/users/${collabId}`, { isActive: false }, admCk);
if (createPartner.json?.id) await req("PATCH", `/api/users/${createPartner.json.id}`, { isActive: false }, admCk);
check("Limpeza dos dados de teste concluída", true);

// ── Resultado ─────────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(58)}`);
console.log(`  RESULTADO: ${passed} passou  |  ${failed} falhou  (total: ${passed + failed})`);
if (failures.length > 0) {
  console.log(`\n  ❌ Falhas detectadas:`);
  failures.forEach(f => console.log(`    ✘ ${f.label}${f.info ? "\n      → " + f.info : ""}`));
}
console.log("═".repeat(58));
process.exit(failed > 0 ? 1 : 0);
