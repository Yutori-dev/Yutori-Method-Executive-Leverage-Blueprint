/**
 * Simulates N participants working through the full Milestone 1-3 flow
 * against a running instance of the app (brief section 25/29: "tested at
 * 75 simulated concurrent participant sessions before production use").
 *
 * Runs in two phases:
 *   1. Provision & authenticate all N participants, paced -- this mirrors
 *      how real participants actually arrive (over several minutes, as
 *      people open their email), and avoids Supabase's per-IP auth
 *      rate limits, which every simulated participant would otherwise trip
 *      immediately by all authenticating from this one test machine's IP.
 *      A real workshop's 75 participants connect from 75 different
 *      IPs and would never come close to that limit; pacing here removes
 *      an artifact of the test running from a single machine, not a
 *      real-world constraint.
 *   2. Fire all N participants' actual app interactions -- join, rate
 *      responsibilities, select priorities, load pages -- genuinely
 *      simultaneously. This phase is the real signal.
 *
 * Usage:
 *   npm run load-test -- 75
 *   LOAD_TEST_BASE_URL=https://your-deploy.vercel.app npm run load-test -- 75
 *
 * Defaults to http://localhost:3000 and 75 participants. Requires
 * SUPABASE_SERVICE_ROLE_KEY (creates and cleans up real, temporary test
 * accounts -- never run this against a project real participants are using).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.LOAD_TEST_BASE_URL ?? "http://localhost:3000";
const participantCount = Number(process.argv[2] ?? 75);
const provisionDelayMs = Number(process.argv[3] ?? 1500);
const projectRef = new URL(url).hostname.split(".")[0];
const cookieName = `sb-${projectRef}-auth-token`;

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

interface Timing {
  step: string;
  ms: number;
  ok: boolean;
  status?: number;
}

const timings: Timing[] = [];

async function timed<T>(step: string, fn: () => Promise<{ ok: boolean; status?: number; result: T }>): Promise<T> {
  const start = performance.now();
  const { ok, status, result } = await fn();
  timings.push({ step, ms: performance.now() - start, ok, status });
  return result;
}

function cookieFor(session: unknown) {
  return `${cookieName}=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

async function fetchStep(step: string, url2: string, init?: RequestInit) {
  return timed(step, async () => {
    const res = await fetch(url2, init);
    return { ok: res.ok, status: res.status, result: res };
  });
}

async function rpcStep<T>(
  step: string,
  client: AnyClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<T | null> {
  return timed(step, async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.rpc as any)(fn, args);
    return { ok: !error, result: (error ? null : data) as T | null };
  });
}

interface Provisioned {
  index: number;
  ok: boolean;
  stage?: string;
  error?: string;
  userId?: string;
  client?: AnyClient;
  cookie?: string;
}

async function provisionParticipant(index: number): Promise<Provisioned> {
  const email = `load-test-${Date.now()}-${index}@example.com`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (createErr || !created.user) return { index, ok: false, stage: "createUser", error: createErr?.message };
  const userId = created.user.id;

  await admin.from("participants").insert({ id: userId, first_name: `Load${index}`, last_name: "Test", email });

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !linkData.properties) return { index, ok: false, stage: "generateLink", error: linkErr?.message, userId };

  const anon = createClient(url, anonKey);
  const { data: sessionData, error: sessionErr } = await anon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (sessionErr || !sessionData.session) {
    return { index, ok: false, stage: "verifyOtp", error: sessionErr?.message, userId };
  }

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } },
  }) as AnyClient;

  return { index, ok: true, userId, client, cookie: cookieFor(sessionData.session) };
}

async function runParticipantFlow(p: Provisioned, joinCode: string, sessionId: string) {
  const { client, cookie, userId } = p;
  if (!client || !cookie) return { index: p.index, ok: false, stage: "not_provisioned", userId };

  try {
    await fetchStep("GET /join/[code]", `${baseUrl}/join/${joinCode}`);

    const ps = await rpcStep<{ id: string }>("join_session", client, "join_session", { p_join_code: joinCode });
    if (!ps) return { index: p.index, ok: false, stage: "join_session", userId };
    const participantSessionId = ps.id;

    await fetchStep("GET /dashboard/[id]", `${baseUrl}/dashboard`, { headers: { Cookie: cookie } });

    await fetchStep(
      "GET module page (current_structure)",
      `${baseUrl}/dashboard/${sessionId}/modules/current_structure`,
      { headers: { Cookie: cookie } },
    ).catch(() => {});

    const { data: responsibilities } = await admin
      .from("responsibilities")
      .select("id")
      .order("sort_order", { ascending: true })
      .limit(10);
    const ids = (responsibilities ?? []).map((r) => r.id);

    await rpcStep("select_responsibilities", client, "select_responsibilities", {
      p_participant_session_id: participantSessionId,
      p_responsibility_ids: ids,
    });

    const ratingPairs: ["low" | "medium" | "high", "low" | "medium" | "high"][] = [
      ["high", "high"], ["high", "medium"], ["medium", "high"], ["medium", "medium"], ["high", "low"],
      ["low", "high"], ["medium", "low"], ["low", "medium"], ["low", "low"], ["high", "high"],
    ];
    const zoneByResp = new Map<string, string>();
    await Promise.all(
      ids.map(async (id, i) => {
        const rated = await rpcStep<{ macro_zone: string }>("rate_responsibility", client, "rate_responsibility", {
          p_participant_session_id: participantSessionId,
          p_responsibility_id: id,
          p_competency: ratingPairs[i][0],
          p_passion: ratingPairs[i][1],
        });
        if (rated) zoneByResp.set(id, rated.macro_zone);
      }),
    );

    const eligible = [...zoneByResp.entries()].filter(([, z]) => z !== "investment").map(([id]) => id);
    if (eligible.length >= 3) {
      await rpcStep("select_priority_delegation_opportunities", client, "select_priority_delegation_opportunities", {
        p_participant_session_id: participantSessionId,
        p_responsibility_ids: eligible.slice(0, 3),
      });
    }

    await fetchStep("GET blueprint page", `${baseUrl}/dashboard/${sessionId}/blueprint`, {
      headers: { Cookie: cookie },
    }).catch(() => {});

    return { index: p.index, ok: true, userId };
  } catch (err) {
    return { index: p.index, ok: false, stage: "unexpected", error: err instanceof Error ? err.message : String(err), userId };
  }
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  console.log(`Load testing ${baseUrl} with ${participantCount} participants (${participantCount} concurrent app interactions after paced provisioning)...\n`);

  const { data: testSession } = await admin
    .from("sessions")
    .insert({ name: "Load test session", join_code: `LOAD-TEST-${Date.now()}`, status: "active" })
    .select("id, join_code")
    .single();
  const sessionId = testSession!.id as string;
  const joinCode = testSession!.join_code as string;

  const { data: architectureModule } = await admin.from("modules").select("id").eq("key", "architecture").single();
  await admin.from("sessions").update({ active_module_id: architectureModule!.id }).eq("id", sessionId);

  console.log(`Phase 1: provisioning ${participantCount} participants (paced ${provisionDelayMs}ms apart)...`);
  const provisioned: Provisioned[] = [];
  for (let i = 0; i < participantCount; i++) {
    provisioned.push(await provisionParticipant(i));
    if (i < participantCount - 1) await new Promise((r) => setTimeout(r, provisionDelayMs));
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${participantCount} provisioned`);
  }
  const provisionFailures = provisioned.filter((p) => !p.ok);
  console.log(`Phase 1 done: ${provisioned.length - provisionFailures.length}/${participantCount} provisioned successfully.\n`);

  console.log(`Phase 2: firing all app interactions concurrently...`);
  const started = performance.now();
  const results = await Promise.all(provisioned.map((p) => runParticipantFlow(p, joinCode, sessionId)));
  const wallClockMs = performance.now() - started;

  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log(`\n--- Phase 2 results (the real signal) ---`);
  console.log(`Participants attempted: ${results.length}`);
  console.log(`Succeeded: ${succeeded.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Wall clock (all concurrent): ${(wallClockMs / 1000).toFixed(1)}s\n`);

  const byStep = new Map<string, Timing[]>();
  for (const t of timings) {
    byStep.set(t.step, [...(byStep.get(t.step) ?? []), t]);
  }

  console.log(`--- Per-step latency (ms) ---`);
  for (const [step, entries] of byStep) {
    const okEntries = entries.filter((e) => e.ok);
    const durations = okEntries.map((e) => e.ms);
    const errorCount = entries.length - okEntries.length;
    if (durations.length === 0) {
      console.log(`${step.padEnd(40)} n=${entries.length.toString().padStart(3)} errors=${errorCount.toString().padStart(3)} (no successful samples)`);
      continue;
    }
    console.log(
      `${step.padEnd(40)} n=${entries.length.toString().padStart(3)} errors=${errorCount.toString().padStart(3)} ` +
        `min=${Math.min(...durations).toFixed(0).padStart(5)} avg=${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0).padStart(5)} ` +
        `p95=${percentile(durations, 95).toFixed(0).padStart(5)} max=${Math.max(...durations).toFixed(0).padStart(5)}`,
    );
  }

  const allFailures = [...provisionFailures, ...failed];
  if (allFailures.length > 0) {
    console.log(`\n--- Failures (provisioning + phase 2) ---`);
    for (const f of allFailures.slice(0, 10)) {
      console.log(JSON.stringify(f));
    }
    if (allFailures.length > 10) console.log(`... and ${allFailures.length - 10} more`);
  }

  console.log(`\nCleaning up ${provisioned.length} test participants...`);
  const userIds = provisioned.map((r) => r.userId).filter((id): id is string => !!id);
  await admin.from("participant_sessions").delete().in("participant_id", userIds);
  await admin.from("participants").delete().in("id", userIds);
  for (const batchStart of Array.from({ length: Math.ceil(userIds.length / 20) }, (_, i) => i * 20)) {
    await Promise.all(userIds.slice(batchStart, batchStart + 20).map((id) => admin.auth.admin.deleteUser(id)));
  }
  await admin.from("sessions").delete().eq("id", sessionId);
  console.log("Done.");

  process.exit(failed.length > participantCount * 0.05 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
