"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  cityScenarioCards,
  cityScenarioRegistry,
  createCityAttemptMetadata,
  evaluateCivicForm,
  evaluateRoute,
  formatCityTime,
  getCityCase,
  type CityAttemptMetadata,
  type CityCase,
  type CityCaseId,
  type CityScenarioId,
  type CivicFormCase,
  type FormEvaluation,
  type RouteCase,
  type RouteEvaluation,
} from "@/lib/cityScenarioData";

export interface CityScenarioRunnerProps {
  scenarioId: CityScenarioId;
  initialCaseId?: CityCaseId;
  startingAttemptNumber?: number;
  onExit: () => void;
  onStartAttempt?: (caseId: CityCaseId) => boolean;
  onAttempt?: (metadata: CityAttemptMetadata) => void;
  onComplete?: (metadata: CityAttemptMetadata) => void;
}

export interface CityScenarioHubProps {
  initialScenarioId?: CityScenarioId | null;
  initialCaseId?: CityCaseId;
  onExit: () => void;
  onStartAttempt?: (caseId: CityCaseId) => boolean;
  onAttempt?: (metadata: CityAttemptMetadata) => void;
  onComplete?: (metadata: CityAttemptMetadata) => void;
}

const caseStyle = (accent: string) => ({ "--city-accent": accent } as CSSProperties);

function EnglishSupport({ cityCase }: { cityCase: CityCase }) {
  return (
    <aside className="city-support" aria-label="English support">
      <details>
        <summary>English support</summary>
        <p>{cityCase.englishBrief}</p>
      </details>
      <div className="city-glossary">
        <span>MINI-GLOSSARY</span>
        {cityCase.glossary.map((entry) => (
          <article key={entry.danish}>
            <strong>{entry.danish}</strong>
            <b>{entry.english}</b>
            <small>{entry.note}</small>
          </article>
        ))}
      </div>
    </aside>
  );
}

