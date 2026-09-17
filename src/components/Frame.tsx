"use client";

/**
 * Triage: the three elements.
 *
 * The named entity is struck through with the actual stakeholder beneath it —
 * the gap is the point, so it is drawn rather than resolved silently. Unknowns
 * render as amber question marks, not blanks, because an unknown is an opening
 * question rather than an omission.
 */

import type { PartialBrief } from "@/domain/brief";

export function Frame({
  brief,
  onEdit,
}: {
  brief: PartialBrief;
  onEdit: (patch: (b: PartialBrief) => PartialBrief) => void;
}) {
  const t = brief.decomposition?.triage;
  const named = t?.namedEntity ?? "";
  const actual = t?.actualStakeholder ?? "";
  const gap = named && actual && named.trim().toLowerCase() !== actual.trim().toLowerCase();

  const setTriage = (patch: Record<string, unknown>) =>
    onEdit((b) => ({
      ...b,
      decomposition: {
        ...b.decomposition,
        triage: { ...(b.decomposition?.triage as object), ...patch } as never,
      },
    }));

  return (
    <div className="frame">
      <div className="box" data-unknown={!actual}>
        <div className="box-label">Stakeholder</div>
        {gap && <div className="struck">{named}</div>}
        {actual ? (
          <div className="box-main">{actual}</div>
        ) : (
          <div className="qmark" title="Unknown — this becomes an opening question">
            ?
          </div>
        )}
        <input
          type="text"
          placeholder="who changes what they do?"
          defaultValue={actual}
          onBlur={(e) => setTriage({ actualStakeholder: e.target.value })}
          style={{ marginTop: 8 }}
        />
      </div>

      <div className="box" data-unknown={(t?.resourcesGiven?.length ?? 0) === 0}>
        <div className="box-label">Resources</div>
        {(t?.resourcesGiven ?? []).map((r) => (
          <div key={r}>{r}</div>
        ))}
        {(t?.resourcesGiven?.length ?? 0) === 0 && <div className="qmark">?</div>}
        {(t?.resourcesToAskFor?.length ?? 0) > 0 && (
          <>
            <div className="box-label" style={{ marginTop: 8 }}>
              ask for
            </div>
            {t!.resourcesToAskFor!.map((r) => (
              <div key={r.resource} className="hint">
                · {r.resource}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="box" data-unknown={!t?.timeBound?.value}>
        <div className="box-label">Time bound</div>
        {t?.timeBound?.value ? (
          <div className="box-main">{t.timeBound.value}</div>
        ) : (
          <div className="qmark" title="Absent from the prompt — ask for it">
            ?
          </div>
        )}
        <input
          type="text"
          placeholder="e.g. one week"
          defaultValue={t?.timeBound?.value ?? ""}
          onBlur={(e) =>
            setTriage({
              timeBound: { value: e.target.value || null, source: "must_ask" },
            })
          }
          style={{ marginTop: 8 }}
        />
      </div>
    </div>
  );
}
