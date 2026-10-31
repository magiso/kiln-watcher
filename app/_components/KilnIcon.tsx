import type { CSSProperties, ReactNode } from "react";
import type { DisplayState } from "@/lib/domain/types";

// Artwork from public/icons/kiln-*.svg (docs/design/README.md#icons), inlined so the
// multiply-blended circles mix with the card colour behind them. The kiln-* classes
// animate it (app/globals.css); the resting frame is the static design.
const MULTIPLY: CSSProperties = { mixBlendMode: "multiply" };

const LABELS: Record<DisplayState, string> = {
  CLOSED: "Kiln closed and firing",
  OPEN_FULL: "Kiln open and full of pots",
  OPEN_EMPTY: "Kiln empty and ready for the next load",
  OFFLINE: "Sensor disconnected",
};

const ARTWORK: Record<DisplayState, ReactNode> = {
  CLOSED: (
    <>
      <circle className="kiln-glow" cx="135" cy="128" r="104" fill="#FFE9A3" style={MULTIPLY}/>
      <circle className="kiln-glow kiln-glow-b" cx="225" cy="118" r="78" fill="#C9B8F5" style={MULTIPLY}/>
      <g className="kiln-flame">
      <path d="M167 30 C195 80 230 105 230 160 C230 205 200 236 167 236 C134 236 104 205 104 160 C104 122 128 104 140 72 C152 100 162 108 167 30 Z" fill="#FFE9A3"/>
      <path d="M173 24 C201 74 236 99 236 154 C236 199 206 230 173 230 C140 230 110 199 110 154 C110 116 134 98 146 66 C158 94 168 102 173 24 Z" fill="none" stroke="#2F2A4A" strokeWidth="5" strokeLinejoin="round"/>
      </g>
      <circle className="kiln-ember" cx="132" cy="44" r="5" fill="#2F2A4A"/>
      <circle className="kiln-ember kiln-ember-b" cx="214" cy="56" r="4" fill="#2F2A4A"/>
    </>
  ),
  OPEN_FULL: (
    <>
      <circle className="kiln-glow" cx="120" cy="120" r="96" fill="#FFB5C8" style={MULTIPLY}/>
      <circle className="kiln-glow kiln-glow-b" cx="226" cy="140" r="84" fill="#FFE9A3" style={MULTIPLY}/>
      <g transform="translate(27,-14) scale(1.4)" fill="#FFB5C8">
      <g className="kiln-pot"><path d="M38 156 C26 128 42 108 50 98 L50 78 L66 78 L66 98 C74 108 90 128 78 156 Z"/></g>
      <g className="kiln-pot kiln-pot-2"><path d="M86 124 L148 124 C148 146 134 156 117 156 C100 156 86 146 86 124 Z"/></g>
      <g className="kiln-pot kiln-pot-3"><rect x="138" y="104" width="34" height="52" rx="6"/></g>
      </g>
      <g transform="translate(32,-19) scale(1.4)" fill="none" stroke="#2F2A4A" strokeWidth="3.5" strokeLinejoin="round">
      <g className="kiln-pot"><path d="M38 156 C26 128 42 108 50 98 L50 78 L66 78 L66 98 C74 108 90 128 78 156 Z"/></g>
      <g className="kiln-pot kiln-pot-2"><path d="M86 124 L148 124 C148 146 134 156 117 156 C100 156 86 146 86 124 Z"/></g>
      <g className="kiln-pot kiln-pot-3">
      <rect x="138" y="104" width="34" height="52" rx="6"/>
      <path d="M172 116 C186 116 186 142 172 142"/>
      </g>
      <path d="M22 162 L186 162"/>
      </g>
    </>
  ),
  OPEN_EMPTY: (
    <>
      <circle className="kiln-glow" cx="118" cy="132" r="100" fill="#FFB5C8" style={MULTIPLY}/>
      <circle className="kiln-glow kiln-glow-b" cx="228" cy="112" r="80" fill="#C9B8F5" style={MULTIPLY}/>
      <rect x="78" y="46" width="150" height="160" rx="18" fill="#FFE9A3"/>
      <rect x="84" y="40" width="150" height="160" rx="18" fill="none" stroke="#2F2A4A" strokeWidth="5"/>
      <path d="M234 46 L280 70 L280 222 L234 198" fill="none" stroke="#2F2A4A" strokeWidth="5" strokeLinejoin="round"/>
      <rect className="kiln-dash" x="108" y="66" width="102" height="108" rx="8" fill="none" stroke="#2F2A4A" strokeWidth="4" strokeDasharray="10 9"/>
      <path className="kiln-plus" d="M159 98 L159 142 M137 120 L181 120" stroke="#2F2A4A" strokeWidth="6" strokeLinecap="round"/>
    </>
  ),
  OFFLINE: (
    <>
      <circle cx="120" cy="130" r="98" fill="#FFE9A3" style={MULTIPLY}/>
      <circle cx="232" cy="120" r="76" fill="#FFB5C8" style={MULTIPLY}/>
      <g className="kiln-plug">
      <path d="M18 160 C56 160 64 132 96 132" fill="none" stroke="#2F2A4A" strokeWidth="6" strokeLinecap="round"/>
      <rect x="90" y="111" width="54" height="54" rx="12" fill="#FFE9A3"/>
      <rect x="96" y="105" width="54" height="54" rx="12" fill="none" stroke="#2F2A4A" strokeWidth="5"/>
      <rect x="150" y="116" width="22" height="9" rx="3" fill="#2F2A4A"/>
      <rect x="150" y="139" width="22" height="9" rx="3" fill="#2F2A4A"/>
      </g>
      <g className="kiln-socket">
      <rect x="198" y="105" width="56" height="60" rx="14" fill="#FFE9A3"/>
      <rect x="204" y="99" width="56" height="60" rx="14" fill="none" stroke="#2F2A4A" strokeWidth="5"/>
      <rect x="214" y="115" width="10" height="9" rx="2" fill="#2F2A4A"/>
      <rect x="214" y="136" width="10" height="9" rx="2" fill="#2F2A4A"/>
      <path d="M260 129 C286 129 292 100 320 100" fill="none" stroke="#2F2A4A" strokeWidth="6" strokeLinecap="round"/>
      </g>
      <path className="kiln-sparks" d="M188 92 L188 72 M174 96 L164 80 M202 96 L212 80 M188 170 L188 190 M174 166 L164 182 M202 166 L212 182" stroke="#2F2A4A" strokeWidth="5" strokeLinecap="round"/>
    </>
  ),
};

export function KilnIcon({ state, className }: { state: DisplayState; className?: string }) {
  return (
    <svg viewBox="0 0 334 260" role="img" aria-label={LABELS[state]} className={className ? `kiln-icon ${className}` : "kiln-icon"}>
      {ARTWORK[state]}
    </svg>
  );
}
