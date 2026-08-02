"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Database,
  FileSearch,
  FileText,
  Fingerprint,
  GitBranch,
  Link2,
  Scale,
  ShieldCheck,
  UserRoundSearch,
  UsersRound,
  X,
} from "lucide-react";
import type { ScenarioRun } from "@/lib/scenarioData";
import {
  buildEvidenceGraph,
  evaluateDetectiveSelection,
  getArchiveEntry,
  type DetectiveEvaluation,
} from "@/lib/detectiveEngine";
import {
  detectiveCaseCards,
  detectiveCases,
  type ArchiveEvidence,
  type DetectiveCase,
} from "@/lib/detectiveScenarioData";

type ArchiveTab = "people" | "timeline" | "documents" | "data";

export interface DetectiveScenarioGameProps {
  initialCaseId?: string;
  runs: readonly ScenarioRun[];
  onStartAttempt?: (caseId: string) => boolean;
  onComplete: (run: ScenarioRun) => void;
  onExit: () => void;
}

const tabs: Array<{ id: ArchiveTab; label: string; icon: typeof UsersRound }> = [
  { id: "people", label: "Personer", icon: UsersRound },
  { id: "timeline", label: "Tidslinje", icon: Clock3 },
  { id: "documents", label: "Dokumenter", icon: FileText },
  { id: "data", label: "Data", icon: Database },
];

function runId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `detective-${Date.now()}`;
}

export default function DetectiveScenarioGame({
  initialCaseId,
  runs,
  onStartAttempt,
  onComplete,
  onExit,
}: DetectiveScenarioGameProps) {
  const [activeId, setActiveId] = useState<string | null>(initialCaseId ?? null);
  const solved = useMemo(
    () => new Set(runs.filter((run) => run.kind === "detective" && run.success).map((run) => run.caseId)),
    [runs],
  );

  if (!activeId) {
    return (
      <main className="detective-root">
        <style>{css}</style>
        <header className="detective-header">
          <button onClick={onExit} aria-label="Tilbage"><ArrowLeft size={19} /></button>
          <div>
            <span>FRIT ARKIV · INGEN GÆTTE-MASKINE</span>
            <h1>Sporrummet</h1>
            <p>Læs i din egen rækkefølge, forbind kilderne og anklag først, når beviskæden holder.</p>
          </div>
        </header>
        <section className="detective-catalog">
          {detectiveCaseCards.map((card) => (
            <button key={card.id} onClick={() => setActiveId(card.id)}>
              <div className="detective-card-icon"><Fingerprint size={27} /></div>
              <span>NIVEAU {card.pathLevel} · {card.level}</span>
              <h2>{card.title}</h2>
              <small>{card.englishTitle}</small>
              <p>{card.description}</p>
              <footer>
                {solved.has(card.id)
                  ? <><Check size={15} /> Opklaret</>
                  : <>Åbn arkiv <ChevronRight size={15} /></>}
              </footer>
            </button>
          ))}
        </section>
      </main>
    );
  }

  const scenario = detectiveCases.find(({ id }) => id === activeId);
  if (!scenario) return null;
  return (
    <DetectiveRunner
      scenario={scenario}
      onStartAttempt={onStartAttempt}
      onComplete={onComplete}
      onBack={() => initialCaseId ? onExit() : setActiveId(null)}
    />
  );
}

