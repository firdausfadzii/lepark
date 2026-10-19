import { defineConfig } from "vite";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const certsDir = path.resolve(__dirname, "certs");
const certPath = path.join(certsDir, "cert.pem");
const keyPath = path.join(certsDir, "key.pem");

function getHttpsConfig() {
  if (process.env.VITE_HTTPS === "false") {
    return undefined;
  }
  try {
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
      }
      execSync(
        `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=lepark" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" -keyout "${keyPath}" -out "${certPath}" -days 3650`,
        { stdio: "ignore" }
      );
    }
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

export default defineConfig({
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    host: true,
    https: getHttpsConfig(),
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:2567",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:2567",
        changeOrigin: true,
      },
      "/matchmake": {
        target: "http://localhost:2567",
        changeOrigin: true,
      },
      "/colyseus": {
        target: "http://localhost:2567",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/colyseus/, ""),
      },
    },
  },
  build: {
    target: "esnext",
  },
});

