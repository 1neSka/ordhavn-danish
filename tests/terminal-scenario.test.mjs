import assert from "node:assert/strict";
import test from "node:test";

const data = await import("../lib/terminalScenarioData.ts");
const engine = await import("../lib/terminalEngine.ts");

function run(session, line) {
  return engine.executeTerminalCommand(session, line);
}

function runTranscript(scenario) {
  let session = engine.createTerminalSession(scenario);
  const results = [];
  for (const command of scenario.referenceCommands) {
    const result = run(session, command);
    assert.ok(result.exitCode <= 1, `${scenario.id}: ${command}: ${result.stderr}`);
    assert.equal(result.stderr, "", `${scenario.id}: ${command}`);
    session = result.session;
    results.push(result);
  }
  return { session, results };
}

test("terminal expansion has one substantial Danish-first case for every path level 15-20", () => {
  assert.equal(data.terminalScenarioCases.length, 6);
  assert.deepEqual(data.terminalScenarioCases.map((scenario) => scenario.pathLevel), [15, 16, 17, 18, 19, 20]);
  assert.deepEqual(data.terminalScenarioCases.map((scenario) => scenario.level), ["A2+", "B1", "B2", "A2+", "B1", "B2"]);
  assert.equal(new Set(data.terminalScenarioCases.map((scenario) => scenario.id)).size, 6);

  for (const scenario of data.terminalScenarioCases) {
    assert.ok(scenario.stages.length >= 4, `${scenario.id}: too few stages`);
    assert.ok(scenario.referenceCommands.length >= 4, `${scenario.id}: reference transcript is too short`);
    assert.ok(scenario.objective.length > scenario.englishObjective.length / 2, `${scenario.id}: weak Danish objective`);
    assert.ok(scenario.openingMessage.length > 70, `${scenario.id}: weak opening context`);
    assert.ok(scenario.filesystem.filter((entry) => entry.kind === "file").length >= 4, `${scenario.id}: filesystem too small`);
    for (const stage of scenario.stages) {
      assert.ok(stage.instruction.length > 45, `${scenario.id}/${stage.id}: weak Danish instruction`);
      assert.ok(stage.englishSupport.length > 30, `${scenario.id}/${stage.id}: missing English support`);
      assert.ok(stage.requirements.length > 0, `${scenario.id}/${stage.id}: no machine-checkable requirement`);
    }
  }
  assert.doesNotMatch(JSON.stringify(data.terminalScenarioCases), /[А-Яа-яЁё]/u);
});

test("all six authored terminal cases are solvable through their complete multi-command transcripts", () => {
  for (const scenario of data.terminalScenarioCases) {
    const { session } = runTranscript(scenario);
    const progress = engine.evaluateTerminalCase(scenario, session);
    assert.equal(progress.complete, true, scenario.id);
    assert.equal(progress.completedStages, scenario.stages.length, scenario.id);
    assert.ok(session.history.length >= scenario.referenceCommands.length, `${scenario.id}: command history is incomplete`);
  }
});

test("navigation, listing, help and man behave like the documented Linux subset", () => {
  const scenario = data.terminalScenarioCases[0];
  let session = engine.createTerminalSession(scenario);

  let result = run(session, "pwd");
  assert.equal(result.stdout, "/home/elev\n");
  session = result.session;

  result = run(session, "cd /data/modtagelse/pakke-207");
  assert.equal(result.exitCode, 0);
  assert.equal(result.session.cwd, "/data/modtagelse/pakke-207");
  session = result.session;

  result = run(session, "ls -l");
  assert.match(result.stdout, /-\s+\d+ manifest\.txt/u);
  session = result.session;

  result = run(session, "cd ..");
  assert.equal(result.session.cwd, "/data/modtagelse");
  session = result.session;

  result = run(session, "man grep");
  assert.match(result.stdout, /grep \[-i\] \[-n\]/u);
  result = run(result.session, "help");
  assert.match(result.stdout, /sha256sum/u);

  session = run(session, "cd /home/elev/arbejde").session;
  result = run(session, "ls -a");
  assert.equal(result.stdout, ".  ..\n", "ls -a should expose the two virtual directory entries even in an empty directory");
});

