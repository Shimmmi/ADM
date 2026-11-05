/** Inline SVG: предметы и почтовая печать. Без внешних адресов и шрифтов. */

function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="currentColor" aria-hidden="true">${body}</svg>`;
}

function seal(color: string): string {
  return svg(
    `<circle cx="16" cy="16" r="11.5" fill="${color}" stroke="currentColor" stroke-width="1.6"/>` +
    `<circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  );
}

const DIAMOND = svg(
  `<polygon points="16,2 30,16 16,30 2,16" fill="#ffd987" stroke="#8a6a2a" stroke-width="1.4"/>` +
  `<polygon points="16,8 24,16 16,24 8,16" fill="none" stroke="#8a6a2a" stroke-width="1.2"/>`,
);

const ICONS: Record<string, string> = {
  staff: svg(
    `<path d="M19 28V12c0-5-8.2-5-8.2 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="10.8" cy="7.4" r="2.5"/>`,
  ),
  mittens: svg(
    `<path fill-rule="evenodd" d="M9 6h7c3.2 0 5.5 2.4 5.5 5.4V20c0 3-2.2 5.2-5.2 5.2h-6.1C7.4 25.2 5.5 23 5.5 20v-3.5H4c-1.8 0-3.2-1.5-3.2-3.3 0-1.9 1.5-3.4 3.3-3.4H5.5V11.2C5.5 8.2 7.2 6 9 6zM8 21.3h11.2v1.6H8z"/>`,
  ),
  fan: svg(
    `<path d="M4 25Q16 3 28 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M8 24Q16 10 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M12 23Q16 16 20 23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="16" cy="26.2" r="2.1"/>`,
  ),
  oil: svg(
    `<path d="M16 2c1.3 1.8 2.4 2.8 0 5-2.4-2.2-1.3-3.2 0-5z"/>` +
    `<rect x="13" y="8" width="6" height="4" rx="1"/>` +
    `<path d="M10 13h12l1.2 2.4V25a3 3 0 0 1-3 3h-8.4a3 3 0 0 1-3-3v-9.6z"/>`,
  ),
  kite: svg(
    `<polygon points="16,2 28,15 16,30 4,15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M16 2v28M4 15h24" fill="none" stroke="currentColor" stroke-width="1.5"/>` +
    `<path d="M16 30c2.2 2.2 3.4 4 .8 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  ),
  flour: svg(
    `<path d="M11 14h10c1.8 0 3 1.5 2.6 3.2L22 26c-.4 1.8-2.6 3.2-6 3.2s-5.6-1.4-6-3.2l-1.6-8.8C8 15.5 9.2 14 11 14z"/>` +
    `<path d="M12.2 14c.5-2.6 7.1-2.6 7.6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),
  meat: svg(
    `<ellipse cx="18" cy="17.5" rx="8.5" ry="6.4"/>` +
    `<circle cx="8.2" cy="12" r="3.2"/>` +
    `<circle cx="8.2" cy="22" r="3.2"/>`,
  ),
  onion: svg(
    `<ellipse cx="16" cy="19" rx="8" ry="8.6"/>` +
    `<path d="M16 11V5M13 7.2c1.8-2.8 5.4-.6 4.2 1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),
  spice: svg(
    `<path d="M17 3c6.2 6 7.2 13-.6 25.2C9.5 16 10 8 17 3z"/>` +
    `<path d="M16.4 27.2c1.8 1.2 2.8 2.4 1.6 3.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),
  shard: svg(
    `<polygon points="16,2 27,16 16,30"/>` +
    `<polygon points="16,2 5,16 16,30" opacity=".62"/>`,
  ),
  tea: svg(
    `<path fill-rule="evenodd" d="M4 15h24v12H4zM4 19.2h24v2.4H4z"/>` +
    `<path d="M4 15 16 7l12 8v1.6H4z"/>`,
  ),
  camera_body: svg(
    `<path fill-rule="evenodd" d="M3 12h26v14H3zM16 19m-4.2 0a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0"/>` +
    `<polygon points="12,12 13.2,7 20.8,7 22,12"/>`,
  ),
  seal_w: seal('#f4f1e6'),
  seal_u: seal('#3d78c4'),
  seal_b: seal('#2a2530'),
  seal_r: seal('#c8402f'),
  seal_g: seal('#3f8b4a'),
  passport: svg(
    `<path fill-rule="evenodd" d="M6 4h17a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H6zM16 16m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0"/>` +
    `<path d="M10 4v24" fill="none" stroke="currentColor" stroke-width="2"/>`,
  ),
  lens: svg(
    `<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="3"/>` +
    `<circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="2"/>` +
    `<circle cx="12" cy="12" r="1.7"/>`,
  ),
  film: svg(
    `<path fill-rule="evenodd" d="M3 8h26v16H3zM11 12.5h10v7H11z"/>` +
    `<path d="M5.2 9.7h2.1v1.7h-2.1zM24.6 9.7h2.1v1.7h-2.1zM5.2 15.1h2.1v1.7h-2.1zM24.6 15.1h2.1v1.7h-2.1zM5.2 20.5h2.1v1.7h-2.1zM24.6 20.5h2.1v1.7h-2.1z"/>`,
  ),
  strap: svg(
    `<path d="M5 23C5 9 27 9 27 23" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>` +
    `<rect x="11" y="18" width="10" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/>`,
  ),
  tripod: svg(
    `<path d="M16 9 6 28M16 9v19M16 9l10 19" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>` +
    `<rect x="12" y="4" width="8" height="5.5" rx="1.2"/>`,
  ),
  pass: svg(
    `<path fill-rule="evenodd" d="M5 9h22a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2zM4 16m-2.3 0a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0M28 16m-2.3 0a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0"/>` +
    `<path d="M15 11.5v9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="1.8 2.1"/>`,
  ),
  camera: svg(
    `<path d="M7 13C4.5 7 27.5 7 25 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
    `<path fill-rule="evenodd" d="M4 14h24v11H4zM21 19.5m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0"/>` +
    `<rect x="8" y="10" width="7" height="4" rx=".8"/>` +
    `<path d="M16 25v4.2M11.5 29.2h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),
};

/** Иконка предмета. Неизвестный ключ — золотой ромб. */
export function iconSvg(icon: string): string {
  return ICONS[icon] ?? DIAMOND;
}

const MANA = ['#f4f1e6', '#3d78c4', '#2a2530', '#c8402f', '#3f8b4a'];

function stampNo(id: string): string {
  const m = /(\d+)/.exec(id);
  return m ? String(parseInt(m[1], 10)) : '';
}

/** Круглая красная печать: двойное кольцо, номер (S01 → 1) и пять точек маны. */
export function stampSvg(id: string, size = 64): string {
  const n = stampNo(id);
  const dots = MANA.map((color, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    const x = 32 + Math.cos(a) * 24.8;
    const y = 32 + Math.sin(a) * 24.8;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2" fill="${color}" stroke="#c0303c" stroke-width="0.4"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">` +
    `<circle cx="32" cy="32" r="28.5" fill="none" stroke="#c0303c" stroke-width="2.2"/>` +
    `<circle cx="32" cy="32" r="21.5" fill="none" stroke="#c0303c" stroke-width="1.3"/>` +
    dots +
    `<text x="32" y="32" text-anchor="middle" dominant-baseline="central" fill="#c0303c" font-family="system-ui,sans-serif" font-size="22" font-weight="700">${n}</text>` +
    `</svg>`;
}