function DetectiveRunner({
  scenario,
  onStartAttempt,
  onComplete,
  onBack,
}: {
  scenario: DetectiveCase;
  onStartAttempt?: (caseId: string) => boolean;
  onComplete: (run: ScenarioRun) => void;
  onBack: () => void;
}) {
  const startedAt = useRef(new Date().toISOString());
  const attemptStarted = useRef(false);
  const [activeTab, setActiveTab] = useState<ArchiveTab>("people");
  const [suspectId, setSuspectId] = useState("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<DetectiveEvaluation | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showGraph, setShowGraph] = useState(true);

  useEffect(() => {
    if (attemptStarted.current) return;
    attemptStarted.current = true;
    onStartAttempt?.(scenario.id);
  }, [onStartAttempt, scenario.id]);

  function chooseSuspect(id: string) {
    setSuspectId(id);
    setEvaluation(null);
    setSubmitted(false);
  }

  function toggleEvidence(id: string) {
    setEvidenceIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setEvaluation(null);
    setSubmitted(false);
  }

  function checkCase() {
    if (!suspectId || evidenceIds.length === 0) return;
    setEvaluation(evaluateDetectiveSelection(scenario, { suspectId, evidenceIds }));
  }

  function registerCase() {
    if (!evaluation?.success || submitted) return;
    const endedAt = new Date().toISOString();
    onComplete({
      id: runId(),
      kind: "detective",
      caseId: scenario.id,
      title: scenario.title,
      level: scenario.level === "A2+" ? "A2" : scenario.level === "B1+" ? "B1" : scenario.level,
      startedAt: startedAt.current,
      endedAt,
      success: true,
      score: Math.round(evaluation.score * 500),
      maxScore: 500,
      path: evaluation.selectedEvidenceIds,
      decisions: [{
        stepId: "most-suspicious",
        answerId: suspectId,
        answerText: scenario.people.find(({ id }) => id === suspectId)?.name ?? suspectId,
        correct: evaluation.correctSuspect,
      }],
      metadata: {
        pathLevel: scenario.pathLevel,
        crime: scenario.crime,
        localScore: evaluation.score,
        evidenceCount: evaluation.selectedEvidenceIds.length,
        contradictions: evaluation.provenContradictionIds,
      },
    });
    setSubmitted(true);
  }

  return (
    <main className="detective-root detective-runner">
      <style>{css}</style>
      <header className="detective-header">
        <button onClick={onBack} aria-label="Tilbage til sagsarkivet"><ArrowLeft size={19} /></button>
        <div>
          <span>{scenario.eyebrow} · {scenario.level}</span>
          <h1>{scenario.title}</h1>
          <p>{scenario.brief}</p>
        </div>
      </header>

      <section className="detective-objective">
        <ShieldCheck size={22} />
        <div><span>DIN OPGAVE</span><p>{scenario.objective}</p><small>{scenario.victimCare}</small></div>
      </section>

      <div className="detective-layout">
        <section className="archive-window">
          <nav className="archive-tabs" role="tablist" aria-label="Sagsarkiv">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === "people" ? scenario.people.length
                : tab.id === "timeline" ? scenario.timeline.length
                  : tab.id === "documents" ? scenario.documents.length
                    : scenario.data.length;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={activeTab === tab.id ? "active" : ""}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={15} /> {tab.label} <b>{count}</b>
                </button>
              );
            })}
          </nav>
          <div className="archive-content" role="tabpanel">
            {activeTab === "people" && (
              <div className="people-grid">
                {scenario.people.map((person) => {
                  const linked = scenario.evidence.filter((evidence) => evidence.implicates.includes(person.id) || evidence.exonerates.includes(person.id));
                  return (
                    <article className={suspectId === person.id ? "selected" : ""} key={person.id}>
                      <header><div><UserRoundSearch size={20} /></div><span>{person.role}</span></header>
                      <h2>{person.name}</h2>
                      <small>{person.relation}</small>
                      <blockquote>“{person.statement}”</blockquote>
                      <details><summary>Tid og adgang</summary><p><b>Påstået tid:</b> {person.claimedTimeline.join(" · ")}</p><p><b>Adgang:</b> {person.access.join(" · ")}</p></details>
                      <footer><span><Link2 size={12} /> {linked.length} forbundne spor</span><button onClick={() => chooseSuspect(person.id)}>{suspectId === person.id ? <><Check size={13} /> Valgt</> : "Markér mistænkt"}</button></footer>
                    </article>
                  );
                })}
              </div>
            )}
            {activeTab === "timeline" && (
              <div className="timeline-list">
                {scenario.timeline.map((event) => (
                  <article key={event.id}>
                    <time>{event.time}</time><i /><div><span>{event.title}</span><p>{event.description}</p><SourceLinks scenario={scenario} sourceIds={event.sourceIds} /></div>
                  </article>
                ))}
              </div>
            )}
            {activeTab === "documents" && (
              <div className="document-grid">
                {scenario.documents.map((document) => (
                  <article key={document.id}>
                    <header><FileSearch size={18} /><span>{document.kind} · {document.source}</span></header>
                    <h2>{document.title}</h2><p>{document.summary}</p><blockquote>{document.excerpt}</blockquote>
                    <EvidenceLinks scenario={scenario} evidenceIds={document.evidenceIds} selected={evidenceIds} onToggle={toggleEvidence} />
                  </article>
                ))}
              </div>
            )}
            {activeTab === "data" && (
              <div className="data-grid">
                {scenario.data.map((datum) => (
                  <article key={datum.id}>
                    <Database size={20} /><span>{datum.label}</span><strong>{datum.value}</strong><p>{datum.interpretation}</p>
                    <EvidenceLinks scenario={scenario} evidenceIds={datum.evidenceIds} selected={evidenceIds} onToggle={toggleEvidence} />
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="detective-board">
          <header><div><Scale size={19} /></div><span>DIN HYPOTESE</span><button onClick={() => setShowGraph((current) => !current)}>{showGraph ? "Skjul net" : "Vis net"}</button></header>
          <section className="suspect-slot">
            <small>MEST MISTÆNKELIG</small>
            {suspectId
              ? <div><UserRoundSearch size={17} /><strong>{scenario.people.find(({ id }) => id === suspectId)?.name}</strong><button onClick={() => chooseSuspect("")} aria-label="Fjern mistænkt"><X size={15} /></button></div>
              : <p>Vælg en person i arkivet.</p>}
          </section>
          <section className="evidence-tray">
            <div><small>VALGTE BEVISER</small><b>{evidenceIds.length}</b></div>
            {evidenceIds.length === 0 && <p>Åbn dokumenter og data, eller vælg spor direkte i nettet.</p>}
            {evidenceIds.map((id) => {
              const evidence = getArchiveEntry(scenario, "evidence", id);
              return evidence && <button key={id} onClick={() => toggleEvidence(id)}><Fingerprint size={13} /><span>{evidence.title}</span><X size={12} /></button>;
            })}
          </section>
          {showGraph && <EvidenceGraph scenario={scenario} selected={evidenceIds} onToggle={toggleEvidence} />}
          {evaluation && (
            <section className={`detective-result ${evaluation.success ? "success" : "failure"}`}>
              <span>{evaluation.verdict}</span><p>{evaluation.feedback}</p>
              <div><b>{Math.round(evaluation.evidenceCoverage * 100)}%</b> af kernesporene <b>{evaluation.provenContradictionIds.length}</b> forklarede modstrid{evaluation.provenContradictionIds.length === 1 ? "" : "er"}</div>
            </section>
          )}
          <footer>
            <button disabled={!suspectId || evidenceIds.length === 0} onClick={evaluation?.success ? registerCase : checkCase}>
              {submitted ? <><Check size={15} /> Arkiveret</> : evaluation?.success ? "Luk sagen" : "Prøv beviskæden"}
            </button>
          </footer>
        </aside>
      </div>
    </main>
  );
}

function SourceLinks({ scenario, sourceIds }: { scenario: DetectiveCase; sourceIds: readonly string[] }) {
  return <div className="source-links">{sourceIds.map((id) => {
    const entry = getArchiveEntry(scenario, "document", id) ?? getArchiveEntry(scenario, "datum", id);
    return <span key={id}><Link2 size={10} />{entry && "title" in entry ? entry.title : entry?.label ?? id}</span>;
  })}</div>;
}

function EvidenceLinks({ scenario, evidenceIds, selected, onToggle }: { scenario: DetectiveCase; evidenceIds: readonly string[]; selected: readonly string[]; onToggle: (id: string) => void }) {
  return <div className="evidence-links">{evidenceIds.map((id) => {
    const evidence = getArchiveEntry(scenario, "evidence", id);
    if (!evidence) return null;
    return <button className={selected.includes(id) ? "selected" : ""} key={id} onClick={() => onToggle(id)}><Fingerprint size={11} />{evidence.title}</button>;
  })}</div>;
}

function EvidenceGraph({ scenario, selected, onToggle }: { scenario: DetectiveCase; selected: readonly string[]; onToggle: (id: string) => void }) {
  const graph = useMemo(() => buildEvidenceGraph(scenario), [scenario]);
  const connectedContradictions = scenario.contradictions.map((contradiction) => ({
    ...contradiction,
    proven: selected.includes(contradiction.leftEvidenceId) && selected.includes(contradiction.rightEvidenceId),
  }));
  return (
    <section className="evidence-graph">
      <header><GitBranch size={14} /><span>BEVISNET</span><b>{graph.edges.length} forbindelser</b></header>
      <div className="graph-list">
        {scenario.evidence.map((evidence) => <EvidenceGraphRow key={evidence.id} scenario={scenario} evidence={evidence} selected={selected.includes(evidence.id)} onToggle={onToggle} />)}
      </div>
      <div className="contradiction-list">
        {connectedContradictions.map((contradiction) => (
          <div className={contradiction.proven ? "proven" : ""} key={contradiction.id}>
            <i /><span>{contradiction.title}</span><small>{contradiction.proven ? "FORBUNDET" : "KRÆVER TO SPOR"}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidenceGraphRow({ scenario, evidence, selected, onToggle }: { scenario: DetectiveCase; evidence: ArchiveEvidence; selected: boolean; onToggle: (id: string) => void }) {
  const sourceLabels = evidence.sourceIds.map((id) => {
    const document = getArchiveEntry(scenario, "document", id);
    const datum = getArchiveEntry(scenario, "datum", id);
    const event = getArchiveEntry(scenario, "timeline", id);
    return document?.title ?? datum?.label ?? event?.title ?? id;
  });
  const implicated = evidence.implicates.map((id) => scenario.people.find((person) => person.id === id)?.name ?? id);
  const exonerated = evidence.exonerates.map((id) => scenario.people.find((person) => person.id === id)?.name ?? id);
  return (
    <button className={selected ? "selected" : ""} onClick={() => onToggle(evidence.id)}>
      <div className="graph-sources">{sourceLabels.map((label) => <small key={label}>{label}</small>)}</div>
      <i className="graph-line" />
      <div className="graph-evidence"><Fingerprint size={12} /><span>{evidence.title}</span><b>{evidence.strength}/3</b></div>
      <i className="graph-line" />
      <div className="graph-people">{implicated.map((name) => <small className="implicates" key={`i-${name}`}>+ {name}</small>)}{exonerated.map((name) => <small className="exonerates" key={`e-${name}`}>− {name}</small>)}</div>
    </button>
  );
}

const css = `
.detective-root{--detective:#d4a85d;min-height:100%;padding:27px;background:radial-gradient(circle at 88% 2%,rgba(212,168,93,.12),transparent 34%),var(--paper);color:var(--ink)}
.detective-header{max-width:1400px;margin:0 auto 22px;display:flex;align-items:center;gap:16px}.detective-header>button{width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:var(--surface);color:var(--ink)}.detective-header span{font-size:8px;font-weight:900;letter-spacing:.14em;color:var(--detective)}.detective-header h1{margin:4px 0;font-size:31px}.detective-header p{max-width:920px;margin:0;color:var(--muted);font-size:11px;line-height:1.5}
.detective-catalog{max-width:1200px;margin:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.detective-catalog>button{text-align:left;min-height:250px;padding:25px;border:1px solid var(--line);border-radius:21px;background:linear-gradient(135deg,var(--surface),color-mix(in srgb,var(--detective) 7%,var(--surface)));color:var(--ink)}.detective-card-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:color-mix(in srgb,var(--detective) 14%,var(--surface));color:var(--detective)}.detective-catalog>button>span{display:block;margin:17px 0 5px;color:var(--detective);font-size:8px;font-weight:850;letter-spacing:.11em}.detective-catalog h2{margin:0}.detective-catalog small{color:var(--muted);font-size:9px}.detective-catalog p{color:var(--muted);font-size:10px;line-height:1.55}.detective-catalog footer{display:flex;align-items:center;gap:6px;margin-top:16px;color:var(--detective);font-size:10px;font-weight:850}
.detective-objective{max-width:1400px;margin:0 auto 16px;padding:16px 18px;display:grid;grid-template-columns:30px 1fr;gap:12px;border:1px solid color-mix(in srgb,var(--detective) 35%,var(--line));border-radius:15px;background:color-mix(in srgb,var(--detective) 7%,var(--surface))}.detective-objective>svg{color:var(--detective)}.detective-objective span{font-size:8px;color:var(--detective);font-weight:900;letter-spacing:.12em}.detective-objective p{margin:4px 0;color:var(--ink);font-size:11px;font-weight:700}.detective-objective small{color:var(--muted);font-size:9px;line-height:1.45}
.detective-layout{max-width:1400px;margin:auto;display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:16px;align-items:start}.archive-window,.detective-board{border:1px solid var(--line);border-radius:18px;background:var(--surface);overflow:hidden}.archive-tabs{display:flex;padding:10px;gap:7px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--paper) 70%,var(--surface))}.archive-tabs button{display:flex;align-items:center;gap:7px;padding:10px 12px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--muted);font-size:9px;font-weight:800}.archive-tabs button b{min-width:18px;padding:2px 5px;border-radius:9px;background:var(--surface)}.archive-tabs button.active{border-color:color-mix(in srgb,var(--detective) 45%,var(--line));background:color-mix(in srgb,var(--detective) 9%,var(--surface));color:var(--ink)}.archive-content{min-height:670px;max-height:calc(100vh - 245px);padding:18px;overflow:auto}
.people-grid,.document-grid,.data-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.people-grid article,.document-grid article,.data-grid article{padding:17px;border:1px solid var(--line);border-radius:14px;background:var(--paper)}.people-grid article.selected{border-color:var(--detective);box-shadow:inset 0 0 0 1px var(--detective)}.people-grid article>header{display:flex;align-items:center;gap:9px}.people-grid article>header>div{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:color-mix(in srgb,var(--detective) 12%,var(--surface));color:var(--detective)}.people-grid article>header span,.document-grid header span{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.08em}.people-grid h2,.document-grid h2{margin:12px 0 3px;font-size:17px}.people-grid>article>small{color:var(--muted);font-size:9px}.people-grid blockquote,.document-grid blockquote{margin:13px 0;padding:11px;border-left:2px solid var(--detective);background:var(--surface);color:var(--muted);font-size:9px;line-height:1.5}.people-grid details summary{cursor:pointer;color:var(--detective);font-size:9px;font-weight:800}.people-grid details p{color:var(--muted);font-size:9px;line-height:1.45}.people-grid article>footer{display:flex;justify-content:space-between;align-items:center;margin-top:14px}.people-grid footer>span{display:flex;gap:4px;color:var(--muted);font-size:8px}.people-grid footer button{display:flex;align-items:center;gap:4px;padding:7px 9px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font-size:8px;font-weight:800}.people-grid article.selected footer button{background:var(--detective);color:#2a2114}
.timeline-list{padding:4px 10px}.timeline-list article{display:grid;grid-template-columns:58px 14px 1fr;gap:12px;min-height:110px}.timeline-list time{padding-top:2px;color:var(--detective);font-size:11px;font-weight:900}.timeline-list article>i{position:relative;width:10px;height:10px;border:2px solid var(--detective);border-radius:50%}.timeline-list article>i:after{content:"";position:absolute;top:10px;left:2px;width:2px;height:94px;background:var(--line)}.timeline-list article:last-child>i:after{display:none}.timeline-list article>div>span{font-size:13px;font-weight:850}.timeline-list p{margin:5px 0;color:var(--muted);font-size:10px;line-height:1.5}.source-links{display:flex;flex-wrap:wrap;gap:5px}.source-links span{display:flex;align-items:center;gap:3px;padding:4px 6px;border-radius:6px;background:var(--paper);color:var(--muted);font-size:7px}
.document-grid header{display:flex;align-items:center;gap:7px;color:var(--detective)}.document-grid>article>p,.data-grid p{color:var(--muted);font-size:9px;line-height:1.5}.evidence-links{display:flex;flex-wrap:wrap;gap:5px}.evidence-links button{display:flex;align-items:center;gap:4px;padding:6px 7px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--muted);font-size:7px}.evidence-links button.selected{border-color:var(--detective);color:var(--detective)}.data-grid article>svg{color:var(--detective)}.data-grid article>span{display:block;margin:10px 0 3px;color:var(--muted);font-size:8px}.data-grid article>strong{font-size:16px}
.detective-board{position:sticky;top:14px;max-height:calc(100vh - 28px);overflow:auto}.detective-board>header{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:9px;padding:15px;border-bottom:1px solid var(--line)}.detective-board>header>div{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;background:color-mix(in srgb,var(--detective) 13%,var(--surface));color:var(--detective)}.detective-board>header>span{font-size:9px;font-weight:900;letter-spacing:.1em}.detective-board>header>button{border:0;background:transparent;color:var(--detective);font-size:8px}.suspect-slot,.evidence-tray{padding:14px;border-bottom:1px solid var(--line)}.suspect-slot>small,.evidence-tray small{color:var(--muted);font-size:7px;letter-spacing:.1em}.suspect-slot>div{display:grid;grid-template-columns:20px 1fr 24px;align-items:center;margin-top:8px;color:var(--detective)}.suspect-slot>div strong{color:var(--ink);font-size:11px}.suspect-slot>div button{border:0;background:transparent;color:var(--muted)}.suspect-slot>p,.evidence-tray>p{margin:7px 0;color:var(--muted);font-size:9px}.evidence-tray>div:first-child{display:flex;justify-content:space-between}.evidence-tray>div:first-child b{color:var(--detective)}.evidence-tray>button{width:100%;display:grid;grid-template-columns:17px 1fr 15px;align-items:center;text-align:left;gap:5px;margin-top:6px;padding:7px;border:1px solid var(--line);border-radius:7px;background:var(--paper);color:var(--muted);font-size:8px}.evidence-tray>button>svg:first-child{color:var(--detective)}
.evidence-graph{padding:14px;border-bottom:1px solid var(--line)}.evidence-graph>header{display:flex;align-items:center;gap:6px;color:var(--detective)}.evidence-graph>header span{font-size:8px;font-weight:900;letter-spacing:.1em}.evidence-graph>header b{margin-left:auto;color:var(--muted);font-size:7px}.graph-list{display:grid;gap:6px;margin-top:10px}.graph-list>button{width:100%;display:grid;grid-template-columns:minmax(0,.8fr) 12px minmax(0,1.2fr) 12px minmax(0,.8fr);align-items:center;gap:3px;padding:6px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--muted);text-align:left}.graph-list>button.selected{border-color:var(--detective);background:color-mix(in srgb,var(--detective) 7%,var(--paper))}.graph-sources,.graph-people{display:grid;gap:2px}.graph-sources small,.graph-people small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:6px}.graph-line{height:1px;background:var(--line)}.graph-evidence{display:grid;grid-template-columns:14px 1fr 20px;align-items:center;gap:3px;color:var(--ink)}.graph-evidence svg{color:var(--detective)}.graph-evidence span{font-size:7px;font-weight:800}.graph-evidence b{color:var(--detective);font-size:6px}.graph-people .implicates{color:#dc8e7e}.graph-people .exonerates{color:#70cdb9}.contradiction-list{display:grid;gap:4px;margin-top:9px}.contradiction-list>div{display:grid;grid-template-columns:7px 1fr auto;align-items:center;gap:5px;color:var(--muted)}.contradiction-list i{width:6px;height:6px;border-radius:50%;background:var(--line)}.contradiction-list span,.contradiction-list small{font-size:6px}.contradiction-list>div.proven{color:var(--detective)}.contradiction-list>div.proven i{background:var(--detective)}
.detective-result{margin:12px;padding:12px;border-radius:10px}.detective-result.success{background:#203b35;color:#77d6c1}.detective-result.failure{background:#3b2c2d;color:#eba49b}.detective-result>span{font-size:10px;font-weight:900;text-transform:uppercase}.detective-result p{font-size:8px;line-height:1.5}.detective-result>div{display:flex;gap:5px;color:var(--muted);font-size:7px}.detective-result>div b{color:inherit}.detective-board>footer{padding:14px}.detective-board>footer button{width:100%;display:flex;justify-content:center;align-items:center;gap:6px;padding:12px;border:0;border-radius:9px;background:var(--detective);color:#2b2111;font-size:10px;font-weight:900}.detective-board>footer button:disabled{opacity:.35}
@media(max-width:1100px){.detective-layout{grid-template-columns:1fr}.detective-board{position:static;max-height:none}.archive-content{max-height:none}.detective-catalog{grid-template-columns:1fr}}@media(max-width:700px){.detective-root{padding:15px}.people-grid,.document-grid,.data-grid{grid-template-columns:1fr}.archive-tabs{overflow:auto}.archive-tabs button{white-space:nowrap}.detective-header h1{font-size:25px}}
`;
