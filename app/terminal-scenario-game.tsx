"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, CircleHelp, Send, Sparkles, TerminalSquare } from "lucide-react";
import type { ScenarioRun } from "@/lib/scenarioData";
import { createTerminalAssistantRequest, createTerminalSession, evaluateTerminalCase, executeTerminalCommand } from "@/lib/terminalEngine";
import { terminalScenarioCases } from "@/lib/terminalScenarioData";
import { terminalAssistantPolicy } from "@/lib/terminalScenarioData";
import type { TerminalAssistantRequest, TerminalAssistantResponse, TerminalAssistantTurn } from "@/lib/terminalScenarioData";

type Props = {
  initialCaseId?: string;
  runs: readonly ScenarioRun[];
  onStartAttempt?: (caseId: string) => boolean;
  onComplete: (run: ScenarioRun) => void;
  onExit: () => void;
  onAskAssistant?: (request: TerminalAssistantRequest) => Promise<TerminalAssistantResponse | null>;
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
  const terminalHistoryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (claimed.current) return;
    claimed.current = true;
    onStartAttempt?.(scenario.id);
  }, [onStartAttempt, scenario.id]);
  const [session, setSession] = useState(() => createTerminalSession(scenario));
  const [command, setCommand] = useState("");
  const [lastOutput, setLastOutput] = useState(scenario.openingMessage);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantConversation, setAssistantConversation] = useState<TerminalAssistantTurn[]>([]);
  const [assistantFeedback, setAssistantFeedback] = useState<TerminalAssistantResponse | null>(null);
  const [assistantCompletedStageIds, setAssistantCompletedStageIds] = useState<string[]>([]);
  const [assistantNotice, setAssistantNotice] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const progress = evaluateTerminalCase(scenario, session, assistantCompletedStageIds);
  useEffect(() => {
    const history = terminalHistoryRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [session.history.length, session.screenHistoryStart]);

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
    onComplete({ id: runId(), kind: "terminal", caseId: scenario.id, title: scenario.title, level: scenario.level === "A2+" ? "A2" : scenario.level, startedAt: startedAt.current, endedAt, success: true, score: 420, maxScore: 420, path: session.history.map((record) => record.line), decisions: [], metadata: { pathLevel: scenario.pathLevel, commands: session.history.length, kronerReward: scenario.rewardKroner, aiVerifiedStages: assistantCompletedStageIds } });
    setSubmitted(true);
  }

  async function askAssistant() {
    const prepared = createTerminalAssistantRequest(session, assistantPrompt, assistantConversation, assistantCompletedStageIds);
    if (!prepared.accepted) {
      setAssistantNotice(prepared.reason);
      return;
    }
    if (!onAskAssistant) {
      setAssistantNotice("AI-forbindelsen er ikke tilgængelig. Brug help eller man; missionen er ikke blokeret.");
      return;
    }
    const learnerTurn: TerminalAssistantTurn = { role: "learner", content: prepared.request.prompt };
    setAssistantNotice("");
    setAssistantLoading(true);
    try {
      const reply = await onAskAssistant(prepared.request);
      if (!reply) {
        setAssistantNotice("AI-forbindelsen er midlertidigt utilgængelig. Missionen fortsætter uden den.");
        return;
      }
      if (reply.inputLanguage === "other") {
        setAssistantNotice(reply.answer);
        setAssistantFeedback(null);
        return;
      }
      const assistantContent = reply.stageComplete && reply.stageEvidence
        ? `${reply.answer}\n\n✓ Etape godkendt: ${reply.stageEvidence}`
        : reply.answer;
      setAssistantConversation((old) => [...old, learnerTurn, { role: "assistant", content: assistantContent }]);
      if (reply.stageComplete && prepared.request.stage) {
        setAssistantCompletedStageIds((old) => old.includes(prepared.request.stage!.id)
          ? old
          : [...old, prepared.request.stage!.id]);
      }
      setAssistantFeedback(reply);
      setAssistantPrompt("");
    } catch {
      setAssistantNotice("AI-assistenten kunne ikke svare. Missionen fortsætter uden den.");
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <main className="expansion-system-root terminal-runner">
      <style>{css}</style>
      <header className="expansion-system-header">
        <button onClick={onBack}><ArrowLeft size={19} /></button>
        <div><span>{scenario.location} · {scenario.level}</span><h1>{scenario.title}</h1><p>{scenario.objective}</p></div>
      </header>
      <div className="terminal-layout">
        <aside className="terminal-brief">
          <section><span>MISSION</span><p>{scenario.openingMessage}</p></section>
          <ol>{scenario.stages.map((stage, index) => {
            const state = progress.stages[index];
            const aiVerified = assistantCompletedStageIds.includes(stage.id);
            return <li className={state.complete ? "done" : ""} key={stage.id}><b>{state.complete ? <Check size={14} /> : index + 1}</b><div><strong>{stage.title}</strong><p>{stage.instruction}</p><small>{state.metRequirements}/{state.totalRequirements} krav{aiVerified ? " · AI-verificeret" : ""}</small></div></li>;
          })}</ol>
        </aside>
        <section className="terminal-window">
          <div className="terminal-title"><i /><i /><i /><span>ordhavn@værft:{session.cwd}</span></div>
          <div className="terminal-history" ref={terminalHistoryRef}>{session.history.slice(session.screenHistoryStart).map((record, index) => <div key={`${record.line}-${index}`}><b>{record.cwd} $ {record.line}</b>{record.stdout && <pre>{record.stdout}</pre>}{record.stderr && <pre className="terminal-error">{record.stderr}</pre>}</div>)}{!session.history.length && <p>{lastOutput}</p>}</div>
          <form onSubmit={(event) => { event.preventDefault(); execute(); }}><span>{session.cwd} $</span><input autoFocus value={command} onChange={(event) => setCommand(event.target.value)} spellCheck={false} aria-label="Terminalkommando" /><button>Udfør</button></form>
          <footer><span>{progress.completedStages}/{progress.totalStages} etaper</span><button disabled={!progress.complete || submitted} onClick={finish}>{submitted ? "Registreret" : "Aflever spor"}</button></footer>
        </section>
      </div>
      <section className="terminal-coach" aria-label="Terminalcoach">
        <header>
          <span><CircleHelp size={20} /></span>
          <div><small>LINUX + DANSK</small><h2>Terminalcoach</h2><p>Assistenten læser hele terminalhistorikken og husker jeres samtale, men afslører ikke resten af løsningen.</p></div>
        </header>
        <div className="terminal-coach-grid">
          <div className="terminal-chat-panel">
            <div className="terminal-chat-history" aria-live="polite">
              {assistantConversation.length === 0 && <div className="terminal-chat-empty"><Sparkles size={19} /><p>Spørg om det, du faktisk ser i terminalen. Coachens svar tager højde for alle kommandoer, stdout, stderr og exitkoder.</p></div>}
              {assistantConversation.map((turn, index) => <article className={turn.role} key={`${turn.role}-${index}`}><span>{turn.role === "learner" ? "DIG" : "COACH"}</span><p>{turn.content}</p></article>)}
              {assistantLoading && <article className="assistant loading"><span>COACH</span><p>Jeg læser terminalsporet …</p></article>}
              {assistantNotice && <p className="terminal-coach-notice">{assistantNotice}</p>}
            </div>
            <form className="terminal-coach-input" onSubmit={(event) => { event.preventDefault(); void askAssistant(); }}>
              <textarea
                value={assistantPrompt}
                maxLength={terminalAssistantPolicy.maxPromptCharacters}
                onChange={(event) => setAssistantPrompt(event.target.value)}
                onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void askAssistant(); } }}
                placeholder="Beskriv, hvad du prøvede, og hvad terminalen viste …"
                aria-label="Spørg Terminalcoach på dansk"
              />
              <footer><span>{assistantPrompt.length}/{terminalAssistantPolicy.maxPromptCharacters} · Ctrl + Enter sender</span><button disabled={assistantLoading || !assistantPrompt.trim()}>{assistantLoading ? "Læser …" : <>Send <Send size={16} /></>}</button></footer>
            </form>
          </div>
          <aside className="terminal-language-panel">
            <div><Sparkles size={17} /><span><small>DANSK FEEDBACK</small><strong>Din seneste besked</strong></span></div>
            {!assistantFeedback && <p className="terminal-language-empty">Når coachen svarer, vises en naturlig rettelse og de vigtigste sproglige fejl her. Kommandoer og filstier bliver ikke rettet.</p>}
            {assistantFeedback && <>
              <section><small>NATURLIG VERSION</small><p>{assistantFeedback.correctedPrompt || "Din formulering krævede ingen tydelig rettelse."}</p></section>
              <div className="terminal-language-issues">
                {assistantFeedback.languageIssues.length === 0 && <p className="terminal-language-ok"><Check size={15} /> Ingen tydelige fejl i almindelig dansk.</p>}
                {assistantFeedback.languageIssues.map((issue, index) => <article key={`${issue.original}-${index}`}><del>{issue.original}</del><strong>{issue.correction}</strong><p>{issue.explanation}</p></article>)}
              </div>
              {assistantFeedback.model && <small className="terminal-model">Vurderet med {assistantFeedback.model}</small>}
            </>}
          </aside>
        </div>
      </section>
    </main>
  );
}