test("clear wipes only the visible terminal while preserving mission history and state", () => {
  const scenario = data.terminalScenarioCases[0];
  let session = engine.createTerminalSession(scenario);

  let result = run(session, "cd /data/modtagelse");
  session = result.session;
  result = run(session, "ls -a");
  session = result.session;
  const entriesBeforeClear = structuredClone(session.entries);

  result = run(session, "clear");
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.session.cwd, "/data/modtagelse");
  assert.deepEqual(result.session.entries, entriesBeforeClear);
  assert.deepEqual(result.session.history.map((record) => record.command), ["cd", "ls", "clear"]);
  assert.equal(result.session.screenHistoryStart, result.session.history.length);
  assert.equal(engine.evaluateTerminalCase(scenario, result.session).stages[0].metRequirements, 2);

  const invalid = run(result.session, "clear nu");
  assert.equal(invalid.exitCode, 1);
  assert.match(invalid.stderr, /ingen argumenter/u);
  assert.equal(invalid.session.screenHistoryStart, 3);
});

test("grep, cut, sort, uniq and pipes reproduce a realistic log-analysis workflow", () => {
  const scenario = data.terminalScenarioCases.find((candidate) => candidate.pathLevel === 16);
  let session = engine.createTerminalSession(scenario);
  const result = run(
    session,
    "grep ' AFVIST ' /var/log/havn/adgang.log | cut -d' ' -f4 | sort | uniq -c | sort -nr | head -n 1",
  );
  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.trim(), "5 ip=10.4.0.19");
  assert.deepEqual(result.session.history.slice(-6).map((record) => record.command), ["grep", "cut", "sort", "uniq", "sort", "head"]);
});

