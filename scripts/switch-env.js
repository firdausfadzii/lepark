#!/usr/bin/env node
/**
 * Environment switcher for Lepark (localhost vs hosting).
 *
 * Updates root .env, client/.env, and server/.env in place while preserving
 * secrets & database settings (DB_*, JWT_SECRET, SMTP_*, SSL_*, etc.).
 *
 * Usage:
 *   node scripts/switch-env.js status
 *   node scripts/switch-env.js local
 *   node scripts/switch-env.js local-https
 *   node scripts/switch-env.js hosting [https://your-domain.com]
 *   node scripts/switch-env.js remote [https://your-domain.com]
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const ROOT_ENV = path.join(ROOT_DIR, ".env");
const CLIENT_ENV = path.join(ROOT_DIR, "client", ".env");
const SERVER_ENV = path.join(ROOT_DIR, "server", ".env");

function readEnvMap(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    map[key] = val;
  }
  return map;
}

function updateEnvFile(filePath, updates) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const seen = new Set();

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = line.indexOf("=");
    if (eq === -1) return line;
    const key = line.slice(0, eq).trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  // Remove trailing empty lines before appending new keys
  while (updatedLines.length > 0 && updatedLines[updatedLines.length - 1] === "") {
    updatedLines.pop();
  }

  for (const [key, val] of Object.entries(updates)) {
    if (!seen.has(key)) {
      updatedLines.push(`${key}=${val}`);
    }
  }

  fs.writeFileSync(filePath, updatedLines.join("\n") + "\n", "utf8");
}

function normalizeUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function printStatus() {
  const rootMap = readEnvMap(ROOT_ENV);
  const clientMap = readEnvMap(CLIENT_ENV);
  const serverMap = readEnvMap(SERVER_ENV);

  const viteServerUrl = clientMap.VITE_SERVER_URL || "";
  const viteHttps = clientMap.VITE_HTTPS === "true";
  const serverHttps = serverMap.SERVER_HTTPS === "true";
  const serverUrl = serverMap.SERVER_URL || rootMap.SERVER_URL || "";
  const clientUrl = serverMap.CLIENT_URL || rootMap.CLIENT_URL || "";
  const hostingUrl = rootMap.HOSTING_URL || "";

  let detectedMode = "custom";
  if (viteServerUrl) {
    detectedMode = `remote (local client -> ${viteServerUrl})`;
  } else if (serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1")) {
    detectedMode = viteHttps || serverHttps ? "local-https (HTTPS localhost)" : "local (HTTP localhost)";
  } else if (serverUrl.startsWith("https://") || serverUrl.startsWith("http://")) {
    detectedMode = `hosting (${serverUrl})`;
  }

  console.log("\n=== Lepark Environment Status ===");
  console.log(`Active mode : ${detectedMode}`);
  console.log(`Hosting URL : ${hostingUrl || "(not set yet)"}`);
  console.log("\nclient/.env:");
  console.log(`  VITE_SERVER_URL = ${viteServerUrl || "(empty -> same-origin proxy)"}`);
  console.log(`  VITE_HTTPS      = ${clientMap.VITE_HTTPS ?? "(unset)"}`);
  console.log("\nserver/.env:");
  console.log(`  SERVER_HTTPS    = ${serverMap.SERVER_HTTPS ?? "(unset)"}`);
  console.log(`  SERVER_URL      = ${serverUrl || "(unset)"}`);
  console.log(`  CLIENT_URL      = ${clientUrl || "(unset)"}`);
  console.log("");
}

function printHelp() {
  console.log(`
Usage:
  npm run env:status                         Show current environment mode
  npm run env:local                          Localhost HTTP (http://localhost:5173, no SSL warnings)
  npm run env:local:https                    Localhost HTTPS (https://localhost:5173, for mic/PWA)
  npm run env:hosting -- https://domain.com  Hosting mode (Nginx terminates HTTPS, same-origin)
  npm run env:remote -- https://domain.com   Local Vite client talking to hosted backend

Tip: Once you pass your hosting URL once, it is saved in .env as HOSTING_URL so
     subsequent "npm run env:hosting" or "npm run env:remote" calls don't need the URL again.
`);
}

const command = (process.argv[2] || "status").toLowerCase();
const urlArg = normalizeUrl(process.argv[3]);

if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "status") {
  printStatus();
  process.exit(0);
}

if (command === "local") {
  updateEnvFile(ROOT_ENV, {
    VITE_SERVER_URL: "",
    VITE_HTTPS: "false",
    SERVER_HTTPS: "false",
    SERVER_URL: "http://localhost:2567",
    CLIENT_URL: "http://localhost:5173",
  });
  updateEnvFile(CLIENT_ENV, {
    VITE_SERVER_URL: "",
    VITE_HTTPS: "false",
  });
  updateEnvFile(SERVER_ENV, {
    SERVER_HTTPS: "false",
    SERVER_URL: "http://localhost:2567",
    CLIENT_URL: "http://localhost:5173",
  });
  console.log("\nSwitched to LOCAL (HTTP) mode.");
  console.log("Restart server & client, then open: http://localhost:5173");
  printStatus();
  process.exit(0);
}

if (command === "local-https" || command === "local:https") {
  updateEnvFile(ROOT_ENV, {
    VITE_SERVER_URL: "",
    VITE_HTTPS: "true",
    SERVER_HTTPS: "true",
    SERVER_URL: "https://localhost:2567",
    CLIENT_URL: "https://localhost:5173",
  });
  updateEnvFile(CLIENT_ENV, {
    VITE_SERVER_URL: "",
    VITE_HTTPS: "true",
  });
  updateEnvFile(SERVER_ENV, {
    SERVER_HTTPS: "true",
    SERVER_URL: "https://localhost:2567",
    CLIENT_URL: "https://localhost:5173",
  });
  console.log("\nSwitched to LOCAL (HTTPS) mode.");
  console.log("Restart server & client, then open: https://localhost:5173");
  console.log("(API & WebSocket requests go through Vite's same-origin proxy — no CORS or port 2567 cert error.)");
  printStatus();
  process.exit(0);
}

if (command === "hosting" || command === "prod") {
  const rootMap = readEnvMap(ROOT_ENV);
  const hostingUrl = urlArg || normalizeUrl(rootMap.HOSTING_URL);
  if (!hostingUrl) {
    console.error("\nPlease provide your hosting URL the first time:");
    console.error("  npm run env:hosting -- https://your-domain.com\n");
    process.exit(1);
  }
  if (!/^https?:\/\//i.test(hostingUrl)) {
    console.error(`\nInvalid URL "${hostingUrl}". Include https:// or http:// (e.g. https://your-domain.com)\n`);
    process.exit(1);
  }

  updateEnvFile(ROOT_ENV, {
    HOSTING_URL: hostingUrl,
    VITE_SERVER_URL: "",
    VITE_HTTPS: "false",
    SERVER_HTTPS: "false",
    SERVER_URL: hostingUrl,
    CLIENT_URL: hostingUrl,
  });
  updateEnvFile(CLIENT_ENV, {
    VITE_SERVER_URL: "",
    VITE_HTTPS: "false",
  });
  updateEnvFile(SERVER_ENV, {
    SERVER_HTTPS: "false",
    SERVER_URL: hostingUrl,
    CLIENT_URL: hostingUrl,
  });
  console.log(`\nSwitched to HOSTING mode (${hostingUrl}).`);
  console.log("Nginx handles HTTPS termination and proxies /api and /colyseus to http://127.0.0.1:2567.");
  printStatus();
  process.exit(0);
}

if (command === "remote") {
  const rootMap = readEnvMap(ROOT_ENV);
  const hostingUrl = urlArg || normalizeUrl(rootMap.HOSTING_URL);
  if (!hostingUrl) {
    console.error("\nPlease provide your hosted backend URL the first time:");
    console.error("  npm run env:remote -- https://your-domain.com\n");
    process.exit(1);
  }
  if (!/^https?:\/\//i.test(hostingUrl)) {
    console.error(`\nInvalid URL "${hostingUrl}". Include https:// or http:// (e.g. https://your-domain.com)\n`);
    process.exit(1);
  }

  updateEnvFile(ROOT_ENV, {
    HOSTING_URL: hostingUrl,
    VITE_SERVER_URL: hostingUrl,
    VITE_HTTPS: "false",
  });
  updateEnvFile(CLIENT_ENV, {
    VITE_SERVER_URL: hostingUrl,
    VITE_HTTPS: "false",
  });
  console.log(`\nSwitched client to REMOTE mode (local Vite client -> ${hostingUrl}).`);
  console.log("Restart client, then open: http://localhost:5173");
  printStatus();
  process.exit(0);
}

console.error(`\nUnknown mode "${command}".`);
printHelp();
process.exit(1);
