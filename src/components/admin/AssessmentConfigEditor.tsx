"use client";

import { useState, useTransition } from "react";
import { saveAssessmentVersion } from "@/lib/actions/assessmentConfig";
import { validateAssessmentConfig } from "@/lib/assessmentConfigValidation";

type J = string | number | boolean | null | J[] | { [k: string]: J };
type Obj = { [k: string]: J };

const isObj = (v: J): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const HIDDEN_ROOT = new Set(["is_current", "version"]);
/** Objects whose KEYS are themselves editable content (option wording used as a key). */
const MAP_KEYS = new Set(["scale_values"]);
const INTERNAL_KEYS = new Set(["id", "value", "type", "variant"]);

const humanize = (k: string) =>
  k
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

function itemTitle(item: J, i: number): string {
  if (isObj(item)) {
    for (const k of ["name", "label", "title", "prompt", "id"]) {
      const v = item[k];
      if (typeof v === "string" && v.trim()) return `${i + 1}. ${v.length > 70 ? `${v.slice(0, 70)}…` : v}`;
    }
  }
  if (typeof item === "string") return `${i + 1}. ${item.length > 70 ? `${item.slice(0, 70)}…` : item}`;
  return `Item ${i + 1}`;
}

const inputCls = "w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-1.5 text-sm outline-none focus:border-(--color-accent)";
const smallBtn = "rounded border border-(--color-hairline) px-2 py-0.5 text-xs hover:border-(--color-accent) disabled:opacity-30";

function Leaf({ value, onChange }: { value: string | number | boolean | null; onChange: (v: J) => void }) {
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {value ? "Yes" : "No"}
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={`${inputCls} max-w-[10rem]`}
      />
    );
  }
  const text = value ?? "";
  if (text.length > 90 || text.includes("\n")) {
    return <textarea value={text} rows={Math.min(8, Math.max(3, Math.ceil(text.length / 90)))} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
  }
  return <input value={text} onChange={(e) => onChange(value === null && e.target.value === "" ? null : e.target.value)} className={inputCls} />;
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function ListEditor({ label, list, onChange }: { label: string; list: J[]; onChange: (v: J[]) => void }) {
  const objects = list.length > 0 && list.every(isObj);
  const primitives = list.every((v) => v === null || typeof v !== "object");
  if (!objects && !primitives) {
    return <p className="text-xs text-(--color-ink-muted)">&quot;{label}&quot; has a nested structure that isn&apos;t editable here.</p>;
  }
  const add = () => {
    if (objects) onChange([...list, JSON.parse(JSON.stringify(list[list.length - 1]))]);
    else onChange([...list, typeof list[0] === "number" ? 0 : ""]);
  };
  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className={objects ? "rounded-xl border border-(--color-hairline)" : "flex items-center gap-2"}>
          {objects ? (
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-(--color-ink)">{itemTitle(item, i)}</span>
                <span className="flex gap-1" onClick={(e) => e.preventDefault()}>
                  <button type="button" className={smallBtn} disabled={i === 0} onClick={() => onChange(move<J>(list, i, i - 1))}>↑</button>
                  <button type="button" className={smallBtn} disabled={i === list.length - 1} onClick={() => onChange(move<J>(list, i, i + 1))}>↓</button>
                  <button type="button" className={smallBtn} onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button>
                </span>
              </summary>
              <div className="border-t border-(--color-hairline) p-3">
                <Node value={item} label={label} onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))} depth={2} />
              </div>
            </details>
          ) : (
            <>
              <span className="w-6 text-xs text-(--color-ink-muted)">{i + 1}.</span>
              <div className="flex-1"><Leaf value={item as string | number | null} onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))} /></div>
              <button type="button" className={smallBtn} disabled={i === 0} onClick={() => onChange(move<J>(list, i, i - 1))}>↑</button>
              <button type="button" className={smallBtn} disabled={i === list.length - 1} onClick={() => onChange(move<J>(list, i, i + 1))}>↓</button>
              <button type="button" className={smallBtn} onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button>
            </>
          )}
        </div>
      ))}
      {list.length > 0 || !objects ? (
        <button type="button" className={smallBtn} onClick={add}>+ Add {objects ? "another" : "option"}</button>
      ) : null}
    </div>
  );
}

