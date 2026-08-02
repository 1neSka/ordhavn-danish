import { ArrowRight, Check, Keyboard, Layers3, MessageCircle, Sparkles } from "lucide-react";
import { clozeBlanks, normalizeExerciseAnswer } from "./exerciseScoring.ts";
import { orderThreeChoiceOptions } from "./optionOrder.ts";
import type { ItemRenderProps } from "./itemRuntime.ts";
import type {
  ClozeMultiItem,
  ErrorHuntItem,
  GenderBetItem,
  RegisterMatchItem,
  TextOrderItem,
} from "./course/types.ts";

export function ChoiceItemRenderer({ question, response, setResponse, checked, correct, displayOptions }: ItemRenderProps) {
  return (
    <>
      {question.type === "number-arcade" && <div className="number-arcade-display"><span>{question.value}</span><div><strong>Vigesimalt værksted</strong><small>{checked ? question.breakdown : "Find talordet før maskinen køler af"}</small></div></div>}
      {question.type === "definiteness" && <div className="grammar-transform"><span>{question.forms.indefinite}</span><ArrowRight size={16} /><span>{question.forms.definite}</span><ArrowRight size={16} /><span>{question.forms.modified}</span></div>}
      {question.type === "agreement" && <div className="grammar-rule"><Layers3 size={18} /><span>grundform</span><i>→</i><strong>{question.agreementForm === "t" ? "-t ved et-ord" : question.agreementForm === "e" ? "-e i bestemt/flertal" : "ingen endelse ved en-ord"}</strong></div>}
      {question.type === "synonym-pick" && <div className="grammar-rule"><Sparkles size={18} /><span>{question.register}</span><i>·</i><strong>{question.focusWord} i kontekst: {question.context}</strong></div>}
      {question.type === "odd-one-out" && <div className="grammar-rule"><Layers3 size={18} /><span>ordfamilie</span><i>→</i><strong>{question.family}</strong></div>}
      {question.type === "collocation-lock" && <div className="grammar-rule"><Layers3 size={18} /><span>fast makker</span><i>+</i><strong>{question.anchor}</strong></div>}
      {question.type === "evidential-tag" && <div className="register-intent"><MessageCircle size={20} /><div><span>Udsagn</span><strong>{question.statement}</strong></div></div>}
      <div className="option-list">
        {displayOptions.map((option, optionIndex) => (
          <button
            className={`answer-option ${response.selected === option ? "selected" : ""} ${checked && option === question.answer ? "answer-correct" : ""} ${checked && response.selected === option && !correct ? "answer-wrong" : ""}`}
            key={option}
            onClick={() => !checked && setResponse((old) => ({ ...old, selected: option }))}
          ><span>{optionIndex + 1}</span><strong>{option}</strong>{checked && option === question.answer && <Check size={19} />}</button>
        ))}
      </div>
    </>
  );
}

export function GenderBetRenderer({ question, response, setResponse, checked, correct }: ItemRenderProps) {
  const item = question as GenderBetItem;
  return (
    <div className="gender-bet-area">
      <div className="gender-options">
        {item.options.map((option) => (
          <button
            className={`gender-card ${response.selected === option ? "selected" : ""} ${checked && option === item.answer ? "answer-correct" : ""} ${checked && response.selected === option && !correct ? "answer-wrong" : ""}`}
            key={option}
            disabled={checked}
            onClick={() => setResponse((old) => ({ ...old, selected: option }))}
          ><strong>{option}</strong><span>{option === "en" ? "fælleskøn" : "intetkøn"}</span></button>
        ))}
      </div>
      <div className="confidence-wager">
        <div><span>Sikkerhedsindsats</span><strong>{response.confidence}%</strong></div>
        <input type="range" min="50" max="100" step="10" value={response.confidence} disabled={checked}
          onChange={(event) => setResponse((old) => ({ ...old, confidence: Number(event.target.value) as typeof old.confidence }))}
          aria-label="Hvor sikker er du?" />
        <p>Høj sikkerhed giver flere point, men koster ved et sikkert forkert svar. Kalibrering måles med Brier-score.</p>
      </div>
    </div>
  );
}

function tokenLabel(question: ItemRenderProps["question"], token: string) {
  if (question.type !== "text-order") return token;
  return question.sentences.find((sentence) => sentence.id === token)?.text ?? token;
}

