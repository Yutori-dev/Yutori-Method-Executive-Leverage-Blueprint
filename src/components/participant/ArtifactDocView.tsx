import { Card } from "@/components/ui/Card";
import type { ArtifactDoc } from "@/lib/artifactDocs";

/** HTML rendering of an ArtifactDoc -- used by the portal's artifacts page
 * and the admin's view, so both show exactly what the participant sees. */
export function ArtifactDocView({ doc }: { doc: ArtifactDoc }) {
  return (
    <Card>
      <h2 className="font-serif text-xl">{doc.title}</h2>
      <div className="mt-4 space-y-6">
        {doc.sections.map((s, i) => (
          <section key={i}>
            {s.heading ? <h3 className="font-serif text-base">{s.heading}</h3> : null}
            {s.intro ? <p className="mt-1 text-sm text-(--color-ink-muted)">{s.intro}</p> : null}
            <div className="mt-3 space-y-3">
              {s.groups.map((g, j) => (
                <div key={j}>
                  {g.label ? <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">{g.label}</p> : null}
                  <ul className="mt-1 space-y-1.5">
                    {g.lines.map((l, k) => (
                      <li key={k} className={`text-sm text-(--color-ink) ${l.quote ? "italic" : ""}`}>
                        {l.text}
                        {l.sub ? <span className="block text-xs text-(--color-ink-muted)">{l.sub}</span> : null}
                        {l.note ? <span className="block text-xs">{l.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {s.closing?.filter(Boolean).map((c, k) => (
              <p key={k} className="mt-3 text-sm text-(--color-ink-muted)">{c}</p>
            ))}
          </section>
        ))}
      </div>
    </Card>
  );
}
