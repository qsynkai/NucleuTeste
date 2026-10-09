import pg from "pg";
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const direct = env.match(/^DIRECT_URL="([^"]+)"/m)?.[1];
if (!direct) {
  console.error("DIRECT_URL ausente");
  process.exit(1);
}

const client = new pg.Client({ connectionString: direct });
await client.connect();
const users = await client.query('SELECT COUNT(*)::int AS n FROM "User"');
const posts = await client.query('SELECT COUNT(*)::int AS n FROM "Post"');
console.log(JSON.stringify({ users: users.rows[0].n, posts: posts.rows[0].n }));
await client.end();
