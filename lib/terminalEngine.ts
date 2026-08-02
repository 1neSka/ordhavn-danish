import type {
  TerminalAssistantRequest,
  TerminalScenarioCase,
  TerminalScenarioStage,
  TerminalStageRequirement,
} from "./terminalScenarioData.ts";
import { terminalAssistantPolicy } from "./terminalScenarioData.ts";

export interface TerminalFsEntry {
  kind: "file" | "directory";
  content: string;
}

export interface TerminalCommandRecord {
  line: string;
  command: string;
  args: string[];
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TerminalSession {
  caseId: string;
  cwd: string;
  home: string;
  entries: Record<string, TerminalFsEntry>;
  history: TerminalCommandRecord[];
  screenHistoryStart: number;
}

export interface TerminalExecutionResult {
  session: TerminalSession;
  stdout: string;
  stderr: string;
  exitCode: number;
  wrotePath?: string;
}

export interface TerminalStageProgress {
  stageId: string;
  complete: boolean;
  metRequirements: number;
  totalRequirements: number;
}

export interface TerminalCaseProgress {
  complete: boolean;
  completedStages: number;
  totalStages: number;
  stages: TerminalStageProgress[];
}

interface ParsedPipeline {
  commands: string[][];
  redirect?: { append: boolean; path: string };
}

interface CommandContext {
  session: TerminalSession;
  stdin?: string;
  line: string;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd?: string;
}

const supportedCommands = [
  "help",
  "man",
  "clear",
  "pwd",
  "ls",
  "cd",
  "cat",
  "grep",
  "find",
  "sort",
  "uniq",
  "head",
  "tail",
  "wc",
  "cut",
  "file",
  "sha256sum",
] as const;

const destructiveCommands = new Set([
  "rm",
  "rmdir",
  "mv",
  "cp",
  "chmod",
  "chown",
  "sudo",
  "su",
  "kill",
  "pkill",
  "shutdown",
  "reboot",
  "dd",
  "mkfs",
]);

const manualPages: Record<string, string> = {
  help: "help [kommando] — vis en kort oversigt eller hjælp til én understøttet kommando.",
  man: "man KOMMANDO — vis denne simulations manualside for kommandoen.",
  clear: "clear — ryd den synlige terminalhistorik uden at nulstille filer, mappe eller missionsfremskridt.",
  pwd: "pwd — skriv navnet på den aktuelle arbejdsmappe.",
  ls: "ls [-a] [-l] [-1] [STI...] — vis mapper. -a medtager skjulte poster; -l viser type og størrelse.",
  cd: "cd [STI] — skift arbejdsmappe. Uden sti bruges hjemmemappen. .. og ~ virker.",
  cat: "cat [FIL...] — sammenkæd filer og skriv indholdet. Uden fil læses data fra en pipe.",
  grep: "grep [-i] [-n] [-v] [-h] MØNSTER [FIL...] — vælg linjer. Mønstret følger almindelige regulære udtryk.",
  find: "find [STI] [-maxdepth N] [-type f|d] [-name MØNSTER] [-iname MØNSTER] — søg i det virtuelle filtræ.",
  sort: "sort [-n] [-r] [-u] [FIL...] — sortér linjer; -n numerisk, -r omvendt og -u unikke linjer.",
  uniq: "uniq [-c] [-d] [FIL] — saml identiske nabolinjer. Sortér normalt først. -c tæller; -d viser kun gentagelser.",
  head: "head [-n ANTAL] [FIL...] — vis de første linjer (standard: 10).",
  tail: "tail [-n ANTAL] [FIL...] — vis de sidste linjer (standard: 10).",
  wc: "wc [-l] [-w] [-c] [FIL...] — tæl linjer, ord eller UTF-8-byte.",
  cut: "cut [-d SKILLETEGN] -f FELTER [FIL...] — vælg afgrænsede felter, fx -d';' -f2,3 eller -f2-4.",
  file: "file FIL... — beskriv filens indholdstype i simulationen; endelsen afgør ikke resultatet.",
  sha256sum: "sha256sum FIL... — beregn den virkelige SHA-256-kontrolsum af filindholdet.",
};

function cloneSession(session: TerminalSession): TerminalSession {
  return {
    ...session,
    entries: Object.fromEntries(
      Object.entries(session.entries).map(([path, entry]) => [path, { ...entry }]),
    ),
    history: [...session.history],
  };
}

function normalizeAbsolutePath(path: string): string {
  const segments: string[] = [];
  for (const segment of path.replaceAll("\\", "/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return `/${segments.join("/")}`;
}

export function resolveTerminalPath(session: Pick<TerminalSession, "cwd" | "home">, rawPath: string): string {
  const expanded = rawPath === "~"
    ? session.home
    : rawPath.startsWith("~/")
      ? `${session.home}/${rawPath.slice(2)}`
      : rawPath;
  return normalizeAbsolutePath(expanded.startsWith("/") ? expanded : `${session.cwd}/${expanded}`);
}

function parentPath(path: string): string {
  if (path === "/") return "/";
  const slash = path.lastIndexOf("/");
  return slash <= 0 ? "/" : path.slice(0, slash);
}

function baseName(path: string): string {
  return path === "/" ? "/" : path.slice(path.lastIndexOf("/") + 1);
}

function containsWildcard(value: string): boolean {
  return value.includes("*") || value.includes("?");
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globRegex(pattern: string, matchSlash: boolean): RegExp {
  let source = "";
  for (const character of pattern) {
    if (character === "*") source += matchSlash ? ".*" : "[^/]*";
    else if (character === "?") source += matchSlash ? "." : "[^/]";
    else source += escapeRegex(character);
  }
  return new RegExp(`^${source}$`);
}

function expandGlob(session: TerminalSession, token: string): string[] {
  if (!containsWildcard(token)) return [token];
  const absolutePattern = resolveTerminalPath(session, token);
  const matcher = globRegex(absolutePattern, false);
  const matches = Object.keys(session.entries).filter((path) => matcher.test(path)).sort();
  return matches.length > 0 ? matches : [token];
}

function tokenize(commandLine: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  const flush = () => {
    if (current.length > 0) tokens.push(current);
    current = "";
  };

  for (let index = 0; index < commandLine.length; index += 1) {
    const character = commandLine[index];
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (/\s/u.test(character)) {
      flush();
      continue;
    }
    if (character === "|" || character === ">") {
      flush();
      if (character === ">" && commandLine[index + 1] === ">") {
        tokens.push(">>");
        index += 1;
      } else {
        tokens.push(character);
      }
      continue;
    }
    current += character;
  }
  if (escaped) throw new Error("Uafsluttet escape-tegn.");
  if (quote) throw new Error("Uafsluttet anførselstegn.");
  flush();
  return tokens;
}

function containsUnsupportedOperator(commandLine: string): boolean {
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let index = 0; index < commandLine.length; index += 1) {
    const character = commandLine[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === ";" || character === "&" || character === "<" || character === "`") return true;
    if (character === "$" && commandLine[index + 1] === "(") return true;
  }
  return false;
}

function parsePipeline(commandLine: string): ParsedPipeline {
  if (!commandLine.trim()) throw new Error("Skriv en kommando.");
  if (containsUnsupportedOperator(commandLine)) {
    throw new Error("Operatoren understøttes ikke i den sikre terminal.");
  }
  const tokens = tokenize(commandLine);
  const commands: string[][] = [[]];
  let redirect: ParsedPipeline["redirect"];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "|") {
      if (commands.at(-1)?.length === 0) throw new Error("En pipe mangler en kommando.");
      commands.push([]);
      continue;
    }
    if (token === ">" || token === ">>") {
      if (redirect || index !== tokens.length - 2 || commands.at(-1)?.length === 0) {
        throw new Error("Omdirigering skal stå sidst og have præcis én målfil.");
      }
      redirect = { append: token === ">>", path: tokens[index + 1] };
      index += 1;
      continue;
    }
    if (redirect) throw new Error("Der må ikke stå tekst efter omdirigeringen.");
    commands.at(-1)?.push(token);
  }
  if (commands.some((command) => command.length === 0)) throw new Error("En pipe mangler en kommando.");
  return { commands, redirect };
}

function readFile(session: TerminalSession, rawPath: string): { path: string; content?: string; error?: string } {
  const path = resolveTerminalPath(session, rawPath);
  const entry = session.entries[path];
  if (!entry) return { path, error: `${rawPath}: Filen eller mappen findes ikke.` };
  if (entry.kind !== "file") return { path, error: `${rawPath}: Er en mappe.` };
  return { path, content: entry.content };
}

function readInputs(session: TerminalSession, files: string[], stdin?: string): { content: string; error?: string; sources: { label: string; content: string }[] } {
  if (files.length === 0) {
    if (stdin === undefined) return { content: "", error: "Der mangler input fra en fil eller pipe.", sources: [] };
    return { content: stdin, sources: [{ label: "", content: stdin }] };
  }
  const expanded = files.flatMap((file) => expandGlob(session, file));
  const sources: { label: string; content: string }[] = [];
  for (const rawPath of expanded) {
    const read = readFile(session, rawPath);
    if (read.error) return { content: "", error: read.error, sources: [] };
    sources.push({ label: rawPath, content: read.content ?? "" });
  }
  return { content: sources.map((source) => source.content).join(""), sources };
}

function linesOf(content: string): string[] {
  if (!content) return [];
  const lines = content.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function outputLines(lines: string[]): string {
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function ok(stdout = "", cwd?: string): CommandResult {
  return { stdout, stderr: "", exitCode: 0, cwd };
}

function fail(stderr: string, exitCode = 1): CommandResult {
  return { stdout: "", stderr: `${stderr}\n`, exitCode };
}

function commandHelp(args: string[]): CommandResult {
  const subject = args[0];
  if (subject) {
    const page = manualPages[subject];
    return page ? ok(`${page}\n`) : fail(`help: Ingen hjælp til '${subject}'.`);
  }
  return ok(`Sikker Ordhavn-terminal\nKommandoer: ${supportedCommands.join(", ")}\nBrug help KOMMANDO eller man KOMMANDO for detaljer.\n`);
}

function commandLs(context: CommandContext, args: string[]): CommandResult {
  let showAll = false;
  let long = false;
  let one = false;
  const paths: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("-") && arg !== "-") {
      for (const flag of arg.slice(1)) {
        if (flag === "a") showAll = true;
        else if (flag === "l") long = true;
        else if (flag === "1") one = true;
        else return fail(`ls: Ukendt flag -${flag}.`);
      }
    } else paths.push(...expandGlob(context.session, arg));
  }
  const targets = paths.length > 0 ? paths : [context.session.cwd];
  const blocks: string[] = [];
  for (const rawTarget of targets) {
    const target = resolveTerminalPath(context.session, rawTarget);
    const entry = context.session.entries[target];
    if (!entry) return fail(`ls: ${rawTarget}: Filen eller mappen findes ikke.`);
    if (entry.kind === "file") {
      blocks.push(long ? `-${entry.content.length.toString().padStart(7)} ${baseName(target)}` : baseName(target));
      continue;
    }
    const children = Object.entries(context.session.entries)
      .filter(([path]) => path !== target && parentPath(path) === target)
      .filter(([path]) => showAll || !baseName(path).startsWith("."))
      .sort(([left], [right]) => left.localeCompare(right, "da"));
    const displayed = children.map(([path, child]) => {
      const name = baseName(path);
      if (!long) return name;
      const marker = child.kind === "directory" ? "d" : "-";
      return `${marker}${child.content.length.toString().padStart(7)} ${name}`;
    });
    if (targets.length > 1) blocks.push(`${rawTarget}:\n${one || long ? displayed.join("\n") : displayed.join("  ")}`);
    else blocks.push(one || long ? displayed.join("\n") : displayed.join("  "));
  }
  return ok(`${blocks.join("\n\n")}\n`);
}

function commandGrep(context: CommandContext, args: string[]): CommandResult {
  let insensitive = false;
  let numbered = false;
  let invert = false;
  let hideFilename = false;
  const positional: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("-") && arg !== "-") {
      for (const flag of arg.slice(1)) {
        if (flag === "i") insensitive = true;
        else if (flag === "n") numbered = true;
        else if (flag === "v") invert = true;
        else if (flag === "h") hideFilename = true;
        else if (flag !== "E") return fail(`grep: Ukendt flag -${flag}.`);
      }
    } else positional.push(arg);
  }
  if (positional.length === 0) return fail("grep: Der mangler et søgemønster.");
  const pattern = positional[0];
  const files = positional.slice(1).flatMap((file) => expandGlob(context.session, file));
  const input = readInputs(context.session, files, context.stdin);
  if (input.error) return fail(`grep: ${input.error}`);
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, insensitive ? "iu" : "u");
  } catch {
    return fail("grep: Ugyldigt regulært udtryk.", 2);
  }
  const addFilename = input.sources.length > 1 && !hideFilename;
  const matches: string[] = [];
  for (const source of input.sources) {
    linesOf(source.content).forEach((line, index) => {
      regex.lastIndex = 0;
      if (regex.test(line) !== invert) {
        const prefix = `${addFilename ? `${source.label}:` : ""}${numbered ? `${index + 1}:` : ""}`;
        matches.push(`${prefix}${line}`);
      }
    });
  }
  return { stdout: outputLines(matches), stderr: "", exitCode: matches.length > 0 ? 0 : 1 };
}