test("find, file, wc, redirection and SHA-256 operate only on the in-memory filesystem", () => {
  const scenario = data.terminalScenarioCases.find((candidate) => candidate.pathLevel === 18);
  let session = engine.createTerminalSession(scenario);

  let result = run(session, "find / -maxdepth 3");
  assert.match(result.stdout, /^\/\r?$/mu);
  assert.match(result.stdout, /^\/home\/elev\r?$/mu, "find / must descend into the virtual root instead of filtering every child out");
  assert.match(result.stdout, /^\/arkiv\/2026\/juli\r?$/mu);
  session = result.session;

  result = run(session, "find . -maxdepth 3 -type f -name '*.jpg'");
  assert.match(result.stdout, /\.\/2026\/juli\/kaj-c\.jpg/u);
  session = result.session;

  result = run(session, "file 2026/juli/*.jpg");
  assert.match(result.stdout, /kaj-a\.jpg: JPEG image data \(simulated\)/u);
  assert.match(result.stdout, /kaj-c\.jpg: UTF-8 Unicode text/u);
  session = result.session;

  result = run(session, "grep '^arkivkode=' 2026/juli/kaj-c.jpg > ~/arbejde/bevis.txt");
  assert.equal(result.stdout, "");
  assert.equal(result.wrotePath, "/home/elev/arbejde/bevis.txt");
  assert.equal(result.session.entries["/home/elev/arbejde/bevis.txt"].content, "arkivkode=FYR-42\n");
  assert.match(result.session.entries["/arkiv/2026/juli/kaj-c.jpg"].content, /Dette er ikke/u, "source file was mutated");
  session = result.session;

  result = run(session, "wc -l ~/arbejde/bevis.txt");
  assert.equal(result.stdout, "1 ~/arbejde/bevis.txt\n");
  session = result.session;

  result = run(session, "sha256sum ~/arbejde/bevis.txt");
  assert.equal(result.stdout.split(/\s+/u)[0], engine.sha256Hex("arkivkode=FYR-42\n"));
  assert.equal(engine.sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("redirection supports overwrite and append without touching the host shell", () => {
  const scenario = data.terminalScenarioCases[0];
  let session = engine.createTerminalSession(scenario);
  let result = run(session, "grep '^pakke=' /data/modtagelse/pakke-184/manifest.txt > ~/arbejde/liste.txt");
  session = result.session;
  result = run(session, "grep '^pakke=' /data/modtagelse/pakke-207/manifest.txt >> ~/arbejde/liste.txt");
  assert.equal(result.session.entries["/home/elev/arbejde/liste.txt"].content, "pakke=184\npakke=207\n");
});

test("the parser rejects destructive commands, shell chaining, substitution and unsupported programs", () => {
  const scenario = data.terminalScenarioCases[0];
  const session = engine.createTerminalSession(scenario);
  const attempts = [
    ["rm -rf /", /Destruktive kommandoer/u],
    ["cat README.txt; rm README.txt", /Operatoren understøttes ikke/u],
    ["cat $(pwd)", /Operatoren understøttes ikke/u],
    ["cat README.txt && pwd", /Operatoren understøttes ikke/u],
    ["bash -c pwd", /Kommandoen understøttes ikke/u],
    ["curl https://example.com", /Kommandoen understøttes ikke/u],
  ];
  for (const [line, error] of attempts) {
    const result = run(session, line);
    assert.notEqual(result.exitCode, 0, line);
    assert.match(result.stderr, error, line);
    assert.deepEqual(result.session.entries, session.entries, `${line}: filesystem changed`);
  }
});

test("AI assistant contract keeps language classification out of the local request builder", () => {
  let session = engine.createTerminalSession(data.terminalScenarioCases[1]);
  assert.equal(data.terminalAssistantPolicy.language, "da");
  assert.match(data.terminalAssistantPolicy.systemInstruction, /Svar kun på dansk/u);

  for (let index = 0; index < 12; index += 1) session = run(session, index % 2 === 0 ? "pwd" : "ls -a").session;
  const conversation = [
    { role: "learner", content: "Hvad gør -a?" },
    { role: "assistant", content: "Flaget viser også skjulte poster." },
  ];

  const accepted = engine.createTerminalAssistantRequest(session, "Hvorfor viser kommandoen stadig det samme?", conversation);
  assert.equal(accepted.accepted, true);
  if (accepted.accepted) {
    assert.equal(accepted.request.language, "da");
    assert.equal(accepted.request.caseId, session.caseId);
    assert.equal(accepted.request.transcript.length, 12, "the complete command history should be retained, not the latest eight commands");
    assert.match(accepted.request.transcript.at(-1).stdout, /\.\s+\.\./u);
    assert.deepEqual(accepted.request.conversation, conversation);
    assert.equal(accepted.request.stage.title, data.terminalScenarioCases[1].stages[0].title);
  }

  const quotedCommand = engine.createTerminalAssistantRequest(session, '"find" giver intet resultat. Ingen nye mapper og filer.');
  assert.equal(quotedCommand.accepted, true, "a quoted Linux command must not make a Danish prompt fail locally");
  const english = engine.createTerminalAssistantRequest(session, "How do I count repeated addresses?");
  assert.equal(english.accepted, true, "Gemini, not a mechanical local heuristic, classifies the prompt language");
  const russian = engine.createTerminalAssistantRequest(session, "Как мне найти адрес?");
  assert.equal(russian.accepted, true, "non-Danish prompts must reach the semantic language classifier");
});

test("case progress belongs to its own deterministic session", () => {
  const first = data.terminalScenarioCases[0];
  const second = data.terminalScenarioCases[1];
  const empty = engine.createTerminalSession(first);
  assert.equal(engine.evaluateTerminalCase(first, empty).complete, false);
  assert.throws(() => engine.evaluateTerminalCase(second, empty), /anden terminalsag/u);
});
