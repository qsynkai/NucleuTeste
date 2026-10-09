import bcrypt from "bcryptjs";
import { writeFileSync } from "node:fs";
import {
  PREVIEW_PROJECTS,
  buildPreviewPosts,
} from "../prisma/seed-preview-data.js";

const hash = await bcrypt.hash("SenhaTeste123!", 12);
const userId = "seed_user_nucleu_omnis";
const esc = (value) => String(value).replaceAll("'", "''");

function at(days, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

const ids = {};
const projectLines = [];
for (const project of PREVIEW_PROJECTS) {
  const id = `prj_${project.key}`;
  ids[project.key] = id;
  projectLines.push(
    `INSERT INTO "Project" ("id","name","slug","type","avatarUrl","description","accentColor","isActive","ownerId","createdAt","updatedAt") VALUES ('${id}','${esc(project.name)}','${project.slug}','${project.type}','${project.avatarUrl}','${esc(project.description)}','${project.accentColor}',true,'${userId}',NOW(),NOW());`,
  );
}

const posts = buildPreviewPosts(at);
const postLines = [];
posts.forEach((post, index) => {
  const id = `pst_${String(index + 1).padStart(2, "0")}`;
  const scheduledValue =
    post.scheduledAt instanceof Date
      ? post.scheduledAt
      : post.scheduledAt
        ? new Date(post.scheduledAt)
        : null;
  const scheduled = scheduledValue
    ? `'${scheduledValue.toISOString()}'`
    : "NULL";
  const media = post.mediaUrls.map((url) => `'${url}'`).join(",");
  postLines.push(
    `INSERT INTO "Post" ("id","title","content","scheduledAt","status","userId","projectId","mediaUrls","createdAt","updatedAt") VALUES ('${id}','${esc(post.title)}','${esc(post.content)}',${scheduled},'${post.status}','${userId}','${ids[post.project]}',ARRAY[${media}]::text[],NOW(),NOW());`,
  );
  post.channels.forEach((channel, channelIndex) => {
    postLines.push(
      `INSERT INTO "PostChannel" ("id","postId","channel","createdAt") VALUES ('pch_${id}_${channelIndex + 1}','${id}','${channel}',NOW());`,
    );
  });
});

const sql = `
DELETE FROM "PostChannel";
DELETE FROM "Post";
DELETE FROM "Project";
DELETE FROM "User" WHERE "email" = 'teste@nucleuomnisagenda.local';
INSERT INTO "User" ("id","name","email","passwordHash","createdAt","updatedAt")
VALUES ('${userId}','Usuário Preview','teste@nucleuomnisagenda.local','${hash}',NOW(),NOW());
${projectLines.join("\n")}
${postLines.join("\n")}
`;

writeFileSync("scripts/preview-seed.sql", sql, "utf8");
console.log(`sql bytes ${sql.length}`);