function commandFind(context: CommandContext, args: string[]): CommandResult {
  let startRaw = ".";
  let index = 0;
  if (args[0] && !args[0].startsWith("-")) {
    startRaw = args[0];
    index = 1;
  }
  let maxDepth = Number.POSITIVE_INFINITY;
  let kind: "file" | "directory" | undefined;
  let namePattern: string | undefined;
  let insensitive = false;
  while (index < args.length) {
    const arg = args[index];
    if (arg === "-maxdepth") {
      const value = Number(args[index + 1]);
      if (!Number.isInteger(value) || value < 0) return fail("find: -maxdepth kræver et ikke-negativt heltal.");
      maxDepth = value;
      index += 2;
    } else if (arg === "-type") {
      const value = args[index + 1];
      if (value !== "f" && value !== "d") return fail("find: -type understøtter kun f eller d.");
      kind = value === "f" ? "file" : "directory";
      index += 2;
    } else if (arg === "-name" || arg === "-iname") {
      namePattern = args[index + 1];
      if (!namePattern) return fail(`find: ${arg} mangler et mønster.`);
      insensitive = arg === "-iname";
      index += 2;
    } else if (arg === "-print") index += 1;
    else return fail(`find: Udtrykket '${arg}' understøttes ikke.`);
  }
  const start = resolveTerminalPath(context.session, startRaw);
  const root = context.session.entries[start];
  if (!root) return fail(`find: ${startRaw}: Filen eller mappen findes ikke.`);
  const startDepth = start === "/" ? 0 : start.split("/").length - 1;
  let nameMatcher: RegExp | undefined;
  if (namePattern) nameMatcher = globRegex(namePattern, false);
  const paths = Object.entries(context.session.entries)
    .filter(([path]) => path === start || path.startsWith(`${start}/`))
    .filter(([path]) => (path === "/" ? 0 : path.split("/").length - 1) - startDepth <= maxDepth)
    .filter(([, entry]) => !kind || entry.kind === kind)
    .filter(([path]) => {
      if (!nameMatcher) return true;
      const candidate = insensitive ? baseName(path).toLocaleLowerCase("da") : baseName(path);
      const pattern = insensitive ? namePattern?.toLocaleLowerCase("da") ?? "" : namePattern ?? "";
      return globRegex(pattern, false).test(candidate);
    })
    .map(([path]) => {
      if (startRaw.startsWith("/")) return path;
      if (startRaw === ".") return path === start ? "." : `.${path.slice(start.length)}`;
      return path === start ? startRaw : `${startRaw}${path.slice(start.length)}`;
    })
    .sort();
  return ok(outputLines(paths));
}

