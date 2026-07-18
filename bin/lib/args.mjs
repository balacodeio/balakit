/**
 * Shared CLI argument helpers and usage text.
 */
import { CMD, VERSION, TEAM_INIT_RULES, PERSONAL_RULES } from "./pkg.mjs";
import { loadRules, loadSkills, trunc } from "./catalog.mjs";
import { AGENTS, AGENT_IDS, formatCapabilityMatrix, detectAgents } from "./agents.mjs";
import {
  MENTAL_TOOLING_SCOPES,
  MENTAL_DATA_POLICIES,
  DEFAULT_MENTAL_TOOLING,
  DEFAULT_MENTAL_DATA_POLICY,
} from "./mental-policy.mjs";

export function usage() {
  const rules = loadRules();
  return `${CMD} v${VERSION} — opinionated rules & skills kit

Usage:
  npx ${CMD}                         Guided setup (plan → review → apply)
  npx ${CMD} init                    Same guided setup (non-interactive flags ok)
  npx ${CMD} init --personal         Mental layer (default: user-wide + global exclude)
  npx ${CMD} init --with-personal    Team kit + Mental layer
  npx ${CMD} add <names...>          Add rules and/or skills by name
  npx ${CMD} remove <names...>       Remove owned kit pieces
  npx ${CMD} list                    Available rules, skills, capability matrix
  npx ${CMD} status                  What balakit owns + reconcile health
  npx ${CMD} update                  Refresh installed kit pieces
  npx ${CMD} doctor                  Verify/repair Mental data policy

Options:
  --agents <ids|all>     Skills targets (default: detect + confirm in wizard)
  --mental-tooling <user|project>
  --mental-data <global-exclude|clone-exclude|repo-gitignore|tracked>
  --dry-run              Preview without writing
  -y, --yes              Skip safe confirms (blocked for tracked/repo-gitignore)
  -v, --version          Print version
  -h, --help             Show this help

Team init rules: ${TEAM_INIT_RULES.join(", ")}
Mental role:     ${PERSONAL_RULES.join(", ")} (tooling scope + data policy are chosen at install)

Defaults: tooling=${DEFAULT_MENTAL_TOOLING}, data=${DEFAULT_MENTAL_DATA_POLICY}

Skills are installed via skills.sh. Direct path:
  npx skills add balacodeio/balakit

Available rules: ${rules.map((r) => r.name).join(", ")}
`;
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

  // Flags that are only meaningful on certain commands
  const personalFlags = new Set(["--personal", "--with-personal"]);

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
      const v = next();
      if (!MENTAL_TOOLING_SCOPES.includes(v)) {
        throw new Error(`Unknown --mental-tooling: ${v} — use ${MENTAL_TOOLING_SCOPES.join("|")}`);
      }
      args.mentalTooling = v;
    } else if (a === "--mental-data") {
      const v = next();
      if (!MENTAL_DATA_POLICIES.includes(v)) {
        throw new Error(`Unknown --mental-data: ${v} — use ${MENTAL_DATA_POLICIES.join("|")}`);
      }
      args.mentalDataPolicy = v;
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

  // Reject personal flags on commands that do not consume them
  const personalOk = new Set([null, "init"]);
  if ((args.personal || args.withPersonal) && !personalOk.has(args.command)) {
    throw new Error(
      `--personal / --with-personal only apply to guided setup or \`init\` (got \`${args.command}\`)`,
    );
  }

  // Mental policy flags: guided setup, init, add only (doctor reads recorded policy)
  if (args.mentalTooling !== undefined || args.mentalDataPolicy !== undefined) {
    const allowed = new Set([null, "init", "add"]);
    if (!allowed.has(args.command)) {
      throw new Error(
        `--mental-tooling / --mental-data only apply to guided setup, init, or add`,
      );
    }
  }

  void personalFlags;

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
