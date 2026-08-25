/**
 * Shared CLI argument helpers and usage text.
 */
import { CMD, VERSION, TEAM_INIT_RULES } from "./pkg.mjs";
import { loadRules, loadSkills, trunc } from "./catalog.mjs";
import { AGENTS, AGENT_IDS, formatCapabilityMatrix, detectAgents } from "./agents.mjs";
import { MENTAL_MOVED, MENTAL_REPO } from "./mental-moved.mjs";

export function usage() {
  const rules = loadRules();
  return `${CMD} v${VERSION} — opinionated rules & skills kit

Usage:
  npx ${CMD}                         Guided setup (plan → review → apply)
  npx ${CMD} init                    Same guided setup (non-interactive flags ok)
  npx ${CMD} add <names...>          Add rules and/or skills by name
  npx ${CMD} remove <names...>       Remove owned kit pieces
  npx ${CMD} list                    Available rules, skills, capability matrix
  npx ${CMD} status                  What balakit owns + reconcile health
  npx ${CMD} update                  Refresh installed kit pieces

Options:
  --agents <ids|all>     Skills targets (default: detect + confirm in wizard)
  --dry-run              Preview without writing
  -y, --yes              Skip confirms
  -v, --version          Print version
  -h, --help             Show this help

Team init rules: ${TEAM_INIT_RULES.join(", ")}

Mental continuity has moved to ${MENTAL_REPO}
(\`doctor\`, \`--personal\`, and \`--mental-*\` flags print the new location.)

Skills are installed via skills.sh. Direct path:
  npx skills add balacodeio/balakit

Available rules: ${rules.map((r) => r.name).join(", ")}
`;
}

/**
 * True when argv asked for Mental tooling that no longer ships here.
 * @param {ReturnType<typeof parseArgv>} args
 */
export function isMentalMovedRequest(args) {
  if (args.command === "doctor") return true;
  if (args.personal || args.withPersonal || args.liftIgnore) return true;
  if (args.mentalTooling || args.mentalDataPolicy) return true;
  if (args.names.includes("mental")) return true;
  return false;
}

/**
 * Parse argv into a structured args object.
 */
export function parseArgv(argv) {
  const args = {
    command: null,
    names: [],
    agents: undefined,
    dryRun: false,
    yes: false,
    personal: false,
    withPersonal: false,
    mentalTooling: undefined,
    mentalDataPolicy: undefined,
    liftIgnore: false,
  };
  const csv = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);
  const commands = new Set([
    "init",
    "add",
    "remove",
    "list",
    "status",
    "update",
    "doctor",
    "help",
  ]);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "-h" || a === "--help") {
      args.command = "help";
    } else if (a === "-v" || a === "--version") {
      args.command = "version";
    } else if (a === "--dry-run") {
      args.dryRun = true;
    } else if (a === "-y" || a === "--yes") {
      args.yes = true;
    } else if (a === "--personal") {
      args.personal = true;
    } else if (a === "--with-personal") {
      args.withPersonal = true;
    } else if (a === "--mental-tooling") {
      args.mentalTooling = next() ?? "";
    } else if (a === "--mental-data") {
      args.mentalDataPolicy = next() ?? "";
    } else if (a === "--lift-ignore") {
      args.liftIgnore = true;
    } else if (a === "--agents") {
      const v = next();
      args.agents = v === "all" ? [...AGENT_IDS] : csv(v);
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    } else if (!args.command && commands.has(a)) {
      args.command = a;
    } else {
      args.names.push(a);
    }
  }

  if (args.agents) {
    const bad = args.agents.find((id) => !AGENT_IDS.includes(id));
    if (bad) throw new Error(`Unknown agent: ${bad} — see list`);
  }

  if (isMentalMovedRequest(args)) {
    throw new Error(MENTAL_MOVED.trimEnd());
  }

  return args;
}

export function printList() {
  const allRules = loadRules();
  const allSkills = loadSkills();
  console.log(`Rules:\n${allRules.map((r) => `  ${r.name} — ${r.description}`).join("\n")}`);
  console.log(
    `\nSkills:\n${allSkills.map((s) => `  ${s.name} — ${trunc(s.description, 100)}`).join("\n")}`,
  );
  console.log("\nCapability matrix (* = detected on this machine):");
  console.log(`  ${formatCapabilityMatrix(detectAgents()).join("\n  ")}`);
  console.log(
    `\nLegacy agent ids (skills.sh):\n${AGENTS.filter((a) => a.skillsShId)
      .map((a) => `  ${a.id} → ${a.skillsShId}`)
      .join("\n")}`,
  );
}
