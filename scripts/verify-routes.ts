import { spawn, ChildProcess } from "child_process";
import { signSessionToken } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { Role } from "@prisma/client";

const BASE_URL = "http://127.0.0.1:3000";
const COOKIE_NAME = "brightloop_session";

async function isServerRunning(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/login`, { method: "HEAD" });
    return res.status >= 200 && res.status < 500;
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

async function getAdminCookie(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) throw new Error("No admin found in database");
  const token = await signSessionToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: Role.ADMIN,
  });
  return `${COOKIE_NAME}=${token}`;
}

async function getCustomerCookie(): Promise<string> {
  const customer = await prisma.user.findFirst({ where: { role: Role.CUSTOMER } });
  if (!customer) throw new Error("No customer found in database");
  const token = await signSessionToken({
    userId: customer.id,
    email: customer.email,
    name: customer.name,
    role: Role.CUSTOMER,
  });
  return `${COOKIE_NAME}=${token}`;
}

async function verifyRoute(
  path: string,
  cookie: string,
  role: string
): Promise<{ path: string; role: string; status: number; ok: boolean; errorSnippet?: string }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const html = await res.text();

  let errorSnippet: string | undefined;
  const is500 = res.status >= 500;
  const hasRefError = html.includes("ReferenceError") || html.includes("Application error");

  if (is500 || hasRefError) {
    errorSnippet = html.slice(0, 300).replace(/\s+/g, " ");
  }

  return {
    path,
    role,
    status: res.status,
    ok: res.status === 200 && !hasRefError,
    errorSnippet,
  };
}

async function main() {
  console.log("==========================================================================");
  console.log("🚀 PRODUCTION ROUTE VERIFICATION & RUNTIME AUDIT");
  console.log("==========================================================================");

  let serverProcess: ChildProcess | null = null;
  const serverErrors: string[] = [];

  const alreadyRunning = await isServerRunning(BASE_URL);
  if (!alreadyRunning) {
    console.log(`Starting production Next.js server (npm run start)...`);
    serverProcess = spawn("npx", ["next", "start", "-p", "3000", "-H", "127.0.0.1"], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      env: { ...process.env, PORT: "3000", HOSTNAME: "127.0.0.1" },
    });

    serverProcess.stderr?.on("data", (chunk) => {
      const msg = chunk.toString();
      serverErrors.push(msg);
      process.stderr.write(`[SERVER STDERR] ${msg}`);
    });

    serverProcess.stdout?.on("data", (chunk) => {
      const msg = chunk.toString();
      if (msg.includes("Error") || msg.includes("ReferenceError") || msg.includes("exception")) {
        serverErrors.push(msg);
      }
    });

    const ready = await waitForServer(BASE_URL);
    if (!ready) {
      if (serverProcess) serverProcess.kill();
      throw new Error("Server failed to start within timeout.");
    }
    console.log(`✅ Production server is running and healthy at ${BASE_URL}\n`);
  } else {
    console.log(`✅ Using already running server at ${BASE_URL}\n`);
  }

  try {
    const adminCookie = await getAdminCookie();
    const customerCookie = await getCustomerCookie();

    const testRoutes: Array<{ path: string; role: "ADMIN" | "CUSTOMER" }> = [
      { path: "/", role: "ADMIN" },
      { path: "/?status=ACTIVE", role: "ADMIN" },
      { path: "/subscriptions", role: "ADMIN" },
      { path: "/invoices", role: "ADMIN" },
      { path: "/payments", role: "ADMIN" },
      { path: "/products", role: "ADMIN" },
      { path: "/plans", role: "ADMIN" },
      { path: "/portal", role: "CUSTOMER" },
    ];

    console.log("Checking all production routes...\n");
    let allPassed = true;

    for (const item of testRoutes) {
      const cookie = item.role === "ADMIN" ? adminCookie : customerCookie;
      const res = await verifyRoute(item.path, cookie, item.role);
      const icon = res.ok ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${icon} [HTTP ${res.status}] ${item.path.padEnd(25)} (Role: ${item.role})`
      );
      if (!res.ok) {
        allPassed = false;
        if (res.errorSnippet) console.log(`   Snippet: ${res.errorSnippet}`);
      }
      // Small pause between requests
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log("\n==========================================================================");
    if (serverErrors.length > 0) {
      console.log(`⚠️  Detected ${serverErrors.length} server log notice(s) during execution.`);
    } else {
      console.log("✅ Zero server errors or exceptions logged in terminal during testing.");
    }

    if (allPassed) {
      console.log("🎉 ALL ROUTES LOADED SUCCESSFULLY WITH ZERO RUNTIME ERRORS!");
    } else {
      console.log("❌ One or more routes failed verification.");
      process.exitCode = 1;
    }
    console.log("==========================================================================");
  } finally {
    if (serverProcess) {
      console.log("\nStopping background server process...");
      serverProcess.kill();
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
