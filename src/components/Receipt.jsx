// The receipt card. One component for every surface that shows a signed record, so the
// portfolio, the challenge page and the verify page cannot end up describing the same
// cryptographic state three different ways.
//
// The mode is printed rather than implied. A hash and a signature look identical as a
// string of characters, and the one thing this app must never do is let a weaker check
// pass for a stronger one.
import { useEffect, useRef } from "react";
import { Card, H2, Badge, cn } from "./ui.jsx";
import { receiptBadge, modeLabel } from "../lib/sign.js";

export function ReceiptCard({ receipt = null, qrValue = "", title = "Signed receipt", note, action, className = "" }) {
  const canvas = useRef(null);
  const badge = receiptBadge(receipt || {});

  useEffect(() => {
    if (!qrValue || !canvas.current) return undefined;
    let alive = true;
    (async () => {
      try {
        const { toCanvas } = await import("qrcode");
        if (alive && canvas.current) {
          await toCanvas(canvas.current, qrValue, { width: 132, margin: 1 });
        }
      } catch {
        // the payload below is the record; the QR is only a convenience for a phone
      }
    })();
    return () => {
      alive = false;
    };
  }, [qrValue]);

  if (!receipt) return null;
  const rows = [
    ["mode", receipt.mode || "unsigned"],
    ["key", receipt.kid || "none"],
    ["algorithm", receipt.alg || "none"],
    ["signed at", receipt.at ? new Date(receipt.at).toISOString().slice(0, 19).replace("T", " ") : "unknown"],
  ];

  return (
    <Card className={cn("", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {title ? <H2 className="mb-0">{title}</H2> : <span />}
        <Badge tone={badge.tone}>{badge.text}</Badge>
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1">
          <dl className="space-y-1.5">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 text-xs">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="min-w-0 truncate font-mono text-zinc-300" title={String(v)}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-pretty text-xs leading-5 text-zinc-500">{modeLabel(receipt.mode)}</p>
          {note && <p className="mt-1.5 text-pretty text-xs leading-5 text-zinc-500">{note}</p>}
          {action && <div className="mt-2">{action}</div>}
          <p className="mt-2 text-pretty text-xs leading-5 text-zinc-600">
            This proves the record has not been altered since it was signed. It does not by itself prove who signed
            it: anyone can generate a key, so the key has to be pinned separately for that claim.
          </p>
        </div>
        {qrValue && (
          <canvas
            ref={canvas}
            width="132"
            height="132"
            className="shrink-0 rounded-md border border-zinc-800 bg-white p-1"
            role="img"
            aria-label="QR code that opens the verification page for this receipt"
          />
        )}
      </div>
    </Card>
  );
}