function parseNFlag(args: string[], command: "head" | "tail"): { count: number; files: string[]; error?: string } {
  let count = 10;
  const files: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "-n") {
      const parsed = Number(args[index + 1]);
      if (!Number.isInteger(parsed) || parsed < 0) return { count, files, error: `${command}: -n kræver et ikke-negativt heltal.` };
      count = parsed;
      index += 1;
    } else if (/^-[0-9]+$/u.test(args[index])) count = Number(args[index].slice(1));
    else if (args[index].startsWith("-")) return { count, files, error: `${command}: Ukendt flag ${args[index]}.` };
    else files.push(args[index]);
  }
  return { count, files };
}

function commandSort(context: CommandContext, args: string[]): CommandResult {
  let numeric = false;
  let reverse = false;
  let unique = false;
  const files: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("-") && arg !== "-") {
      for (const flag of arg.slice(1)) {
        if (flag === "n") numeric = true;
        else if (flag === "r") reverse = true;
        else if (flag === "u") unique = true;
        else return fail(`sort: Ukendt flag -${flag}.`);
      }
    } else files.push(arg);
  }
  const input = readInputs(context.session, files, context.stdin);
  if (input.error) return fail(`sort: ${input.error}`);
  let lines = linesOf(input.content).sort((left, right) => {
    if (numeric) {
      const difference = Number.parseFloat(left.trim()) - Number.parseFloat(right.trim());
      if (!Number.isNaN(difference) && difference !== 0) return difference;
    }
    return left.localeCompare(right, "da");
  });
  if (unique) lines = lines.filter((line, index) => index === 0 || line !== lines[index - 1]);
  if (reverse) lines.reverse();
  return ok(outputLines(lines));
}