function ResultPanel({
  evaluation,
  metadata,
}: {
  evaluation: FormEvaluation | RouteEvaluation;
  metadata: CityAttemptMetadata;
}) {
  return (
    <section className={`city-result ${evaluation.success ? "success" : "retry"}`} aria-live="polite">
      <header>
        <span>{evaluation.success ? "✓" : "↻"}</span>
        <div>
          <small>{evaluation.success ? "OPGAVEN ER LØST" : "PLANEN SKAL RETTES"}</small>
          <h3>{Math.round(evaluation.score * 100)} point</h3>
        </div>
        <strong>+{metadata.kronerEarned} kr.</strong>
      </header>
      <ul>
        {evaluation.feedback.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p>
        {metadata.firstAttemptSuccess
          ? "Første kontrol var korrekt: 1 rav er sikret."
          : metadata.firstAttemptEligible
            ? "Første kontrol gav ikke rav, men du kan stadig løse sagen."
            : "Dette er en ny kontrol; rav gives kun ved første forsøg."}
      </p>
    </section>
  );
}

function CivicFormGame({
  scenarioId,
  cityCase,
  startingAttemptNumber,
  claimFirstAttempt,
  onAttempt,
  onComplete,
}: {
  scenarioId: CityScenarioId;
  cityCase: CivicFormCase;
  startingAttemptNumber: number;
  claimFirstAttempt: () => boolean;
  onAttempt?: (metadata: CityAttemptMetadata) => void;
  onComplete?: (metadata: CityAttemptMetadata) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [calculation, setCalculation] = useState("");
  const [workflow, setWorkflow] = useState<string[]>([]);
  const [attemptNumber, setAttemptNumber] = useState(startingAttemptNumber);
  const [evaluation, setEvaluation] = useState<FormEvaluation | null>(null);
  const [metadata, setMetadata] = useState<CityAttemptMetadata | null>(null);

  const addStep = (id: string) => {
    if (!workflow.includes(id) && workflow.length < cityCase.workflowSolution.length) {
      setWorkflow((current) => [...current, id]);
      setEvaluation(null);
    }
  };

  const handleWorkflowKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = Number(event.key) - 1;
    if (index >= 0 && index < cityCase.workflowOptions.length) {
      event.preventDefault();
      addStep(cityCase.workflowOptions[index].id);
    }
  };

  const check = () => {
    if (evaluation?.success) return;
    const nextEvaluation = evaluateCivicForm(cityCase, {
      selections,
      calculation: calculation.trim() === "" ? null : Number(calculation),
      workflow,
    });
    const nextMetadata = createCityAttemptMetadata(scenarioId, cityCase, nextEvaluation, attemptNumber, claimFirstAttempt());
    setEvaluation(nextEvaluation);
    setMetadata(nextMetadata);
    onAttempt?.(nextMetadata);
    if (nextEvaluation.success) onComplete?.(nextMetadata);
    else setAttemptNumber((current) => current + 1);
  };

  return (
    <div className="city-two-column">
      <main className="city-main-panel">
        <section className="city-letter" aria-labelledby="city-letter-title">
          <header>
            <div><span>NY DIGITAL POST</span><h2 id="city-letter-title">{cityCase.document.title}</h2></div>
            <small>{cityCase.document.sender}</small>
          </header>
          <b>{cityCase.document.reference}</b>
          {cityCase.document.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <details>
            <summary>Read the letter in English</summary>
            <strong>{cityCase.document.englishTitle}</strong>
            {cityCase.document.englishParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </details>
        </section>

        <section className="city-form" aria-labelledby="city-form-title">
          <div className="city-section-title"><span>01</span><div><small>UDFYLD</small><h2 id="city-form-title">Den digitale blanket</h2></div></div>
          <div className="city-field-grid">
            {cityCase.fields.map((field) => (
              <label key={field.id}>
                <span>{field.label}</span>
                <small>{field.englishLabel}</small>
                <select
                  value={selections[field.id] ?? ""}
                  onChange={(event) => {
                    setSelections((current) => ({ ...current, [field.id]: event.target.value }));
                    setEvaluation(null);
                  }}
                >
                  <option value="">Vælg…</option>
                  {field.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <label className="city-calculation">
            <span>{cityCase.calculation.prompt}</span>
            <small>{cityCase.calculation.englishPrompt}</small>
            <div><input inputMode="numeric" value={calculation} onChange={(event) => { setCalculation(event.target.value); setEvaluation(null); }} aria-label="Beregnet beløb" /><b>{cityCase.calculation.unit}</b></div>
          </label>
        </section>

        <section className="city-workflow" aria-labelledby="city-workflow-title">
          <div className="city-section-title"><span>02</span><div><small>PLANLÆG</small><h2 id="city-workflow-title">Sikker rækkefølge</h2></div></div>
          <p>Tryk på handlingerne i rækkefølge. Tast 1–{cityCase.workflowOptions.length} virker også.</p>
          <div className="city-action-bank" tabIndex={0} onKeyDown={handleWorkflowKey} aria-label="Handlinger, brug tal for at vælge">
            {cityCase.workflowOptions.map((option, index) => (
              <button key={option.id} type="button" disabled={workflow.includes(option.id)} onClick={() => addStep(option.id)}>
                <i>{index + 1}</i><span>{option.label}<small>{option.englishLabel}</small></span>
              </button>
            ))}
          </div>
          <ol className="city-order-tray">
            {workflow.map((id, index) => {
              const option = cityCase.workflowOptions.find((candidate) => candidate.id === id);
              return <li key={id}><button type="button" onClick={() => { setWorkflow((current) => current.filter((step) => step !== id)); setEvaluation(null); }} aria-label={`Fjern trin ${index + 1}`}>{option?.label}<span>×</span></button></li>;
            })}
            {workflow.length === 0 && <li className="empty">Planen er tom. Vælg det første sikre trin.</li>}
          </ol>
        </section>

        <button className="city-check" type="button" onClick={check} disabled={evaluation?.success}>Kontrollér hele sagen <span>→</span></button>
        {evaluation && metadata && <ResultPanel evaluation={evaluation} metadata={metadata} />}
      </main>
      <EnglishSupport cityCase={cityCase} />
    </div>
  );
}

function RouteGame({
  scenarioId,
  cityCase,
  startingAttemptNumber,
  claimFirstAttempt,
  onAttempt,
  onComplete,
}: {
  scenarioId: CityScenarioId;
  cityCase: RouteCase;
  startingAttemptNumber: number;
  claimFirstAttempt: () => boolean;
  onAttempt?: (metadata: CityAttemptMetadata) => void;
  onComplete?: (metadata: CityAttemptMetadata) => void;
}) {
  const [route, setRoute] = useState<string[]>([]);
  const [ticketId, setTicketId] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(startingAttemptNumber);
  const [evaluation, setEvaluation] = useState<RouteEvaluation | null>(null);
  const [metadata, setMetadata] = useState<CityAttemptMetadata | null>(null);

  const addStop = (id: string) => {
    if (!route.includes(id) && route.length < cityCase.stops.length) {
      setRoute((current) => [...current, id]);
      setEvaluation(null);
    }
  };

  const handleStopKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = Number(event.key) - 1;
    if (index >= 0 && index < cityCase.stops.length) {
      event.preventDefault();
      addStop(cityCase.stops[index].id);
    }
  };

  const check = () => {
    if (evaluation?.success) return;
    const nextEvaluation = evaluateRoute(cityCase, route, ticketId);
    const nextMetadata = createCityAttemptMetadata(scenarioId, cityCase, nextEvaluation, attemptNumber, claimFirstAttempt());
    setEvaluation(nextEvaluation);
    setMetadata(nextMetadata);
    onAttempt?.(nextMetadata);
    if (nextEvaluation.success) onComplete?.(nextMetadata);
    else setAttemptNumber((current) => current + 1);
  };

  return (
    <div className="city-two-column">
      <main className="city-main-panel">
        <section className="city-dispatch" aria-labelledby="city-dispatch-title">
          <header><span>LIVE</span><div><small>BUDCENTRALEN MELDER</small><h2 id="city-dispatch-title">Dagens ændringer</h2></div></header>
          {cityCase.dispatch.map((line, index) => <p key={line}><b>{String(index + 1).padStart(2, "0")}</b>{line}</p>)}
          <details>
            <summary>Read dispatch in English</summary>
            {cityCase.englishDispatch.map((line) => <p key={line}>{line}</p>)}
          </details>
        </section>

        <section className="city-route-builder" aria-labelledby="city-route-title">
          <div className="city-section-title"><span>01</span><div><small>BYG RUTEN</small><h2 id="city-route-title">Tidsvinduer</h2></div></div>
          <p>Start: <strong>{cityCase.start.label}</strong> kl. {formatCityTime(cityCase.start.time)}. Brug tal 1–{cityCase.stops.length}, eller vælg med mus eller touch.</p>
          <div className="city-stop-bank" tabIndex={0} onKeyDown={handleStopKey} aria-label="Rutestop, brug tal for at vælge">
            {cityCase.stops.map((stop, index) => (
              <button key={stop.id} type="button" disabled={route.includes(stop.id)} onClick={() => addStop(stop.id)}>
                <i>{index + 1}</i>
                <strong>{stop.label}</strong>
                <span>{formatCityTime(stop.windowStart)}–{formatCityTime(stop.windowEnd)} · zone {stop.zone}</span>
                <small>{stop.task}</small>
              </button>
            ))}
          </div>
          <div className="city-route-line" aria-live="polite">
            <span className="start">{cityCase.start.label}<small>{formatCityTime(cityCase.start.time)}</small></span>
            {route.map((id, index) => {
              const stop = cityCase.stops.find((candidate) => candidate.id === id);
              return <button key={id} type="button" onClick={() => { setRoute((current) => current.filter((stopId) => stopId !== id)); setEvaluation(null); }} aria-label={`Fjern ${stop?.label} fra ruten`}><i>→</i><strong>{stop?.label}</strong><small>stop {index + 1} · fjern ×</small></button>;
            })}
          </div>
        </section>

        <section className="city-tickets" aria-labelledby="city-ticket-title">
          <div className="city-section-title"><span>02</span><div><small>BETAL KUN DET NØDVENDIGE</small><h2 id="city-ticket-title">Vælg billet</h2></div></div>
          <div className="city-ticket-grid">
            {cityCase.tickets.map((ticket) => (
              <label key={ticket.id} className={ticketId === ticket.id ? "selected" : ""}>
                <input type="radio" name={`ticket-${cityCase.id}`} value={ticket.id} checked={ticketId === ticket.id} onChange={() => { setTicketId(ticket.id); setEvaluation(null); }} />
                <span><strong>{ticket.label}</strong><small>{ticket.englishLabel}</small></span>
                <b>{ticket.cost} kr.</b>
              </label>
            ))}
          </div>
        </section>

        <button className="city-check" type="button" onClick={check} disabled={evaluation?.success}>Send buddet af sted <span>→</span></button>
        {evaluation && metadata && (
          <>
            {evaluation.timeline.length > 0 && (
              <div className="city-timeline" aria-label="Beregnet tidslinje">
                {evaluation.timeline.map((entry) => {
                  const stop = cityCase.stops.find((candidate) => candidate.id === entry.stopId);
                  return <span key={entry.stopId} className={entry.withinWindow ? "on-time" : "late"}><b>{formatCityTime(entry.serviceStart)}</b>{stop?.label}</span>;
                })}
              </div>
            )}
            <ResultPanel evaluation={evaluation} metadata={metadata} />
          </>
        )}
      </main>
      <EnglishSupport cityCase={cityCase} />
    </div>
  );
}

export function CityScenarioRunner({
  scenarioId,
  initialCaseId,
  startingAttemptNumber = 1,
  onExit,
  onStartAttempt,
  onAttempt,
  onComplete,
}: CityScenarioRunnerProps) {
  const scenario = cityScenarioRegistry[scenarioId];
  const requested = initialCaseId ? getCityCase(scenarioId, initialCaseId) : null;
  const [caseId, setCaseId] = useState<CityCaseId>((requested ?? scenario.cases[0]).id);
  const [runKey, setRunKey] = useState(0);
  const attemptEligibility = useRef(new Map<CityCaseId, { eligible: boolean; checked: boolean }>());
  const cityCase = getCityCase(scenarioId, caseId) ?? scenario.cases[0];
  const claimFirstAttempt = () => {
    const cached = attemptEligibility.current.get(cityCase.id);
    if (cached?.checked) return false;
    const eligible = cached?.eligible ?? onStartAttempt?.(cityCase.id) ?? startingAttemptNumber === 1;
    attemptEligibility.current.set(cityCase.id, { eligible, checked: true });
    return eligible;
  };

  return (
    <div className="city-scenario-root" style={caseStyle(cityCase.accent)}>
      <style>{cityStyles}</style>
      <header className="city-game-header">
        <button type="button" onClick={onExit} aria-label="Tilbage til scenarier">← <span>Tilbage</span></button>
        <div><small>{scenario.eyebrow}</small><strong>{scenario.title}</strong></div>
        <b>{cityCase.level}</b>
      </header>
      <nav className="city-case-rail" aria-label="Vælg sag">
        {scenario.cases.map((candidate, index) => (
          <button
            key={candidate.id}
            type="button"
            className={candidate.id === cityCase.id ? "active" : ""}
            aria-current={candidate.id === cityCase.id ? "step" : undefined}
            onClick={() => { setCaseId(candidate.id); setRunKey((current) => current + 1); }}
          >
            <i>{index + 1}</i><span>{candidate.title}<small>{candidate.level} · {candidate.englishTitle}</small></span>
          </button>
        ))}
      </nav>
      <section className="city-case-intro">
        <div><small>SAG {String(scenario.cases.findIndex((candidate) => candidate.id === cityCase.id) + 1).padStart(2, "0")}</small><h1>{cityCase.title}</h1><p>{cityCase.brief}</p></div>
        <span><b>{startingAttemptNumber === 1 ? "RAV AKTIV" : "REPLAY"}</b><small>Kun første kontrol kan give rav</small></span>
      </section>
      <div key={`${cityCase.id}-${runKey}`}>
        {cityCase.engine === "civic-form"
          ? <CivicFormGame scenarioId={scenarioId} cityCase={cityCase} startingAttemptNumber={startingAttemptNumber} claimFirstAttempt={claimFirstAttempt} onAttempt={onAttempt} onComplete={onComplete} />
          : <RouteGame scenarioId={scenarioId} cityCase={cityCase} startingAttemptNumber={startingAttemptNumber} claimFirstAttempt={claimFirstAttempt} onAttempt={onAttempt} onComplete={onComplete} />}
      </div>
    </div>
  );
}

export function CityScenarioHub({ initialScenarioId = null, initialCaseId, onExit, onStartAttempt, onAttempt, onComplete }: CityScenarioHubProps) {
  const [scenarioId, setScenarioId] = useState<CityScenarioId | null>(initialScenarioId);
  const locallyStartedCases = useRef(new Set<CityCaseId>());
  const startAttempt = (caseId: CityCaseId) => {
    if (locallyStartedCases.current.has(caseId)) return false;
    locallyStartedCases.current.add(caseId);
    return onStartAttempt?.(caseId) ?? true;
  };
  if (scenarioId) {
    return <CityScenarioRunner scenarioId={scenarioId} initialCaseId={initialCaseId} onExit={() => setScenarioId(null)} onStartAttempt={startAttempt} onAttempt={onAttempt} onComplete={onComplete} />;
  }
  return (
    <div className="city-scenario-root city-hub-root">
      <style>{cityStyles}</style>
      <header className="city-game-header">
        <button type="button" onClick={onExit}>← <span>Scenarier</span></button>
        <div><small>ORDHAVN · BYLIV</small><strong>Virkelige sager</strong></div>
        <b>10 sager</b>
      </header>
      <section className="city-hub-hero">
        <small>SPROGET UDEN FOR LEKTIONEN</small>
        <h1>Byen venter ikke på et multiple choice-svar.</h1>
        <p>Læs, beregn og byg en løsning. Hver kontrol koster dit første forsøg, så undersøg sagen før du sender.</p>
      </section>
      <div className="city-card-grid">
        {cityScenarioCards.map((card, index) => (
          <button key={card.id} type="button" onClick={() => setScenarioId(card.id)} style={caseStyle(card.accent)}>
            <span className="city-card-number">0{index + 1}</span>
            <small>{card.eyebrow}</small>
            <h2>{card.title}</h2>
            <em>{card.englishTitle}</em>
            <p>{card.description}</p>
            <footer><span>{card.levels.join(" → ")}</span><strong>{card.caseCount} sager →</strong></footer>
          </button>
        ))}
      </div>
    </div>
  );
}

export const cityScenarioGameApi = {
  kind: "city" as const,
  cards: cityScenarioCards,
  registry: cityScenarioRegistry,
  Hub: CityScenarioHub,
  Runner: CityScenarioRunner,
};

const cityStyles = `
.city-scenario-root{--city-bg:#0b1118;--city-panel:#121b24;--city-panel-2:#18232e;--city-line:#293744;--city-text:#f4f1e9;--city-muted:#91a1ad;min-height:100%;background:radial-gradient(circle at 85% 0,color-mix(in srgb,var(--city-accent,#66b9ae) 10%,transparent),transparent 32%),var(--city-bg);color:var(--city-text);font-family:var(--font-sans,Inter,system-ui,sans-serif);padding-bottom:60px}.city-scenario-root *{box-sizing:border-box}.city-game-header{min-height:74px;padding:12px clamp(16px,4vw,48px);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-bottom:1px solid var(--city-line);background:color-mix(in srgb,var(--city-bg) 93%,transparent);position:sticky;top:0;z-index:10;backdrop-filter:blur(16px)}.city-game-header>button{justify-self:start;border:0;background:transparent;color:var(--city-muted);font-weight:750;cursor:pointer;padding:12px}.city-game-header>div{text-align:center;display:grid;gap:3px}.city-game-header small{font-size:9px;letter-spacing:.13em;color:var(--city-accent)}.city-game-header strong{font-size:13px}.city-game-header>b{justify-self:end;padding:8px 11px;border:1px solid var(--city-line);border-radius:9px;color:var(--city-accent);font-size:10px}.city-case-rail{max-width:1180px;margin:22px auto 0;padding:0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.city-case-rail button{display:flex;gap:10px;align-items:center;text-align:left;padding:11px;border:1px solid var(--city-line);border-radius:13px;background:var(--city-panel);color:var(--city-muted);cursor:pointer}.city-case-rail button.active{border-color:var(--city-accent);color:var(--city-text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--city-accent) 55%,transparent)}.city-case-rail i{width:27px;height:27px;border-radius:8px;background:var(--city-panel-2);display:grid;place-items:center;font-style:normal;font-size:10px}.city-case-rail .active i{background:var(--city-accent);color:#081510}.city-case-rail span{display:grid;gap:2px;font-size:10px;font-weight:800}.city-case-rail small{font-size:8px;color:var(--city-muted);font-weight:500}.city-case-intro{max-width:1180px;margin:34px auto 20px;padding:0 20px;display:flex;align-items:end;justify-content:space-between;gap:30px}.city-case-intro>div{max-width:780px}.city-case-intro>div>small,.city-hub-hero>small{color:var(--city-accent);font-size:9px;font-weight:900;letter-spacing:.15em}.city-case-intro h1{font-size:clamp(31px,4vw,52px);line-height:1;margin:8px 0 13px}.city-case-intro p{max-width:680px;color:var(--city-muted);font-size:13px;line-height:1.65}.city-case-intro>span{min-width:150px;padding:12px 14px;border:1px solid var(--city-line);border-radius:12px;background:var(--city-panel);display:grid;gap:4px}.city-case-intro>span b{font-size:9px;color:var(--city-accent)}.city-case-intro>span small{font-size:8px;color:var(--city-muted)}.city-two-column{max-width:1180px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:minmax(0,1.7fr) minmax(250px,.65fr);gap:18px}.city-main-panel{display:grid;gap:16px;min-width:0}.city-letter,.city-form,.city-workflow,.city-dispatch,.city-route-builder,.city-tickets,.city-support{border:1px solid var(--city-line);border-radius:18px;background:var(--city-panel);padding:clamp(18px,3vw,28px)}.city-letter{background:linear-gradient(145deg,#f4efe4,#e8dfcf);color:#2d2b28}.city-letter>header{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #c7bcaa;padding-bottom:15px;margin-bottom:15px}.city-letter>header span{font-size:8px;letter-spacing:.12em;color:#8b5733}.city-letter h2{font:700 clamp(20px,3vw,27px) Georgia,serif;margin:3px 0}.city-letter>header small{color:#72583e;font-size:9px}.city-letter>b{font:600 10px ui-monospace,monospace;color:#76573c}.city-letter>p{font:400 12px/1.7 Georgia,serif}.city-letter details,.city-dispatch details{margin-top:14px;padding-top:12px;border-top:1px solid currentColor;color:#655f56}.city-letter summary,.city-dispatch summary,.city-support summary{cursor:pointer;font:750 10px var(--font-sans,Inter,sans-serif)}.city-letter details p{font:400 11px/1.55 var(--font-sans,Inter,sans-serif)}.city-section-title{display:flex;align-items:center;gap:12px;margin-bottom:18px}.city-section-title>span{width:39px;height:39px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--city-accent) 16%,transparent);color:var(--city-accent);font-size:10px;font-weight:900}.city-section-title small{font-size:8px;color:var(--city-accent);letter-spacing:.1em}.city-section-title h2{font-size:20px;margin:3px 0 0}.city-field-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}.city-field-grid label,.city-calculation{display:grid;gap:5px}.city-field-grid label>span,.city-calculation>span{font-size:10px;font-weight:800}.city-field-grid label>small,.city-calculation>small{font-size:8px;color:var(--city-muted)}.city-field-grid select,.city-calculation input{width:100%;padding:12px;border:1px solid var(--city-line);border-radius:10px;background:var(--city-panel-2);color:var(--city-text)}.city-calculation{margin-top:16px}.city-calculation>div{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px}.city-calculation b{font-size:11px;color:var(--city-accent)}.city-workflow>p,.city-route-builder>p{font-size:10px;color:var(--city-muted)}.city-action-bank,.city-stop-bank{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:14px 0}.city-action-bank button,.city-stop-bank button{border:1px solid var(--city-line);border-radius:11px;background:var(--city-panel-2);color:var(--city-text);padding:11px;text-align:left;display:flex;align-items:center;gap:9px;cursor:pointer}.city-action-bank button:disabled,.city-stop-bank button:disabled{opacity:.35;cursor:not-allowed}.city-action-bank i,.city-stop-bank i{flex:0 0 auto;width:25px;height:25px;border-radius:7px;background:color-mix(in srgb,var(--city-accent) 17%,transparent);color:var(--city-accent);display:grid;place-items:center;font-style:normal;font-size:9px}.city-action-bank span{display:grid;font-size:9px;font-weight:750}.city-action-bank small{color:var(--city-muted);font-size:7px;font-weight:500}.city-order-tray{min-height:62px;margin:0;padding:10px 10px 10px 37px;border:1px dashed color-mix(in srgb,var(--city-accent) 50%,var(--city-line));border-radius:12px;display:grid;gap:6px}.city-order-tray li::marker{color:var(--city-accent);font-size:10px;font-weight:900}.city-order-tray button{width:100%;border:0;background:transparent;color:var(--city-text);display:flex;justify-content:space-between;text-align:left;cursor:pointer;font-size:9px;padding:5px}.city-order-tray .empty{list-style:none;color:var(--city-muted);font-size:9px;margin-left:-22px;padding:10px}.city-check{min-height:49px;border:0;border-radius:13px;background:var(--city-accent);color:#071410;padding:12px 17px;font-weight:900;font-size:11px;display:flex;justify-content:space-between;align-items:center;cursor:pointer}.city-check:disabled{opacity:.55;cursor:not-allowed}.city-support{align-self:start;position:sticky;top:96px}.city-support>details{padding:12px;border-radius:10px;background:var(--city-panel-2)}.city-support>details p{color:var(--city-muted);font-size:10px;line-height:1.55}.city-glossary{display:grid;gap:9px;margin-top:18px}.city-glossary>span{font-size:8px;color:var(--city-accent);font-weight:900;letter-spacing:.12em}.city-glossary article{padding:11px;border-bottom:1px solid var(--city-line);display:grid;gap:3px}.city-glossary article strong{font-size:11px}.city-glossary article b{color:var(--city-accent);font-size:9px}.city-glossary article small{color:var(--city-muted);font-size:8px;line-height:1.4}.city-result{padding:17px;border:1px solid var(--city-line);border-radius:15px;background:var(--city-panel)}.city-result.success{border-color:#3d9077}.city-result.retry{border-color:#a66f4e}.city-result header{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center}.city-result header>span{width:37px;height:37px;border-radius:11px;background:color-mix(in srgb,var(--city-accent) 18%,transparent);color:var(--city-accent);display:grid;place-items:center}.city-result header small{font-size:8px;color:var(--city-accent)}.city-result h3{margin:2px 0;font-size:17px}.city-result header>strong{color:var(--city-accent)}.city-result ul{padding-left:19px;color:var(--city-muted);font-size:9px;line-height:1.5}.city-result>p{font-size:9px;color:var(--city-muted);border-top:1px solid var(--city-line);padding-top:10px}.city-dispatch header{display:flex;gap:11px;align-items:center}.city-dispatch header>span{padding:6px 8px;border-radius:8px;background:#bb5e4b;color:white;font-size:8px;font-weight:900}.city-dispatch header small{color:var(--city-accent);font-size:8px}.city-dispatch h2{margin:2px 0;font-size:21px}.city-dispatch>p{display:grid;grid-template-columns:27px 1fr;gap:8px;color:#c8d3da;font-size:10px;line-height:1.55}.city-dispatch>p b{color:var(--city-accent)}.city-dispatch details{color:var(--city-muted)}.city-dispatch details p{font-size:9px}.city-stop-bank button{min-height:92px;display:grid;grid-template-columns:auto 1fr;align-content:center}.city-stop-bank button i{grid-row:1/4}.city-stop-bank button strong{font-size:10px}.city-stop-bank button span{font-size:8px;color:var(--city-accent)}.city-stop-bank button small{font-size:8px;color:var(--city-muted)}.city-route-line{display:flex;align-items:stretch;gap:5px;overflow-x:auto;padding:12px;border:1px dashed var(--city-line);border-radius:12px}.city-route-line>span,.city-route-line>button{flex:0 0 auto;min-width:105px;border:0;border-radius:9px;padding:9px;background:var(--city-panel-2);color:var(--city-text);display:grid;gap:3px;text-align:left}.city-route-line>button{cursor:pointer}.city-route-line i{color:var(--city-accent);font-style:normal}.city-route-line strong{font-size:9px}.city-route-line small{font-size:7px;color:var(--city-muted)}.city-ticket-grid{display:grid;gap:7px}.city-ticket-grid label{min-height:51px;padding:10px;border:1px solid var(--city-line);border-radius:11px;background:var(--city-panel-2);display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;cursor:pointer}.city-ticket-grid label.selected{border-color:var(--city-accent)}.city-ticket-grid input{accent-color:var(--city-accent)}.city-ticket-grid span{display:grid;gap:2px}.city-ticket-grid strong{font-size:9px}.city-ticket-grid small{font-size:7px;color:var(--city-muted)}.city-ticket-grid b{color:var(--city-accent);font-size:10px}.city-timeline{display:flex;gap:5px;overflow-x:auto}.city-timeline span{min-width:100px;padding:9px;border-radius:9px;background:var(--city-panel);display:grid;font-size:8px;color:var(--city-muted)}.city-timeline b{color:#62be9b;font-size:10px}.city-timeline .late b{color:#dd7d65}.city-hub-root{--city-accent:#66b9ae}.city-hub-hero{max-width:940px;margin:0 auto;padding:70px 20px 38px;text-align:center}.city-hub-hero h1{font-size:clamp(34px,6vw,68px);line-height:1.02;margin:12px auto;max-width:870px}.city-hub-hero p{max-width:650px;margin:20px auto;color:var(--city-muted);line-height:1.65}.city-card-grid{max-width:1080px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.city-card-grid>button{min-height:330px;padding:28px;border:1px solid var(--city-line);border-radius:21px;background:linear-gradient(145deg,color-mix(in srgb,var(--city-accent) 9%,var(--city-panel)),var(--city-panel));color:var(--city-text);text-align:left;display:flex;flex-direction:column;align-items:flex-start;cursor:pointer;position:relative;overflow:hidden}.city-card-grid>button:hover{border-color:var(--city-accent);transform:translateY(-2px)}.city-card-number{position:absolute;right:20px;top:8px;font-size:76px;font-weight:950;color:color-mix(in srgb,var(--city-accent) 12%,transparent)}.city-card-grid small{color:var(--city-accent);font-size:8px;font-weight:900;letter-spacing:.1em}.city-card-grid h2{font-size:27px;margin:42px 0 4px;max-width:360px}.city-card-grid em{font-size:9px;color:var(--city-muted)}.city-card-grid p{font-size:11px;line-height:1.6;color:#bac7d0;max-width:430px}.city-card-grid footer{width:100%;margin-top:auto;padding-top:15px;border-top:1px solid var(--city-line);display:flex;justify-content:space-between;font-size:9px}.city-card-grid footer span{color:var(--city-muted)}.city-card-grid footer strong{color:var(--city-accent)}.city-scenario-root button:focus-visible,.city-scenario-root select:focus-visible,.city-scenario-root input:focus-visible,.city-scenario-root summary:focus-visible,.city-action-bank:focus-visible,.city-stop-bank:focus-visible{outline:2px solid var(--city-accent);outline-offset:3px}@media(max-width:900px){.city-two-column{grid-template-columns:1fr}.city-support{position:static}.city-card-grid{grid-template-columns:1fr}.city-case-intro{align-items:flex-start}.city-case-intro>span{display:none}}@media(max-width:720px){.city-game-header{grid-template-columns:1fr auto 1fr;padding:8px}.city-game-header>button span{display:none}.city-game-header>div strong{font-size:10px}.city-case-rail{padding:0 10px;overflow-x:auto;display:flex}.city-case-rail button{min-width:155px}.city-case-intro{margin-top:25px;padding:0 13px}.city-two-column{padding:0 10px}.city-letter,.city-form,.city-workflow,.city-dispatch,.city-route-builder,.city-tickets,.city-support{padding:16px;border-radius:14px}.city-field-grid,.city-action-bank,.city-stop-bank{grid-template-columns:1fr}.city-card-grid{padding:0 10px}.city-card-grid>button{min-height:300px;padding:20px}.city-hub-hero{padding-top:48px}.city-route-line{padding:8px}.city-result header{grid-template-columns:auto 1fr}.city-result header>strong{grid-column:2}.city-ticket-grid label{min-height:58px}}
`;

export default CityScenarioHub;
