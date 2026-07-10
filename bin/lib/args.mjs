/**
 * Shared CLI argument helpers and usage text.
 */
import { CMD, VERSION, TEAM_INIT_RULES, PERSONAL_RULES } from "../lib/pkg.mjs";
import { loadRules, loadSkills, trunc } from "../lib/catalog.mjs";
import { AGENTS, AGENT_IDS } from "../lib/agents.mjs";

export function usage() {
  const rules = loadRules();
  return `${CMD} v${VERSION} — opinionated rules & skills kit

Usage:
  npx ${CMD}                         Interactive (presets + cherry-pick)
  npx ${CMD} init                    Team kit → project (AGENTS.md-first)
  npx ${CMD} init --personal         Personal layer (mental, global) + doctor
  npx ${CMD} init --with-personal    Team kit + personal layer
  npx ${CMD} add <names...>          Add rules and/or skills by name
  npx ${CMD} remove <names...>       Remove owned kit pieces
  npx ${CMD} list                    Available rules, skills, agents
  npx ${CMD} status                  What balakit owns here / globally
  npx ${CMD} update                  Refresh installed kit pieces
  npx ${CMD} doctor                  Verify/repair .mental/ git exclude

Options:
  --agents <ids|all>   Target agents (default: auto-detect)
  --dry-run            Preview without writing
  -y, --yes            Skip confirmation
  -v, --version        Print version
  -h, --help           Show this help

Team init rules: ${TEAM_INIT_RULES.join(", ")}
Personal layer:  ${PERSONAL_RULES.join(", ")} (always global; never repo .gitignore)

Skills are installed via skills.sh. Direct path:
  npx skills add balacodeio/balakit

Available rules: ${rules.map((r) => r.name).join(", ")}
`;
}

/**
 * Parse argv into { command, names, agents, dryRun, yes, personal, withPersonal }.
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
    } else if (a === "--doctor") {
      args.command = "doctor";
    } else if (a === "--list") {
      args.command = "list";
    } else if (a === "--dry-run") {
      args.dryRun = true;
    } else if (a === "-y" || a === "--yes") {
      args.yes = true;
    } else if (a === "--personal") {
      args.personal = true;
    } else if (a === "--with-personal") {
      args.withPersonal = true;
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

  return args;
}

export function printList() {
  const allRules = loadRules();
  const allSkills = loadSkills();
  console.log(`Rules:\n${allRules.map((r) => `  ${r.name} — ${r.description}`).join("\n")}`);
  console.log(
    `\nSkills:\n${allSkills.map((s) => `  ${s.name} — ${trunc(s.description, 100)}`).join("\n")}`,
  );
  console.log(`\nAgents:\n${AGENTS.map((a) => `  ${a.id} — ${a.label}`).join("\n")}`);
}