function commandUniq(context: CommandContext, args: string[]): CommandResult {
  let counts = false;
  let duplicates = false;
  const files: string[] = [];
  for (const arg of args) {
    if (arg === "-c") counts = true;
    else if (arg === "-d") duplicates = true;
    else if (arg.startsWith("-")) return fail(`uniq: Ukendt flag ${arg}.`);
    else files.push(arg);
  }
  if (files.length > 1) return fail("uniq: Højst én inputfil understøttes.");
  const input = readInputs(context.session, files, context.stdin);
  if (input.error) return fail(`uniq: ${input.error}`);
  const groups: { line: string; count: number }[] = [];
  for (const line of linesOf(input.content)) {
    const previous = groups.at(-1);
    if (previous?.line === line) previous.count += 1;
    else groups.push({ line, count: 1 });
  }
  const lines = groups
    .filter((group) => !duplicates || group.count > 1)
    .map((group) => counts ? `${String(group.count).padStart(7)} ${group.line}` : group.line);
  return ok(outputLines(lines));
}

function fieldIndices(spec: string): number[] | null {
  const fields = new Set<number>();
  for (const part of spec.split(",")) {
    const range = part.match(/^(\d+)(?:-(\d+))?$/u);
    if (!range) return null;
    const first = Number(range[1]);
    const last = Number(range[2] ?? range[1]);
    if (first < 1 || last < first) return null;
    for (let value = first; value <= last; value += 1) fields.add(value - 1);
  }
  return [...fields].sort((left, right) => left - right);
}