const css = `
.expansion-system-root{min-height:100%;padding:28px;background:radial-gradient(circle at 80% 0,rgba(91,199,177,.11),transparent 34%),var(--paper);color:var(--ink)}
.expansion-system-header{display:flex;gap:16px;align-items:center;max-width:1200px;margin:0 auto 24px}.expansion-system-header>button{width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:var(--surface);color:var(--ink)}.expansion-system-header span{font-size:9px;letter-spacing:.12em;color:#54bda8;font-weight:800}.expansion-system-header h1{margin:4px 0;font-size:30px}.expansion-system-header p{margin:0;color:var(--muted);font-size:12px}
.expansion-case-grid{max-width:1200px;margin:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.expansion-case-grid>button{text-align:left;min-height:220px;padding:25px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(135deg,var(--surface),color-mix(in srgb,#54bda8 7%,var(--surface)));color:var(--ink)}.expansion-case-grid>button>svg{color:#54bda8}.expansion-case-grid span{display:block;margin:18px 0 5px;font-size:8px;letter-spacing:.1em;color:#54bda8}.expansion-case-grid h2{margin:0 0 9px}.expansion-case-grid p{color:var(--muted);font-size:11px;line-height:1.55}.expansion-case-grid footer{display:flex;align-items:center;gap:6px;margin-top:18px;font-weight:750;font-size:10px}
.terminal-layout{max-width:1300px;margin:auto;display:grid;grid-template-columns:340px minmax(0,1fr);gap:18px}.terminal-brief{display:grid;gap:14px;align-content:start}.terminal-brief>section,.terminal-brief>ol{margin:0;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}.terminal-brief>section span{font-size:8px;color:#54bda8;font-weight:800}.terminal-brief p{font-size:10px;line-height:1.55;color:var(--muted)}.terminal-brief ol{list-style:none;display:grid;gap:12px}.terminal-brief li{display:grid;grid-template-columns:24px 1fr;gap:10px}.terminal-brief li>b{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;background:#3a3748;font-size:9px}.terminal-brief li.done>b{background:#245f53;color:#76dbc5}.terminal-brief li strong{font-size:11px}.terminal-brief li p{margin:3px 0}.terminal-brief li small{font-size:8px;color:#54bda8}
.terminal-window{height:clamp(560px,70vh,720px);min-height:0;display:grid;grid-template-rows:44px minmax(0,1fr) 58px 54px;border:1px solid #34413e;border-radius:17px;overflow:hidden;background:#0e1514;color:#d4e8e3;box-shadow:0 24px 70px rgba(0,0,0,.25)}.terminal-title{display:flex;align-items:center;gap:7px;padding:0 15px;background:#18221f}.terminal-title i{width:10px;height:10px;border-radius:50%;background:#e87565}.terminal-title i:nth-child(2){background:#e5b455}.terminal-title i:nth-child(3){background:#55b996}.terminal-title span{margin-left:8px;color:#78938c;font-size:10px}.terminal-history{min-height:0;overflow-y:scroll;overflow-x:auto;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:#4f6d65 #15201d;overscroll-behavior:contain;padding:18px;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.terminal-history::-webkit-scrollbar{width:11px;height:11px}.terminal-history::-webkit-scrollbar-track{background:#15201d}.terminal-history::-webkit-scrollbar-thumb{border:3px solid #15201d;border-radius:999px;background:#4f6d65}.terminal-history::-webkit-scrollbar-thumb:hover{background:#69a294}.terminal-history div{margin-bottom:12px}.terminal-history b{color:#6fd4bc}.terminal-history pre{margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}.terminal-error{color:#ef8e83}.terminal-window form{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:9px 13px;border-top:1px solid #283632}.terminal-window form span{color:#6fd4bc;font:11px ui-monospace}.terminal-window input{height:38px;border:0;outline:0;background:transparent;color:white;font:13px ui-monospace}.terminal-window form button,.terminal-window>footer button{padding:9px 13px;border:0;border-radius:8px;background:#55c4ac;color:#0f241f;font-weight:800}.terminal-window>footer{display:flex;justify-content:space-between;align-items:center;padding:0 14px;border-top:1px solid #283632;color:#78938c;font-size:9px}.terminal-window>footer button:disabled{opacity:.35}
.terminal-coach{max-width:1300px;margin:20px auto 0;border:1px solid #34413e;border-radius:20px;overflow:hidden;background:linear-gradient(145deg,#111918,#151d1b);color:#d9ebe6;box-shadow:0 24px 70px rgba(0,0,0,.18)}.terminal-coach>header{min-height:82px;padding:17px 21px;display:flex;align-items:center;gap:13px;border-bottom:1px solid #2a3935;background:#17211f}.terminal-coach>header>span{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#21483f;color:#79dbc4}.terminal-coach>header small,.terminal-language-panel small{font-size:8px;letter-spacing:.12em;color:#63cdb5;font-weight:850}.terminal-coach>header h2{font-size:18px;margin:3px 0}.terminal-coach>header p{font-size:10px;color:#87a099;margin:0}.terminal-coach-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,.75fr);min-height:480px}.terminal-chat-panel{min-width:0;display:grid;grid-template-rows:minmax(260px,1fr) auto;border-right:1px solid #2a3935}.terminal-chat-history{max-height:540px;overflow:auto;padding:22px;display:flex;flex-direction:column;gap:13px}.terminal-chat-empty{margin:auto;max-width:520px;text-align:center;color:#78928b}.terminal-chat-empty svg{color:#63cdb5}.terminal-chat-empty p{font-size:11px;line-height:1.65}.terminal-chat-history article{max-width:82%;padding:13px 15px;border-radius:14px}.terminal-chat-history article span{display:block;margin-bottom:6px;font-size:8px;font-weight:850;letter-spacing:.1em}.terminal-chat-history article p{margin:0;white-space:pre-wrap;font-size:12px;line-height:1.62}.terminal-chat-history article.learner{align-self:flex-end;background:#3a3159;border:1px solid #5b4d85}.terminal-chat-history article.learner span{color:#c5b9f2}.terminal-chat-history article.assistant{align-self:flex-start;background:#1c2a27;border:1px solid #30443f}.terminal-chat-history article.assistant span{color:#65cdb5}.terminal-chat-history article.loading{opacity:.68}.terminal-coach-notice{margin:0;padding:11px 13px;border-radius:11px;background:#392c2b;color:#efb1a7;font-size:10px}.terminal-coach-input{padding:15px;border-top:1px solid #2a3935;background:#121a18}.terminal-coach-input textarea{width:100%;min-height:120px;resize:vertical;padding:13px;border:1px solid #344944;border-radius:12px;outline:0;background:#0d1413;color:#e1efeb;font:12px/1.55 inherit}.terminal-coach-input textarea:focus{border-color:#58bea7;box-shadow:0 0 0 3px rgba(88,190,167,.12)}.terminal-coach-input footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}.terminal-coach-input footer span{font-size:8px;color:#718982}.terminal-coach-input button{display:flex;align-items:center;gap:7px;padding:10px 15px;border:0;border-radius:10px;background:#59c5ad;color:#0d211d;font-weight:850}.terminal-coach-input button:disabled{opacity:.38}.terminal-language-panel{padding:20px;background:#121917}.terminal-language-panel>div:first-child{display:flex;align-items:center;gap:10px;margin-bottom:18px;color:#63cdb5}.terminal-language-panel>div:first-child span{display:grid;gap:3px}.terminal-language-panel>div:first-child strong{font-size:12px;color:#d9ebe6}.terminal-language-empty{font-size:10px;line-height:1.65;color:#7f9790}.terminal-language-panel>section{padding:13px;border:1px solid #30433e;border-radius:12px;background:#19221f}.terminal-language-panel>section p{margin:7px 0 0;white-space:pre-wrap;font-size:10px;line-height:1.55;color:#bfd1cc}.terminal-language-issues{display:grid;gap:10px;margin-top:13px}.terminal-language-issues article{padding:12px;border-left:2px solid #d5a55b;border-radius:8px;background:#1a211e}.terminal-language-issues del{display:block;font-size:9px;color:#d58f85}.terminal-language-issues strong{display:block;margin:4px 0;color:#78d7c1;font-size:10px}.terminal-language-issues article p{margin:0;font-size:9px;line-height:1.5;color:#8fa59f}.terminal-language-ok{display:flex;align-items:center;gap:7px;color:#6ed0b9;font-size:10px}.terminal-model{display:block;margin-top:16px;color:#657c76!important}.terminal-runner button{cursor:pointer}.terminal-runner button:disabled{cursor:not-allowed}
@media(max-width:900px){.terminal-layout,.terminal-coach-grid{grid-template-columns:1fr}.terminal-chat-panel{border-right:0;border-bottom:1px solid #2a3935}.expansion-case-grid{grid-template-columns:1fr}.terminal-window{height:560px;min-height:0}.expansion-system-root{padding:16px}.terminal-coach-input footer{align-items:flex-end}.terminal-chat-history article{max-width:94%}}
`;
