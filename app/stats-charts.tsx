import type { CSSProperties } from "react";
import { STAT_SOURCE_LABEL, STAT_SOURCES, type DailyPoint, type HeatmapCell } from "../lib/learningStats";

// Small hand-rolled charts for the Statistik tab. Colours come from the
// --chart-1 … --chart-6 tokens in globals.css; every series also has a legend
// and a title tooltip, so identity never relies on colour alone.

export const SOURCE_COLOR: Record<(typeof STAT_SOURCES)[number], string> = {
  lessons: "var(--chart-1)",
  grammar: "var(--chart-2)",
};

export function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="chart-legend">
      {items.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}
    </div>
  );
}

export function StackedDailyBars({ days }: { days: DailyPoint[] }) {
  const max = Math.max(5, ...days.map((day) => day.total));
  return (
    <div className="stack-chart" role="img" aria-label="Svar per dag fordelt på lektioner og grammatik">
      {days.map((day) => {
        const tooltip = `${day.weekday} ${day.label}: ${day.total} svar · ${STAT_SOURCES.map((source) => `${STAT_SOURCE_LABEL[source]} ${day.bySource[source].total}`).join(" · ")}`;
        return (
          <div className="stack-column" key={day.key} title={tooltip}>
            <span className="stack-value">{day.total || ""}</span>
            <div className="stack-shell">
              {STAT_SOURCES.map((source) => day.bySource[source].total ? (
                <i key={source} style={{ height: `${(day.bySource[source].total / max) * 100}%`, background: SOURCE_COLOR[source] }} />
              ) : null)}
            </div>
            <small><b>{day.weekday}</b>{day.label}</small>
          </div>
        );
      })}
    </div>
  );
}

/** Daily accuracy, one line per source; days without answers leave a gap. */
export function AccuracyTrend({ days }: { days: DailyPoint[] }) {
  const x = (index: number) => (days.length > 1 ? (index / (days.length - 1)) * 100 : 50);
  const series = STAT_SOURCES.map((source) => ({
    source,
    points: days.map((day, index) => {
      const counts = day.bySource[source];
      return counts.total ? { index, value: Math.round((counts.correct / counts.total) * 100), total: counts.total, day } : null;
    }),
  }));
  const segments = (points: typeof series[number]["points"]) => {
    const runs: string[] = [];
    let current: string[] = [];
    points.forEach((point) => {
      if (point) current.push(`${x(point.index)},${100 - point.value}`);
      else if (current.length) { runs.push(current.join(" ")); current = []; }
    });
    if (current.length) runs.push(current.join(" "));
    return runs;
  };
  const hasData = series.some((line) => line.points.some(Boolean));
  return (
    <div className="trend-chart">
      <div className="trend-axis">{[100, 75, 50, 25, 0].map((tick) => <span key={tick}>{tick}%</span>)}</div>
      <div className="trend-plot" role="img" aria-label="Præcision per dag">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((tick) => <line key={tick} x1="0" x2="100" y1={tick} y2={tick} className="trend-grid" />)}
          {series.map((line) => segments(line.points).map((run) => (
            <polyline key={`${line.source}-${run}`} points={run} fill="none" stroke={SOURCE_COLOR[line.source]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          )))}
        </svg>
        {series.map((line) => line.points.map((point) => point && (
          <span
            key={`${line.source}-${point.index}`}
            className="trend-dot"
            style={{ left: `${x(point.index)}%`, top: `${100 - point.value}%`, background: SOURCE_COLOR[line.source] } as CSSProperties}
            title={`${STAT_SOURCE_LABEL[line.source]} · ${point.day.weekday} ${point.day.label}: ${point.value}% af ${point.total} svar`}
          />
        )))}
        {!hasData && <p className="chart-empty">Ingen svar i perioden endnu.</p>}
      </div>
      <div className="trend-labels">
        {days.map((day, index) => <span key={day.key}>{index % 2 === days.length % 2 ? "" : day.label}</span>)}
      </div>
    </div>
  );
}

export function DonutChart({ slices, centerLabel }: { slices: Array<{ label: string; value: number; color: string }>; centerLabel: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const visible = slices.filter((slice) => slice.value > 0);
  const gap = visible.length > 1 ? 1.2 : 0;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 100 100" role="img" aria-label="Fordeling af træning">
          <circle cx="50" cy="50" r={radius} className="donut-track" />
          {total > 0 && visible.map((slice) => {
            const length = (slice.value / total) * circumference;
            const dash = Math.max(0.1, length - gap);
            const element = (
              <circle
                key={slice.label}
                cx="50" cy="50" r={radius}
                fill="none" stroke={slice.color} strokeWidth="11"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              ><title>{`${slice.label}: ${slice.value} (${Math.round((slice.value / total) * 100)}%)`}</title></circle>
            );
            offset += length;
            return element;
          })}
        </svg>
        <div><strong>{total}</strong><span>{centerLabel}</span></div>
      </div>
      <ul className="donut-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{slice.value}</strong>
            <small>{total ? `${Math.round((slice.value / total) * 100)}%` : "—"}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

const WEEKDAY_ROWS = ["Man", "", "Ons", "", "Fre", "", "Søn"];

export function ActivityHeatmap({ weeks }: { weeks: HeatmapCell[][] }) {
  const max = Math.max(1, ...weeks.flat().map((cell) => cell.count));
  const level = (count: number) => (count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4)));
  return (
    <div className="heatmap">
      <div className="heatmap-days">{WEEKDAY_ROWS.map((label, index) => <span key={index}>{label}</span>)}</div>
      <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` } as CSSProperties}>
        {weeks.map((week, column) => (
          <div className="heatmap-week" key={column}>
            {week.map((cell) => (
              <i key={cell.key} className={cell.future ? "future" : `level-${level(cell.count)}`} title={cell.future ? undefined : `${cell.label}: ${cell.count} svar`} />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-scale"><span>Mindre</span>{[0, 1, 2, 3, 4].map((step) => <i key={step} className={`level-${step}`} />)}<span>Mere</span></div>
    </div>
  );
}

export function HourBars({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(Math.max(...hours));
  return (
    <div className="hour-chart" role="img" aria-label="Svar fordelt på tidspunkt">
      {hours.map((count, hour) => (
        <div className={`hour-column ${count && hour === peak ? "peak" : ""}`} key={hour} title={`kl. ${String(hour).padStart(2, "0")}–${String((hour + 1) % 24).padStart(2, "0")}: ${count} svar`}>
          <div><i style={{ height: `${count ? Math.max(4, (count / max) * 100) : 0}%` }} /></div>
          <small>{hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</small>
        </div>
      ))}
    </div>
  );
}

/** Leitner boxes as a sequential ramp: further right = remembered for longer. */
export function BoxLadder({ boxes, labels }: { boxes: number[]; labels: string[] }) {
  const max = Math.max(1, ...boxes);
  return (
    <div className="box-ladder">
      {boxes.map((count, box) => (
        <div key={box} title={`Boks ${box} (${labels[box]}): ${count} regler`}>
          <span className="box-count">{count}</span>
          <div className="box-shell"><i className={`box-step-${box}`} style={{ height: `${count ? Math.max(6, (count / max) * 100) : 0}%` }} /></div>
          <small><b>Boks {box}</b>{labels[box]}</small>
        </div>
      ))}
    </div>
  );
}
