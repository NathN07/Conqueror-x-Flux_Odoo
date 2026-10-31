import fs from "fs";
import path from "path";
import { spawn, ChildProcess } from "child_process";

// 1. Manually parse .env if process.env.DATABASE_URL is not set
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { prisma } from "../src/lib/prisma";
import { signSessionToken, COOKIE_NAME } from "../src/lib/auth";
import { Role } from "@prisma/client";

interface RouteResult {
  route: string;
  role: string;
  status: number;
  timeMs: number;
  slow: boolean;
}

const BASE_URL = process.env.APP_URL || "http://127.0.0.1:3000";
const THRESHOLD_MS = 1500;

async function isServerRunning(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/login`, { method: "HEAD", signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerRunning(url)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function getAdminCookie(baseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@brightloop.com",
        password: "Brightloop@2026",
      }),
    });
    if (res.ok) {
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const match = setCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
        if (match) return `${COOKIE_NAME}=${match[1]}`;
      }
    }
  } catch {
    // fallback below
  }

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) throw new Error("No admin user found in database");
  const token = await signSessionToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: Role.ADMIN,
  });
  return `${COOKIE_NAME}=${token}`;
}

async function getCustomerCookie(baseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "cust1@acmecorp.com",
        password: "Brightloop@2026",
      }),
    });
    if (res.ok) {
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const match = setCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
        if (match) return `${COOKIE_NAME}=${match[1]}`;
      }
    }
  } catch {
    // fallback below
  }

  const customer = await prisma.user.findFirst({ where: { role: Role.CUSTOMER } });
  if (!customer) throw new Error("No customer user found in database");
  const token = await signSessionToken({
    userId: customer.id,
    email: customer.email,
    name: customer.name,
    role: Role.CUSTOMER,
  });
  return `${COOKIE_NAME}=${token}`;
}

async function measureRoute(url: string, cookie: string): Promise<{ status: number; timeMs: number }> {
  const start = performance.now();
  const res = await fetch(url, {
    headers: {
      Cookie: cookie,
      "User-Agent": "Brightloop-Perf-Check/1.0",
    },
    redirect: "manual",
  });
  await res.text();
  const end = performance.now();
  return {
    status: res.status,
    timeMs: Math.round(end - start),
  };
}

async function main() {
  console.log("==========================================================================");
  console.log("⚡ BRIGHTLOOP SYSTEM BENCHMARK & RESPONSE TIME PROFILER");
  console.log("==========================================================================");

  let serverProcess: ChildProcess | null = null;
  const running = await isServerRunning(BASE_URL);

  if (!running) {
    console.log(`📡 Server not running at ${BASE_URL}. Launching production Next.js server...`);
    serverProcess = spawn("npx", ["next", "start", "-p", "3000", "-H", "127.0.0.1"], {
      stdio: "ignore",
      shell: true,
      env: { ...process.env, PORT: "3000", HOSTNAME: "127.0.0.1" },
    });

    const ready = await waitForServer(BASE_URL);
    if (!ready) {
      if (serverProcess) serverProcess.kill();
      throw new Error(`Failed to connect to server at ${BASE_URL} after starting.`);
    }
    console.log(`✅ Production server listening at ${BASE_URL}\n`);
  } else {
    console.log(`✅ Connected to existing server at ${BASE_URL}\n`);
  }

  try {
    console.log("🔑 Authenticating Admin & Customer sessions...");
    const adminCookie = await getAdminCookie(BASE_URL);
    const customerCookie = await getCustomerCookie(BASE_URL);

    // Warm-up request
    await measureRoute(`${BASE_URL}/`, adminCookie);

    const routesToTest: Array<{ route: string; role: "ADMIN" | "CUSTOMER" }> = [
      { route: "/", role: "ADMIN" },
      { route: "/subscriptions", role: "ADMIN" },
      { route: "/invoices", role: "ADMIN" },
      { route: "/payments", role: "ADMIN" },
      { route: "/products", role: "ADMIN" },
      { route: "/plans", role: "ADMIN" },
      { route: "/portal", role: "CUSTOMER" },
      { route: "/?status=ACTIVE&dateRange=12m", role: "ADMIN" },
    ];

    const results: RouteResult[] = [];

    console.log("\n⏱️  Profiling route response times (Performance threshold: 1500 ms)...");

    for (const test of routesToTest) {
      const cookie = test.role === "ADMIN" ? adminCookie : customerCookie;
      const targetUrl = `${BASE_URL}${test.route}`;
      // Warm up the route (JIT chunk load & DB socket reuse)
      await measureRoute(targetUrl, cookie);
      await new Promise((r) => setTimeout(r, 200));

      // Measure two consecutive warmed requests and take the lower time (filtering remote network jitter)
      const run1 = await measureRoute(targetUrl, cookie);
      await new Promise((r) => setTimeout(r, 100));
      const run2 = await measureRoute(targetUrl, cookie);

      const best = run1.timeMs <= run2.timeMs ? run1 : run2;

      results.push({
        route: test.route,
        role: test.role,
        status: best.status,
        timeMs: best.timeMs,
        slow: best.timeMs > THRESHOLD_MS,
      });
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log("\n==========================================================================");
    console.log("📊 BRIGHTLOOP PERFORMANCE BENCHMARK REPORT");
    console.log("==========================================================================");
    console.log(
      `| ${"Route".padEnd(35)} | ${"Role".padEnd(8)} | ${"HTTP".padEnd(4)} | ${"Time (ms)".padStart(9)} | Status`
    );
    console.log("|" + "-".repeat(37) + "|" + "-".repeat(10) + "|" + "-".repeat(6) + "|" + "-".repeat(11) + "|-----------------------");

    let slowCount = 0;
    for (const r of results) {
      const statusIcon = r.slow ? "⚠️  SLOW (>1500ms)" : "✅ PASS";
      if (r.slow) slowCount++;
      console.log(
        `| ${r.route.padEnd(35)} | ${r.role.padEnd(8)} | ${String(r.status).padEnd(4)} | ${String(r.timeMs).padStart(7)} ms | ${statusIcon}`
      );
    }
    console.log("==========================================================================");

    if (slowCount > 0) {
      console.log(`\n⚠️  Notice: ${slowCount} route(s) exceeded the 1500 ms performance threshold.`);
    } else {
      console.log(`\n🎉 All routes responded within the 1500 ms performance budget!`);
    }
  } finally {
    if (serverProcess) {
      console.log("\n🛑 Stopping spawned server process...");
      try {
        process.kill(serverProcess.pid!);
      } catch {
        // ignore
      }
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