export function OrderItemRenderer({ question, response, setResponse, checked, displayTokens }: ItemRenderProps) {
  const tokens = displayTokens;
  return (
    <>
      {question.type === "ikke-position" && <div className={`field-model ${checked ? "resolved" : ""}`}><span>{question.clauseType === "main" ? "Hovedsætning · V2" : "Ledsætning"}</span><div>{question.clauseType === "main" ? <><i>forfelt</i><i>verbum</i><i>subjekt</i><i className="ikke">ikke</i></> : <><i>bindeord</i><i>subjekt</i><i className="ikke">ikke</i><i>verbum</i></>}</div>{checked && <p className="field-answer-flight">{question.answer}</p>}</div>}
      {question.type === "nuance-scale" && <div className="grammar-rule"><Sparkles size={18} /><span>svag</span><i>→</i><strong>{question.axis}</strong><i>→</i><span>stærk</span></div>}
      {question.type === "word-forge" && <div className="grammar-rule"><Layers3 size={18} /><span>ordstammer</span><i>+</i><strong>{question.fugeelement ? `fuge-${question.fugeelement}` : "ingen fuge"}</strong></div>}
      {question.type === "counterfactual-chain" && <div className="register-intent"><MessageCircle size={20} /><div><span>Det faktiske forløb</span><strong>{question.premises.join(" → ")}</strong></div></div>}
      <div className={`order-area ${question.type === "text-order" ? "text-order-area" : ""}`}>
        <div className="order-answer">
          {response.ordered.length ? response.ordered.map((token, tokenIndex) => <button key={`${token}-${tokenIndex}`} onClick={() => !checked && setResponse((old) => ({ ...old, ordered: old.ordered.filter((_, i) => i !== tokenIndex) }))}>{question.type === "text-order" && <kbd>{tokenIndex + 1}</kbd>}{tokenLabel(question, token)}</button>) : <span>{question.type === "text-order" ? "Byg tekstens logiske rækkefølge …" : "Klik på ordene nedenfor …"}</span>}
        </div>
        <div className="token-bank">
          {tokens.map((token, tokenIndex) => {
            const used = response.ordered.filter((item) => item === token).length >= tokens.slice(0, tokenIndex + 1).filter((item) => item === token).length;
            return <button key={`${token}-${tokenIndex}`} disabled={used || checked} onClick={() => setResponse((old) => ({ ...old, ordered: [...old.ordered, token] }))}><kbd>{tokenIndex + 1}</kbd>{tokenLabel(question, token)}</button>;
          })}
        </div>
      </div>
    </>
  );
}

export function InputItemRenderer({ question, response, setResponse, checked, onSubmit }: ItemRenderProps) {
  const isAi = Boolean(question.aiPolicy);
  return (
    <>
      {question.type === "transform" && <div className="transform-display"><div><span>Udgangspunkt</span><strong>{question.sourceSentence}</strong></div><ArrowRight size={20} /><div><span>Ændring</span><strong>{question.instruction}</strong></div></div>}
      {question.type === "inflection-forge" && <div className="grammar-transform"><span>{question.lemma}</span><ArrowRight size={16} /><strong>{question.targetDescription}</strong></div>}
      {question.type === "free-rewrite" && <div className="transform-display"><div><span>Udgangspunkt</span><strong>{question.sourceText}</strong></div><ArrowRight size={20} /><div><span>Formål</span><strong>{question.instruction}</strong></div></div>}
      {question.type === "compress" && <div className="register-intent"><Layers3 size={20} /><div><span>Komprimer til højst {question.maxWords} ord</span><strong>{question.sourceText}</strong></div></div>}
      {question.type === "micro-dialogue" && <div className="register-intent"><MessageCircle size={20} /><div><span>{question.persona} · tre replikker</span><strong>Læs tonen. Det egentlige mål er ikke skrevet på skærmen.</strong></div></div>}
      {question.type === "explain-why" && <div className="register-intent"><Sparkles size={20} /><div><span>Påstand</span><strong>{question.claim}</strong></div></div>}
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className={`input-answer-wrap ${isAi ? "ai-answer-wrap" : ""}`}>
        {isAi
          ? <textarea autoFocus value={response.selected} disabled={checked} onChange={(event) => setResponse((old) => ({ ...old, selected: event.target.value }))} placeholder="Skriv dit svar på dansk …" aria-label="Dit svar" />
          : <input autoFocus value={response.selected} disabled={checked} onChange={(event) => setResponse((old) => ({ ...old, selected: event.target.value }))} placeholder={question.type === "transform" ? "Skriv hele den nye sætning …" : "Skriv på dansk …"} aria-label="Dit svar" autoComplete="off" />}
        <Keyboard size={20} />
      </form>
      {isAi && <p className="ai-skip-note"><Sparkles size={15} /> Gemini bedømmer denne opgave. Hvis AI ikke er tilgængelig, springes opgaven over uden straf.</p>}
    </>
  );
}

