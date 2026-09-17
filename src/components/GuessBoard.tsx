"use client";

/**
 * Guess the Architecture — twenty questions, played against the design space.
 *
 * The AI asks in business language, each answer eliminates candidates, and any
 * node shared by every survivor is already certain — so the board fills itself
 * in as you go rather than only at the end. That progressive fill is the whole
 * point: you watch the architecture resolve out of the answers.
 */

import { useMemo, useState } from "react";
import {
  enumerateVariants,
  FORKS,
  NODE_LABELS,
  nextQuestion,
  progress,
  remaining,
  type Answers,
  type Fork,
  type NodeId,
} from "@/domain/variants";
import { Sketchy } from "./Sketchy";

const VARIANTS = enumerateVariants();

interface Decided {
  fork: Fork;
  optionId: string;
  answer: string;
  eliminated: number;
}

export function GuessBoard() {
  const [answers, setAnswers] = useState<Answers>({});
  const [log, setLog] = useState<Decided[]>([]);

  const p = useMemo(() => progress(VARIANTS, answers), [answers]);
  const question = useMemo(() => nextQuestion(VARIANTS, answers), [answers]);

  const answer = (fork: Fork, optionId: string) => {
    const before = remaining(VARIANTS, answers).length;
    const next = { ...answers, [fork.id]: optionId };
    const after = remaining(VARIANTS, next).length;
    // An answer that leaves nothing is unreachable, but guard anyway rather
    // than stranding the user on an empty board.
    if (after === 0) return;
    setAnswers(next);
    setLog((l) => [
      ...l,
      {
        fork,
        optionId,
        answer: fork.options.find((o) => o.id === optionId)!.answer,
        eliminated: before - after,
      },
    ]);
  };

  const reset = () => {
    setAnswers({});
    setLog([]);
  };

  const status = (n: NodeId): "certain" | "excluded" | "undecided" =>
    p.certain.includes(n) ? "certain" : p.excluded.includes(n) ? "excluded" : "undecided";

  return (
    <div className="stack">
      <div className="guess-head">
        <div>
          <span className="guess-count">{p.alive}</span>
          <span className="hint">
            {p.alive === 1 ? " architecture — solved" : " architectures still possible"}
          </span>
        </div>
        <div className="hint">
          {p.asked} asked
          {p.questionsLeftAtBest > 0 && ` · ~${p.questionsLeftAtBest} to go`}
          {" · "}
          {p.certain.length}/{p.certain.length + p.undecided.length} components decided
        </div>
        {p.asked > 0 && (
          <button className="chip" onClick={reset}>
            start over
          </button>
        )}
      </div>

      {question ? (
        <Sketchy sketchKey={`q-${question.id}`} tone="accent">
          <div className="guess-q">
            <div className="box-label">Question {p.asked + 1}</div>
            <p className="guess-q-text">{question.question}</p>
            <div className="stack" style={{ gap: 6 }}>
              {question.options
                .filter(
                  (o) => remaining(VARIANTS, { ...answers, [question.id]: o.id }).length > 0,
                )
                .map((o) => (
                  <button
                    key={o.id}
                    className="guess-opt"
                    onClick={() => answer(question, o.id)}
                  >
                    {o.answer}
                  </button>
                ))}
            </div>
          </div>
        </Sketchy>
      ) : (
        <Sketchy sketchKey="q-solved" tone="accent">
          <div className="guess-q">
            <div className="box-label">Solved</div>
            <p className="guess-q-text">
              One architecture left. Everything below is decided — and each answer above
              is the reason.
            </p>
          </div>
        </Sketchy>
      )}

      <div>
        <div className="panel-title">The architecture, so far</div>
        <div className="nodegrid">
          {(Object.keys(NODE_LABELS) as NodeId[]).map((n) => {
            const st = status(n);
            return (
              <Sketchy
                key={n}
                sketchKey={`node-${n}`}
                tone={st === "certain" ? "accent" : st === "excluded" ? "neutral" : "ghost"}
                dashed={st !== "certain"}
              >
                <div className="node" data-status={st}>
                  {NODE_LABELS[n]}
                </div>
              </Sketchy>
            );
          })}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Solid is decided · dashed is still in play · struck through is ruled out
        </p>
      </div>

      {log.length > 0 && (
        <div>
          <div className="panel-title">What your answers decided</div>
          <div className="stack" style={{ gap: 6 }}>
            {log.map((d, i) => (
              <div className="decided" key={`${d.fork.id}-${i}`}>
                <span className="decided-n">{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="decided-answer">“{d.answer}”</div>
                  <div className="hint">
                    {d.fork.decides}
                    {d.eliminated > 0 && ` Ruled out ${d.eliminated}.`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