function commandCut(context: CommandContext, args: string[]): CommandResult {
  let delimiter = "\t";
  let fields: number[] | null = null;
  const files: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "-d") {
      delimiter = args[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("-d")) delimiter = arg.slice(2);
    else if (arg === "-f") {
      fields = fieldIndices(args[index + 1] ?? "");
      index += 1;
    } else if (arg.startsWith("-f")) fields = fieldIndices(arg.slice(2));
    else if (arg.startsWith("-")) return fail(`cut: Ukendt flag ${arg}.`);
    else files.push(arg);
  }
  if (delimiter.length !== 1) return fail("cut: Skilletegnet skal være præcis ét tegn.");
  if (!fields) return fail("cut: Der kræves en gyldig feltliste med -f.");
  const input = readInputs(context.session, files, context.stdin);
  if (input.error) return fail(`cut: ${input.error}`);
  const transformed = linesOf(input.content).map((line) => {
    if (!line.includes(delimiter)) return line;
    const parts = line.split(delimiter);
    return fields.map((field) => parts[field]).filter((part) => part !== undefined).join(delimiter);
  });
  return ok(outputLines(transformed));
}

function commandWc(context: CommandContext, args: string[]): CommandResult {
  let showLines = false;
  let showWords = false;
  let showBytes = false;
  const files: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("-") && arg !== "-") {
      for (const flag of arg.slice(1)) {
        if (flag === "l") showLines = true;
        else if (flag === "w") showWords = true;
        else if (flag === "c") showBytes = true;
        else return fail(`wc: Ukendt flag -${flag}.`);
      }
    } else files.push(arg);
  }
  if (!showLines && !showWords && !showBytes) showLines = showWords = showBytes = true;
  const input = readInputs(context.session, files, context.stdin);
  if (input.error) return fail(`wc: ${input.error}`);
  const outputs = input.sources.map((source) => {
    const values: number[] = [];
    if (showLines) values.push(linesOf(source.content).length);
    if (showWords) values.push((source.content.match(/\S+/gu) ?? []).length);
    if (showBytes) values.push(new TextEncoder().encode(source.content).length);
    return `${values.join(" ")}${source.label ? ` ${source.label}` : ""}`;
  });
  return ok(outputLines(outputs));
}

