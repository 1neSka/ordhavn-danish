"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, CircleHelp, TerminalSquare } from "lucide-react";
import type { ScenarioRun } from "@/lib/scenarioData";
import { createTerminalAssistantRequest, createTerminalSession, evaluateTerminalCase, executeTerminalCommand } from "@/lib/terminalEngine";
import { terminalScenarioCases } from "@/lib/terminalScenarioData";
import type { TerminalAssistantRequest } from "@/lib/terminalScenarioData";

type Props = {
  initialCaseId?: string;
  runs: readonly ScenarioRun[];
  onStartAttempt?: (caseId: string) => boolean;
  onComplete: (run: ScenarioRun) => void;
  onExit: () => void;
  onAskAssistant?: (request: TerminalAssistantRequest) => Promise<string | null>;
};

function runId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `terminal-${Date.now()}`;
}

export default function TerminalScenarioGame({ initialCaseId, runs, onStartAttempt, onComplete, onExit, onAskAssistant }: Props) {
  const [activeId, setActiveId] = useState<string | null>(initialCaseId ?? null);
  const solved = useMemo(() => new Set(runs.filter((run) => run.success).map((run) => run.caseId)), [runs]);
  if (!activeId) return <main className="expansion-system-root"><style>{css}</style><header className="expansion-system-header"><button onClick={onExit}><ArrowLeft size={19} /></button><div><span>LINUX · DATAJAGT</span><h1>Terminalværftet</h1><p>Læs sagen, undersøg en lukket filverden og aflever et reproducerbart spor.</p></div></header><section className="expansion-case-grid">{terminalScenarioCases.map((item) => <button key={item.id} onClick={() => setActiveId(item.id)}><TerminalSquare size={24} /><span>NIVEAU {item.pathLevel} · {item.level}</span><h2>{item.title}</h2><p>{item.objective}</p><footer>{solved.has(item.id) ? <><Check size={15} /> Løst</> : <>Åbn terminal <ChevronRight size={15} /></>}</footer></button>)}</section></main>;
  const scenario = terminalScenarioCases.find((item) => item.id === activeId);
  if (!scenario) return null;
  return <TerminalRunner scenario={scenario} onStartAttempt={onStartAttempt} onComplete={onComplete} onAskAssistant={onAskAssistant} onBack={() => initialCaseId ? onExit() : setActiveId(null)} />;
}

function TerminalRunner({ scenario, onStartAttempt, onComplete, onAskAssistant, onBack }: { scenario: (typeof terminalScenarioCases)[number]; onStartAttempt?: (caseId: string) => boolean; onComplete: (run: ScenarioRun) => void; onAskAssistant?: Props["onAskAssistant"]; onBack: () => void }) {
  const startedAt = useRef(new Date().toISOString());
  const claimed = useRef(false);
  useEffect(() => {
    if (claimed.current) return;
    claimed.current = true;
    onStartAttempt?.(scenario.id);
  }, [onStartAttempt, scenario.id]);
  const [session, setSession] = useState(() => createTerminalSession(scenario));
  const [command, setCommand] = useState("");
  const [lastOutput, setLastOutput] = useState(scenario.openingMessage);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const progress = evaluateTerminalCase(scenario, session);

  function execute() {
    if (!command.trim()) return;
    const result = executeTerminalCommand(session, command);
    setSession(result.session);
    setLastOutput(result.stderr || result.stdout || (result.wrotePath ? `Skrev ${result.wrotePath}` : "Kommandoen blev udført."));
    setCommand("");
  }

  function finish() {
    if (!progress.complete || submitted) return;
    const endedAt = new Date().toISOString();
    onComplete({ id: runId(), kind: "terminal", caseId: scenario.id, title: scenario.title, level: scenario.level === "A2+" ? "A2" : scenario.level, startedAt: startedAt.current, endedAt, success: true, score: 420, maxScore: 420, path: session.history.map((record) => record.line), decisions: [], metadata: { pathLevel: scenario.pathLevel, commands: session.history.length, kronerReward: scenario.rewardKroner } });
    setSubmitted(true);
  }

  async function askAssistant() {
    const prepared = createTerminalAssistantRequest(session, assistantPrompt);
    if (!prepared.accepted) {
      setAssistantMessage(prepared.reason);
      return;
    }
    if (!onAskAssistant) {
      setAssistantMessage("AI-forbindelsen er ikke tilgængelig. Brug help eller man; missionen er ikke blokeret.");
      return;
    }
    setAssistantLoading(true);
    try {
      const reply = await onAskAssistant(prepared.request);
      setAssistantMessage(reply ?? "AI-forbindelsen er midlertidigt utilgængelig. Missionen fortsætter uden den.");
    } catch {
      setAssistantMessage("AI-assistenten kunne ikke svare. Missionen fortsætter uden den.");
    } finally {
      setAssistantLoading(false);
    }
  }

  return <main className="expansion-system-root terminal-runner"><style>{css}</style><header className="expansion-system-header"><button onClick={onBack}><ArrowLeft size={19} /></button><div><span>{scenario.location} · {scenario.level}</span><h1>{scenario.title}</h1><p>{scenario.objective}</p></div></header><div className="terminal-layout"><aside className="terminal-brief"><section><span>MISSION</span><p>{scenario.openingMessage}</p></section><ol>{scenario.stages.map((stage, index) => { const state = progress.stages[index]; return <li className={state.complete ? "done" : ""} key={stage.id}><b>{state.complete ? <Check size={14} /> : index + 1}</b><div><strong>{stage.title}</strong><p>{stage.instruction}</p><small>{state.metRequirements}/{state.totalRequirements} krav</small></div></li>; })}</ol><details><summary><CircleHelp size={15} /> Valgfri AI-assistent</summary><p>Assistenten accepterer kun danske spørgsmål og må forklare ét princip ad gangen.</p><textarea value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} placeholder="Hvordan kan jeg …?" /><button onClick={askAssistant} disabled={assistantLoading}>{assistantLoading ? "Spørger …" : assistantMessage ? "Spørg igen" : "Spørg assistenten"}</button>{assistantMessage && <small>{assistantMessage}</small>}</details></aside><section className="terminal-window"><div className="terminal-title"><i /><i /><i /><span>ordhavn@værft:{session.cwd}</span></div><div className="terminal-history">{session.history.slice(session.screenHistoryStart).slice(-14).map((record, index) => <div key={`${record.line}-${index}`}><b>{record.cwd} $ {record.line}</b>{record.stdout && <pre>{record.stdout}</pre>}{record.stderr && <pre className="terminal-error">{record.stderr}</pre>}</div>)}{!session.history.length && <p>{lastOutput}</p>}</div><form onSubmit={(event) => { event.preventDefault(); execute(); }}><span>{session.cwd} $</span><input autoFocus value={command} onChange={(event) => setCommand(event.target.value)} spellCheck={false} aria-label="Terminalkommando" /><button>Udfør</button></form><footer><span>{progress.completedStages}/{progress.totalStages} etaper</span><button disabled={!progress.complete || submitted} onClick={finish}>{submitted ? "Registreret" : "Aflever spor"}</button></footer></section></div></main>;
}

