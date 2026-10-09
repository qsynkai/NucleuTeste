import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

const output = execSync("npx prisma dev ls", {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const DEV_SERVER = "nucleu-omnis-agenda";
const blockMatch = output.match(
  new RegExp(
    `${DEV_SERVER}[\\s\\S]*?postgres(?:ql)?:\\/\\/postgres:postgres@(?:127\\.0\\.0\\.1|localhost):(\\d+)\\/`,
    "i",
  ),
);
if (!blockMatch) {
  console.error(
    `Não encontrei URL TCP do servidor \`${DEV_SERVER}\`. Rode: npx prisma dev -d -n ${DEV_SERVER}`,
  );
  process.exit(1);
}

const port = blockMatch[1];
const directUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/nucleu_omnis_agenda?schema=public&sslmode=disable`;
// O Postgres embutido (PGlite) aceita poucas conexões simultâneas; com
// connection_limit=1 o Prisma enfileira as consultas em vez de abrir várias.
const databaseUrl = `${directUrl}&pgbouncer=true&connection_limit=1`;

let envText = readFileSync(envPath, "utf8");
const setLine = (key, value) => {
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  envText = re.test(envText)
    ? envText.replace(re, line)
    : `${envText.trimEnd()}\n${line}\n`;
};

setLine("DATABASE_URL", databaseUrl);
setLine("DIRECT_URL", directUrl);
writeFileSync(envPath, envText, "utf8");

console.log(`Atualizado .env (PostgreSQL Prisma Dev na porta ${port}).`);