function commandFile(context: CommandContext, args: string[]): CommandResult {
  if (args.length === 0) return fail("file: Der mangler en fil.");
  const paths = args.flatMap((arg) => expandGlob(context.session, arg));
  const output: string[] = [];
  for (const rawPath of paths) {
    const path = resolveTerminalPath(context.session, rawPath);
    const entry = context.session.entries[path];
    if (!entry) return fail(`file: ${rawPath}: Filen eller mappen findes ikke.`);
    let description: string;
    if (entry.kind === "directory") description = "directory";
    else if (entry.content.startsWith("JPEG-SIM\u0000")) description = "JPEG image data (simulated)";
    else if (entry.content.includes("\u0000")) description = "data";
    else if (/[æøåÆØÅ]|[^\u0000-\u007f]/u.test(entry.content)) description = "UTF-8 Unicode text";
    else description = "ASCII text";
    output.push(`${rawPath}: ${description}`);
  }
  return ok(outputLines(output));
}

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/** Small synchronous SHA-256 implementation for deterministic browser and test use. */
export function sha256Hex(input: string): string {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const bytes = [...new TextEncoder().encode(input)];
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(64).fill(0);
    for (let index = 0; index < 16; index += 1) {
      const byte = offset + index * 4;
      words[index] = ((bytes[byte] << 24) | (bytes[byte + 1] << 16) | (bytes[byte + 2] << 8) | bytes[byte + 3]) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15];
      const right = words[index - 2];
      const sigma0 = rotateRight(left, 7) ^ rotateRight(left, 18) ^ (left >>> 3);
      const sigma1 = rotateRight(right, 17) ^ rotateRight(right, 19) ^ (right >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((value) => value.toString(16).padStart(8, "0")).join("");
}

function runCommand(context: CommandContext, tokens: string[]): CommandResult {
  const [command, ...args] = tokens;
  if (destructiveCommands.has(command)) return fail(`${command}: Destruktive kommandoer er blokeret i simulationen.`, 126);
  if (!(supportedCommands as readonly string[]).includes(command)) return fail(`${command}: Kommandoen understøttes ikke. Brug help.`, 127);
  if (command === "help") return commandHelp(args);
  if (command === "man") return args.length === 1 ? commandHelp(args) : fail("man: Angiv præcis én kommando.");
  if (command === "clear") return args.length === 0 ? ok() : fail("clear: Kommandoen tager ingen argumenter.");
  if (command === "pwd") return args.length === 0 ? ok(`${context.session.cwd}\n`) : fail("pwd: Kommandoen tager ingen argumenter.");
  if (command === "ls") return commandLs(context, args);
  if (command === "cd") {
    if (args.length > 1) return fail("cd: For mange argumenter.");
    const path = resolveTerminalPath(context.session, args[0] ?? "~");
    const entry = context.session.entries[path];
    if (!entry) return fail(`cd: ${args[0]}: Mappen findes ikke.`);
    if (entry.kind !== "directory") return fail(`cd: ${args[0]}: Er ikke en mappe.`);
    return ok("", path);
  }
  if (command === "cat") {
    const input = readInputs(context.session, args, context.stdin);
    return input.error ? fail(`cat: ${input.error}`) : ok(input.content);
  }
  if (command === "grep") return commandGrep(context, args);
  if (command === "find") return commandFind(context, args);
  if (command === "sort") return commandSort(context, args);
  if (command === "uniq") return commandUniq(context, args);
  if (command === "head" || command === "tail") {
    const parsed = parseNFlag(args, command);
    if (parsed.error) return fail(parsed.error);
    const input = readInputs(context.session, parsed.files, context.stdin);
    if (input.error) return fail(`${command}: ${input.error}`);
    const lines = linesOf(input.content);
    return ok(outputLines(command === "head" ? lines.slice(0, parsed.count) : lines.slice(-parsed.count)));
  }
  if (command === "wc") return commandWc(context, args);
  if (command === "cut") return commandCut(context, args);
  if (command === "file") return commandFile(context, args);
  if (command === "sha256sum") {
    if (args.length === 0) return fail("sha256sum: Der mangler en fil.");
    const output: string[] = [];
    for (const rawPath of args.flatMap((arg) => expandGlob(context.session, arg))) {
      const read = readFile(context.session, rawPath);
      if (read.error) return fail(`sha256sum: ${read.error}`);
      output.push(`${sha256Hex(read.content ?? "")}  ${rawPath}`);
    }
    return ok(outputLines(output));
  }
  return fail("Intern terminalfejl.");
}

export function createTerminalSession(scenario: TerminalScenarioCase): TerminalSession {
  const entries: Record<string, TerminalFsEntry> = {};
  for (const seed of scenario.filesystem) {
    const path = normalizeAbsolutePath(seed.path);
    if (entries[path]) throw new Error(`${scenario.id}: Filstien ${path} er defineret flere gange.`);
    entries[path] = { kind: seed.kind, content: seed.kind === "file" ? seed.content ?? "" : "" };
  }
  if (!entries["/"] || entries["/"].kind !== "directory") throw new Error(`${scenario.id}: Rodmappen mangler.`);
  for (const path of Object.keys(entries)) {
    if (path !== "/" && entries[parentPath(path)]?.kind !== "directory") {
      throw new Error(`${scenario.id}: Forældremappen til ${path} mangler.`);
    }
  }
  const cwd = normalizeAbsolutePath(scenario.startPath);
  if (entries[cwd]?.kind !== "directory") throw new Error(`${scenario.id}: Startmappen findes ikke.`);
  return { caseId: scenario.id, cwd, home: "/home/elev", entries, history: [], screenHistoryStart: 0 };
}

export function executeTerminalCommand(session: TerminalSession, commandLine: string): TerminalExecutionResult {
  const next = cloneSession(session);
  let pipeline: ParsedPipeline;
  try {
    pipeline = parsePipeline(commandLine);
  } catch (error) {
    return { session: next, stdout: "", stderr: `${error instanceof Error ? error.message : "Ugyldig kommando."}\n`, exitCode: 2 };
  }
  let stdin: string | undefined;
  let final: CommandResult = ok();
  for (const tokens of pipeline.commands) {
    const cwdBefore = next.cwd;
    final = runCommand({ session: next, stdin, line: commandLine }, tokens);
    if (final.cwd) next.cwd = final.cwd;
    next.history.push({
      line: commandLine,
      command: tokens[0],
      args: tokens.slice(1),
      cwd: cwdBefore,
      stdout: final.stdout,
      stderr: final.stderr,
      exitCode: final.exitCode,
    });
    if (tokens[0] === "clear" && final.exitCode === 0) next.screenHistoryStart = next.history.length;
    if (final.exitCode > 1 || final.stderr) break;
    stdin = final.stdout;
  }
  let wrotePath: string | undefined;
  if (pipeline.redirect && final.exitCode <= 1 && !final.stderr) {
    wrotePath = resolveTerminalPath(next, pipeline.redirect.path);
    if (next.entries[parentPath(wrotePath)]?.kind !== "directory") {
      final = fail(`shell: ${pipeline.redirect.path}: Målmappen findes ikke.`);
    } else if (next.entries[wrotePath]?.kind === "directory") {
      final = fail(`shell: ${pipeline.redirect.path}: Er en mappe.`);
    } else {
      const previous = pipeline.redirect.append ? next.entries[wrotePath]?.content ?? "" : "";
      next.entries[wrotePath] = { kind: "file", content: previous + final.stdout };
      final = { ...final, stdout: "" };
    }
  }
  return { session: next, stdout: final.stdout, stderr: final.stderr, exitCode: final.exitCode, wrotePath };
}

function requirementMet(session: TerminalSession, requirement: TerminalStageRequirement): boolean {
  if (requirement.type === "command-used") {
    const count = session.history.filter((record) => record.command === requirement.command && record.exitCode === 0).length;
    return count >= (requirement.minimum ?? 1);
  }
  if (requirement.type === "successful-output") {
    return session.history.some(
      (record) =>
        record.exitCode === 0 &&
        (!requirement.command || record.command === requirement.command) &&
        record.stdout.includes(requirement.includes),
    );
  }
  if (requirement.type === "file-exists") {
    return session.entries[resolveTerminalPath(session, requirement.path)]?.kind === "file";
  }
  if (requirement.type === "file-contains") {
    const entry = session.entries[resolveTerminalPath(session, requirement.path)];
    return entry?.kind === "file" && requirement.includes.every((fragment) => entry.content.includes(fragment));
  }
  return session.cwd === resolveTerminalPath(session, requirement.path);
}

export function evaluateTerminalStage(session: TerminalSession, stage: TerminalScenarioStage): TerminalStageProgress {
  const metRequirements = stage.requirements.filter((requirement) => requirementMet(session, requirement)).length;
  return {
    stageId: stage.id,
    complete: metRequirements === stage.requirements.length,
    metRequirements,
    totalRequirements: stage.requirements.length,
  };
}

export function evaluateTerminalCase(scenario: TerminalScenarioCase, session: TerminalSession): TerminalCaseProgress {
  if (session.caseId !== scenario.id) throw new Error("Sessionen tilhører en anden terminalsag.");
  const stages = scenario.stages.map((stage) => evaluateTerminalStage(session, stage));
  const completedStages = stages.filter((stage) => stage.complete).length;
  return {
    complete: completedStages === stages.length,
    completedStages,
    totalStages: stages.length,
    stages,
  };
}

const danishPromptWords = new Set([
  "af", "at", "den", "der", "det", "du", "en", "er", "et", "for", "fra", "hvad", "hvordan", "hvorfor",
  "jeg", "kan", "kommando", "med", "mig", "og", "på", "skal", "som", "til", "viser", "virker",
]);

export function isDanishAssistantPrompt(prompt: string): boolean {
  if (/[А-Яа-яЁё]/u.test(prompt)) return false;
  const words = prompt.toLocaleLowerCase("da").match(/[a-zæøå]+/gu) ?? [];
  const markers = words.filter((word) => danishPromptWords.has(word)).length;
  return /[æøå]/iu.test(prompt) || markers >= 2;
}

export function createTerminalAssistantRequest(
  session: TerminalSession,
  prompt: string,
): { accepted: true; request: TerminalAssistantRequest } | { accepted: false; reason: string } {
  const normalized = prompt.trim();
  if (!normalized || normalized.length > terminalAssistantPolicy.maxPromptCharacters) {
    return { accepted: false, reason: "Spørgsmålet skal være mellem 1 og 600 tegn." };
  }
  if (!isDanishAssistantPrompt(normalized)) return { accepted: false, reason: terminalAssistantPolicy.refusal };
  return {
    accepted: true,
    request: {
      caseId: session.caseId,
      language: "da",
      prompt: normalized,
      cwd: session.cwd,
      recentCommands: session.history.slice(-terminalAssistantPolicy.maxRecentCommands).map((record) => record.line),
    },
  };
}
