import pg from "pg";

const connectionString =
  process.env.PG_ADMIN_URL ??
  process.env.DIRECT_URL?.replace(/\/nucleu_omnis_agenda.*/, "/template1") ??
  "postgres://postgres:postgres@127.0.0.1:51218/template1?sslmode=disable";

const dbName = process.env.PG_DATABASE ?? "nucleu_omnis_agenda";

async function connectWithRetry(maxAttempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  throw lastError;
}

const client = await connectWithRetry();
const existing = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  [dbName],
);
if (existing.rowCount === 0) {
  await client.query(`CREATE DATABASE ${dbName}`);
  console.log(`Created database ${dbName}`);
} else {
  console.log(`Database ${dbName} already exists`);
}
await client.end();
