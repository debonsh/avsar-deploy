import { useState } from "react";
import { Page, Card, Btn, Field, Chip, inputCls } from "../components/ui.jsx";
import { FDPS, FDP_KINDS } from "../data/fdps.js";
import { loadInterests, toggleInterest, recordInterest } from "../lib/store.js";

export default function Faculty() {
  const [kind, setKind] = useState("all");
  const [interested, setInterested] = useState(() => loadInterests());

  const list = FDPS.filter((f) => kind === "all" || f.kind === kind);

  function toggle(f) {
    setInterested(toggleInterest(f.id));
    recordInterest(f).catch(() => {});
  }

  return (
    <Page
      title="Faculty"
      kicker="Desk · Academicians"
      sub="FDPs, research fellowships, consultancy, and workshops worth your semester break."
    >
      <Card>
        <Field label="Show">
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">Everything ({FDPS.length})</option>
            {Object.entries(FDP_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </Card>

      <div className="mt-4 space-y-3">
        {list.map((f) => {
          const on = interested.includes(f.id);
          return (
            <Card key={f.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">{f.title}</h3>
                  <p className="text-sm text-zinc-400">{f.org} · {f.loc}{f.deadline ? ` · apply by ${f.deadline}` : ""}</p>
                </div>
                <Chip tone={on ? "green" : "zinc"}>{FDP_KINDS[f.kind]}</Chip>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-blurple px-4 py-2 text-sm font-medium text-white hover:bg-blurple-deep" href={f.url} target="_blank" rel="noreferrer">
                  Open official page
                </a>
                <Btn variant="quiet" onClick={() => toggle(f)}>
                  {on ? "Interested (saved)" : "Mark interested"}
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