const css = `
.expansion-system-root{min-height:100%;padding:28px;background:radial-gradient(circle at 80% 0,rgba(91,199,177,.11),transparent 34%),var(--paper);color:var(--ink)}
.expansion-system-header{display:flex;gap:16px;align-items:center;max-width:1200px;margin:0 auto 24px}.expansion-system-header>button{width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:var(--surface);color:var(--ink)}.expansion-system-header span{font-size:9px;letter-spacing:.12em;color:#54bda8;font-weight:800}.expansion-system-header h1{margin:4px 0;font-size:30px}.expansion-system-header p{margin:0;color:var(--muted);font-size:12px}
.expansion-case-grid{max-width:1200px;margin:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.expansion-case-grid>button{text-align:left;min-height:220px;padding:25px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(135deg,var(--surface),color-mix(in srgb,#54bda8 7%,var(--surface)));color:var(--ink)}.expansion-case-grid>button>svg{color:#54bda8}.expansion-case-grid span{display:block;margin:18px 0 5px;font-size:8px;letter-spacing:.1em;color:#54bda8}.expansion-case-grid h2{margin:0 0 9px}.expansion-case-grid p{color:var(--muted);font-size:11px;line-height:1.55}.expansion-case-grid footer{display:flex;align-items:center;gap:6px;margin-top:18px;font-weight:750;font-size:10px}
.terminal-layout{max-width:1300px;margin:auto;display:grid;grid-template-columns:340px minmax(0,1fr);gap:18px}.terminal-brief{display:grid;gap:14px;align-content:start}.terminal-brief>section,.terminal-brief>ol,.terminal-brief details{margin:0;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}.terminal-brief>section span{font-size:8px;color:#54bda8;font-weight:800}.terminal-brief p{font-size:10px;line-height:1.55;color:var(--muted)}.terminal-brief ol{list-style:none;display:grid;gap:12px}.terminal-brief li{display:grid;grid-template-columns:24px 1fr;gap:10px}.terminal-brief li>b{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;background:#3a3748;font-size:9px}.terminal-brief li.done>b{background:#245f53;color:#76dbc5}.terminal-brief li strong{font-size:11px}.terminal-brief li p{margin:3px 0}.terminal-brief li small{font-size:8px;color:#54bda8}.terminal-brief summary{display:flex;gap:7px;cursor:pointer;font-size:10px;font-weight:800}.terminal-brief textarea{width:100%;min-height:70px;padding:9px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink)}.terminal-brief details button{margin-top:7px;padding:8px 10px;border:0;border-radius:8px;background:#4ebba5;color:#10231f;font-weight:800}
.terminal-window{min-height:650px;display:grid;grid-template-rows:44px 1fr 58px 54px;border:1px solid #34413e;border-radius:17px;overflow:hidden;background:#0e1514;color:#d4e8e3;box-shadow:0 24px 70px rgba(0,0,0,.25)}.terminal-title{display:flex;align-items:center;gap:7px;padding:0 15px;background:#18221f}.terminal-title i{width:10px;height:10px;border-radius:50%;background:#e87565}.terminal-title i:nth-child(2){background:#e5b455}.terminal-title i:nth-child(3){background:#55b996}.terminal-title span{margin-left:8px;color:#78938c;font-size:10px}.terminal-history{overflow:auto;padding:18px;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.terminal-history div{margin-bottom:12px}.terminal-history b{color:#6fd4bc}.terminal-history pre{margin:4px 0;white-space:pre-wrap;font:inherit}.terminal-error{color:#ef8e83}.terminal-window form{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:9px 13px;border-top:1px solid #283632}.terminal-window form span{color:#6fd4bc;font:11px ui-monospace}.terminal-window input{height:38px;border:0;outline:0;background:transparent;color:white;font:13px ui-monospace}.terminal-window form button,.terminal-window>footer button{padding:9px 13px;border:0;border-radius:8px;background:#55c4ac;color:#0f241f;font-weight:800}.terminal-window>footer{display:flex;justify-content:space-between;align-items:center;padding:0 14px;border-top:1px solid #283632;color:#78938c;font-size:9px}.terminal-window>footer button:disabled{opacity:.35}
@media(max-width:900px){.terminal-layout{grid-template-columns:1fr}.expansion-case-grid{grid-template-columns:1fr}.terminal-window{min-height:520px}.expansion-system-root{padding:16px}}
`;
