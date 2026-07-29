import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function spawnLongRunning(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    ...options,
  });

  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });

  return child;
}

function runQuiet(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} failed`));
    });
  });
}

async function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });
  });
}

async function waitForPort(host, port, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(host, port)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${host}:${port}`);
}

async function waitForHealthyContainer(timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const status = await runQuiet("docker", [
        "inspect",
        "--format",
        "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
        "courtly-postgres",
      ]);

      if (status === "healthy" || status === "running") {
        return;
      }
    } catch (_error) {
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for the Postgres container health check");
}

async function startDatabase() {
  try {
    await run("docker", ["compose", "up", "-d", "db"]);
    return;
  } catch (error) {
    if (!String(error.message).includes("docker compose")) {
      throw error;
    }
  }

  await run("docker-compose", ["up", "-d", "db"]);
}

async function main() {
  console.info("Starting local Postgres container...");
  await startDatabase();

  console.info("Waiting for Postgres container health check...");
  await waitForHealthyContainer(30000);

  console.info("Waiting for Postgres on localhost:5432...");
  await waitForPort("127.0.0.1", 5432, 30000);

  console.info("Preparing Prisma schema and seed data...");
  await run("npm", ["run", "db:prepare", "--workspace", "backend"]);

  console.info("Starting backend server...");
  const backend = spawnLongRunning("npm", ["run", "dev", "--workspace", "backend"]);

  console.info("Starting frontend dev server...");
  try {
    await run("npm", ["run", "dev", "--workspace", "frontend"]);
  } finally {
    backend.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
