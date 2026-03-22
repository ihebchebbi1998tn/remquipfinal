/**
 * Prefix all REMQUIP MySQL table names with remquip_ in schema + Backend PHP.
 * Run once from repo root: node scripts/apply-remquip-table-prefix.mjs
 * Do not run again — it would produce remquip_remquip_* names.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const TABLES = [
  "user_page_access",
  "product_images",
  "product_variants",
  "inventory_logs",
  "customer_notes",
  "customer_documents",
  "order_items",
  "order_notes",
  "cms_pages",
  "audit_logs",
  "file_uploads",
  "admin_contacts",
  "categories",
  "customers",
  "inventory",
  "discounts",
  "products",
  "settings",
  "analytics",
  "banners",
  "orders",
  "pages",
  "users",
].sort((a, b) => b.length - a.length);

const PREFIX = "remquip_";

function prefixTableInPhp(php) {
  let s = php;
  for (const t of TABLES) {
    const full = PREFIX + t;
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`\\bFROM ${esc}\\b`, "g"), `FROM ${full}`);
    s = s.replace(new RegExp(`\\bJOIN ${esc}\\b`, "g"), `JOIN ${full}`);
    s = s.replace(new RegExp(`\\bINTO ${esc}\\b`, "g"), `INTO ${full}`);
    s = s.replace(new RegExp(`\\bUPDATE ${esc}\\b`, "g"), `UPDATE ${full}`);
    s = s.replace(new RegExp(`DELETE FROM ${esc}\\b`, "g"), `DELETE FROM ${full}`);
    s = s.replace(new RegExp(`REFERENCES ${esc}\\(`, "g"), `REFERENCES ${full}(`);
  }
  return s;
}

function prefixSchema(sql) {
  let s = prefixTableInPhp(sql);
  for (const t of TABLES) {
    const full = PREFIX + t;
    s = s.split(`CREATE TABLE IF NOT EXISTS ${t} `).join(`CREATE TABLE IF NOT EXISTS ${full} `);
  }
  return s;
}

const schemaPath = path.join(root, "database", "remquip_full_schema.sql");
fs.writeFileSync(schemaPath, prefixSchema(fs.readFileSync(schemaPath, "utf8")));
console.log("Updated:", schemaPath);

function walkDir(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkDir(full, acc);
    else if (name.endsWith(".php")) acc.push(full);
  }
  return acc;
}

for (const file of walkDir(path.join(root, "Backend"))) {
  const c = fs.readFileSync(file, "utf8");
  const next = prefixTableInPhp(c);
  if (next !== c) {
    fs.writeFileSync(file, next);
    console.log("Updated:", path.relative(root, file));
  }
}

console.log("Done.");