export function ClozeMultiRenderer({ question, response, setResponse, checked, sessionId }: ItemRenderProps) {
  const item = question as ClozeMultiItem;
  const blanks = clozeBlanks(item.segments);
  const focused = response.activeId || blanks.find((blank) => !response.selections[blank.blankId])?.blankId || blanks[0]?.blankId || "";
  return (
    <div className="cloze-multi-area">
      <div className="cloze-sentence" aria-label="Sætning med flere tomme felter">
        {item.segments.map((segment, index) => "text" in segment ? <span key={`text-${index}`}>{segment.text}</span> : <button key={segment.blankId} type="button" disabled={checked} className={`${focused === segment.blankId ? "active" : ""} ${response.selections[segment.blankId] ? "filled" : ""} ${checked && response.selections[segment.blankId] === segment.answer ? "answer-correct" : ""} ${checked && response.selections[segment.blankId] !== segment.answer ? "answer-wrong" : ""}`} onClick={() => setResponse((old) => ({ ...old, activeId: segment.blankId }))}>{response.selections[segment.blankId] || "___"}</button>)}
      </div>
      <div className="cloze-option-groups">
        {blanks.map((blank, blankIndex) => <section className={focused === blank.blankId ? "active" : ""} key={blank.blankId} onClick={() => !checked && setResponse((old) => ({ ...old, activeId: blank.blankId }))}>
          <div><strong>Felt {blankIndex + 1}</strong><span>{response.selections[blank.blankId] || "Vælg en form"}</span></div>
          <div>{orderThreeChoiceOptions(blank.options, blank.answer, `${sessionId}:${item.id}:${blank.blankId}`).map((option, optionIndex) => <button type="button" key={option} disabled={checked} className={`${response.selections[blank.blankId] === option ? "selected" : ""} ${checked && option === blank.answer ? "answer-correct" : ""} ${checked && response.selections[blank.blankId] === option && option !== blank.answer ? "answer-wrong" : ""}`} onClick={() => setResponse((old) => ({ ...old, selections: { ...old.selections, [blank.blankId]: option } }))}>{focused === blank.blankId && <kbd>{optionIndex + 1}</kbd>}{option}</button>)}</div>
        </section>)}
      </div>
    </div>
  );
}

export function RegisterMatchRenderer({ question, response, setResponse, checked }: ItemRenderProps) {
  const item = question as RegisterMatchItem;
  return <div className="register-match-area"><div className="register-intent"><MessageCircle size={20} /><div><span>Intention</span><strong>{item.intent}</strong></div></div><div className="register-pairs">
    {item.pairs.map((pair) => {
      const chosen = response.selections[pair.addressee] ?? "";
      const rowCorrect = normalizeExerciseAnswer(chosen) === normalizeExerciseAnswer(pair.utterance);
      return <label className={checked ? rowCorrect ? "answer-correct" : "answer-wrong" : ""} key={pair.addressee}><span className="register-addressee"><strong>{pair.addressee}</strong><small>{pair.addresseeNote}</small></span><span className="register-arrow"><ArrowRight size={17} /></span><select disabled={checked} value={chosen} onChange={(event) => setResponse((old) => ({ ...old, selections: { ...old.selections, [pair.addressee]: event.target.value } }))}><option value="">Vælg formulering …</option>{[...item.pairs].map((option) => option.utterance).sort((a, b) => a.localeCompare(b, "da-DK")).map((utterance) => <option key={utterance} value={utterance} disabled={Object.entries(response.selections).some(([key, value]) => key !== pair.addressee && value === utterance)}>{utterance}</option>)}</select>{checked && !rowCorrect && <small className="register-correction">Rigtigt: {pair.utterance}</small>}</label>;
    })}
  </div></div>;
}

export function ErrorHuntRenderer({ question, response, setResponse, checked }: ItemRenderProps) {
  const item = question as ErrorHuntItem;
  return <div className="error-hunt-area"><div className="error-token-row">{item.sentenceTokens.map((token, index) => <button key={`${token}-${index}`} disabled={checked} className={`${response.errorIndex === index ? "selected" : ""} ${checked && index === item.errorIndex ? "answer-correct" : ""} ${checked && response.errorIndex === index && index !== item.errorIndex ? "answer-wrong" : ""}`} onClick={() => setResponse((old) => ({ ...old, errorIndex: index }))}><kbd>{index + 1}</kbd>{token}</button>)}</div><div className="input-answer-wrap"><input value={response.correction} disabled={checked} onChange={(event) => setResponse((old) => ({ ...old, correction: event.target.value }))} placeholder="Skriv den korrekte form …" aria-label="Korrektion" /><Keyboard size={20} /></div>{checked && <p className="register-correction">Fejlen er “{item.sentenceTokens[item.errorIndex]}”; korrekt form: {item.correction}</p>}</div>;
}

export function textOrderExpected(item: TextOrderItem) {
  return item.correctOrder.map((id) => item.sentences.find((sentence) => sentence.id === id)?.text ?? id).join(" ");
}
