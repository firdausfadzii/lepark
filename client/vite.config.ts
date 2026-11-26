import { defineConfig, loadEnv } from "vite";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const certsDir = path.resolve(__dirname, "certs");
const certPath = path.join(certsDir, "cert.pem");
const keyPath = path.join(certsDir, "key.pem");

function getHttpsConfig(enabled: boolean, customCert?: string, customKey?: string) {
  if (!enabled) {
    return undefined;
  }
  // 1. Check custom cert/key paths
  if (customCert && customKey && fs.existsSync(customCert) && fs.existsSync(customKey)) {
    try {
      return {
        key: fs.readFileSync(customKey),
        cert: fs.readFileSync(customCert),
      };
    } catch (err) {
      console.warn("Could not read custom SSL certificates:", err);
    }
  }

  // 2. Check candidate cert paths
  const candidateDirs = [
    path.resolve(__dirname, "../certs"),
    certsDir,
  ];

  for (const dir of candidateDirs) {
    const k = path.join(dir, "key.pem");
    const c = path.join(dir, "cert.pem");
    if (fs.existsSync(k) && fs.existsSync(c)) {
      try {
        return {
          key: fs.readFileSync(k),
          cert: fs.readFileSync(c),
        };
      } catch (err) {
        console.warn(`Could not read SSL certificates from ${dir}:`, err);
      }
    }
  }

  // 3. Fallback: generate self-signed cert for localhost
  try {
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" -keyout "${keyPath}" -out "${certPath}" -days 3650`,
      { stdio: "ignore" },
    );
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
  } catch (err) {
    console.warn("Could not generate/read SSL certificates for HTTPS:", err);
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, ".");
  const rootEnvDir = path.resolve(__dirname, "..");
  const serverEnvDir = path.resolve(__dirname, "../server");

  const env = loadEnv(mode, envDir, "");
  const rootEnv = loadEnv(mode, rootEnvDir, "");
  const serverEnv = loadEnv(mode, serverEnvDir, "");

  const serverUrl =
    typeof env.VITE_SERVER_URL === "string"
      ? env.VITE_SERVER_URL
      : typeof process.env.VITE_SERVER_URL === "string"
        ? process.env.VITE_SERVER_URL
        : "";

  const enableHttps =
    env.VITE_HTTPS === "true" ||
    process.env.VITE_HTTPS === "true" ||
    env.HTTPS === "true" ||
    process.env.HTTPS === "true";

  const customCert = env.SSL_CERT_PATH || process.env.SSL_CERT_PATH;
  const customKey = env.SSL_KEY_PATH || process.env.SSL_KEY_PATH;

  // Determine backend protocol matching server/src/index.ts shouldEnableHttps() precedence:
  // process.env -> server/.env -> root .env -> client/.env
  const serverHttpsFlag =
    process.env.SERVER_HTTPS ??
    serverEnv.SERVER_HTTPS ??
    rootEnv.SERVER_HTTPS ??
    env.SERVER_HTTPS;
  const serverPort = process.env.PORT || serverEnv.PORT || rootEnv.PORT || "2567";
  const serverBackendUrl =
    process.env.SERVER_URL || serverEnv.SERVER_URL || rootEnv.SERVER_URL || "";

  let backendIsHttps = false;
  if (serverHttpsFlag === "false") {
    backendIsHttps = false;
  } else if (serverHttpsFlag === "true") {
    backendIsHttps = true;
  } else if (serverBackendUrl.startsWith("https://")) {
    backendIsHttps = true;
  } else if (serverUrl.startsWith("https://")) {
    backendIsHttps = true;
  }

  const proxyTarget =
    process.env.VITE_PROXY_TARGET ||
    env.VITE_PROXY_TARGET ||
    (backendIsHttps ? `https://localhost:${serverPort}` : `http://localhost:${serverPort}`);

  const proxyConfig = {
    "/api": {
      target: proxyTarget,
      changeOrigin: true,
      secure: false,
    },
    "/health": {
      target: proxyTarget,
      changeOrigin: true,
      secure: false,
    },
    "/matchmake": {
      target: proxyTarget,
      changeOrigin: true,
      secure: false,
    },
    "/colyseus": {
      target: proxyTarget,
      changeOrigin: true,
      ws: true,
      secure: false,
      rewrite: (p: string) => p.replace(/^\/colyseus/, ""),
    },
  };

  return {
    envDir,
    define: {
      "import.meta.env.VITE_SERVER_URL": JSON.stringify(serverUrl),
    },
    resolve: {
      alias: {
        shared: path.resolve(__dirname, "../shared/src/index.ts"),
      },
    },
    server: {
      port: 5173,
      host: true,
      https: getHttpsConfig(enableHttps, customCert, customKey),
      allowedHosts: true,
      cors: true,
      headers: {
        "Permissions-Policy":
          "compute-pressure=*, encrypted-media=*, autoplay=*, camera=*, microphone=*",
      },
      proxy: proxyConfig,
    },
    preview: {
      port: 5173,
      host: true,
      https: getHttpsConfig(enableHttps, customCert, customKey),
      proxy: proxyConfig,
    },
    build: {
      target: "esnext",
    },
  };
});