function MapEditor({ value, onChange }: { value: Obj; onChange: (v: Obj) => void }) {
  const entries = Object.entries(value);
  const rename = (oldKey: string, newKey: string) => {
    const next: Obj = {};
    for (const [k, v] of entries) next[k === oldKey ? newKey : k] = v;
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <input value={k} onChange={(e) => rename(k, e.target.value)} className={`${inputCls} flex-1`} />
          <input type="number" value={typeof v === "number" ? v : 0} onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) })} className={`${inputCls} max-w-[6rem]`} />
          <button type="button" className={smallBtn} onClick={() => { const n = { ...value }; delete n[k]; onChange(n); }}>Remove</button>
        </div>
      ))}
      <button type="button" className={smallBtn} onClick={() => onChange({ ...value, [`New option ${entries.length + 1}`]: 0 })}>+ Add</button>
    </div>
  );
}

function Node({ value, label, onChange, depth }: { value: J; label: string; onChange: (v: J) => void; depth: number }) {
  if (Array.isArray(value)) return <ListEditor label={label} list={value} onChange={onChange} />;
  if (isObj(value)) {
    if (MAP_KEYS.has(label) && Object.values(value).every((v) => typeof v === "number")) {
      return <MapEditor value={value} onChange={onChange} />;
    }
    return (
      <div className="space-y-4">
        {Object.entries(value).map(([k, v]) => {
          if (depth === 0 && HIDDEN_ROOT.has(k)) return null;
          const nested = v !== null && typeof v === "object";
          const set = (nv: J) => onChange({ ...value, [k]: nv });
          if (nested && depth <= 1) {
            return (
              <details key={k} open={depth === 1} className="rounded-xl border border-(--color-hairline)">
                <summary className="cursor-pointer px-3 py-2 font-serif text-base">{humanize(k)}</summary>
                <div className="border-t border-(--color-hairline) p-3"><Node value={v} label={k} onChange={set} depth={depth + 1} /></div>
              </details>
            );
          }
          return (
            <div key={k}>
              <label className="block text-xs font-medium text-(--color-ink-muted)">
                {humanize(k)}
                {INTERNAL_KEYS.has(k) ? <span className="ml-2 font-normal italic">internal - changing it changes how answers are matched</span> : null}
              </label>
              <div className="mt-1">{nested ? <Node value={v} label={k} onChange={set} depth={depth + 1} /> : <Leaf value={v as string | number | boolean | null} onChange={set} />}</div>
            </div>
          );
        })}
      </div>
    );
  }
  return <Leaf value={value} onChange={onChange} />;
}

export function AssessmentConfigEditor({ assessmentKey, initial, version }: { assessmentKey: string; initial: string; version: number }) {
  const original = JSON.parse(initial) as Obj;
  const [config, setConfig] = useState<Obj>(original);
  const [message, setMessage] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [pending, start] = useTransition();
  const changed = JSON.stringify(config) !== JSON.stringify(original);

  function save() {
    const problems = validateAssessmentConfig(assessmentKey, original, config);
    if (problems.length > 0) {
      setMessage({ ok: false, lines: problems });
      return;
    }
    start(async () => {
      const r = await saveAssessmentVersion(assessmentKey, JSON.stringify(config));
      setMessage(
        r.ok
          ? { ok: true, lines: [`Saved as version ${r.version}. New participants get it now; earlier submissions keep the version they completed.`] }
          : { ok: false, lines: r.message.split("\n") },
      );
    });
  }

  return (
    <div>
      <p className="text-xs text-(--color-ink-muted)">Editing from version {version}. Saving creates a new version; nothing already submitted changes.</p>
      <div className="mt-4"><Node value={config} label="" onChange={(v) => setConfig(v as Obj)} depth={0} /></div>
      <div className="sticky bottom-0 mt-6 border-t border-(--color-hairline) bg-(--color-bg,transparent) py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={pending || !changed} className="rounded-full border border-(--color-hairline) px-4 py-1.5 text-sm font-medium hover:border-(--color-accent) disabled:opacity-50">
            {pending ? "Saving…" : "Save as new version"}
          </button>
          {!changed ? <span className="text-xs text-(--color-ink-muted)">No changes yet.</span> : null}
        </div>
        {message ? (
          <ul className={`mt-2 space-y-0.5 text-sm ${message.ok ? "text-(--color-ink)" : "text-red-600"}`}>
            {message.lines.map((l, i) => (<li key={i}>{l}</li>))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
