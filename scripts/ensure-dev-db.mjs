import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function lsOutput() {
  return execSync("npx prisma dev ls", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

let output = lsOutput();
const DEV_SERVER = "nucleu-omnis-agenda";

try {
  execSync("npx prisma dev stop isaias-agenda", {
    cwd: root,
    stdio: "ignore",
  });
} catch {
  // servidor legado opcional
}

if (!new RegExp(`${DEV_SERVER}\\s+running`, "i").test(output)) {
  execSync(`npx prisma dev -d -n ${DEV_SERVER}`, {
    cwd: root,
    stdio: "inherit",
  });
  execSync("node scripts/sync-prisma-dev-env.mjs", {
    cwd: root,
    stdio: "inherit",
  });
  execSync("node scripts/ensure-local-db.mjs", {
    cwd: root,
    stdio: "inherit",
  });
  output = lsOutput();
}

if (!new RegExp(`${DEV_SERVER}\\s+running`, "i").test(output)) {
  console.error(
    "PostgreSQL local (Prisma Dev) não iniciou. Rode manualmente: npm run db:dev:up",
  );
  process.exit(1);
}
