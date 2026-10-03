/**
 * Inline SVG icon registry for the admin console.
 *
 * The project ships no icon package (and no bundler), so the UI cannot import
 * Lucide. These are hand-inlined Lucide-style paths: 24x24 viewBox, stroked
 * with `currentColor`, so every icon inherits the colour of its container and
 * costs no network request.
 */

const PATHS = {
  logo: '<path d="M4 16.5 9 11l3.5 3.5L20 7"/><path d="M14.5 7H20v5.5"/>',
  dashboard: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  transactions: '<path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>',
  withdrawals: '<path d="M12 3.5v11"/><path d="M7.5 10 12 14.5 16.5 10"/><path d="M4.5 19.5h15"/>',
  devices: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M17.5 14.6a5.5 5.5 0 0 1 3 4.9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  logs: '<path d="M5.5 4.5h13v15h-13z"/><path d="M8.5 9h7M8.5 12h7M8.5 15h4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.5-2.4 2.5"/><path d="M12 17h.01"/>',
  shield: '<path d="M12 2.8 4.5 6v6c0 4.5 3.2 8.2 7.5 9.3 4.3-1.1 7.5-4.8 7.5-9.3V6Z"/><path d="M9.2 12.2l2 2 3.6-3.8"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.6-3.6"/>',
  bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z"/><path d="M13.7 19a2 2 0 0 1-3.4 0"/>',
  chevronDown: '<path d="M6 9.5l6 6 6-6"/>',
  chevronRight: '<path d="M9.5 6l6 6-6 6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8.5 3.5V6.5M15.5 3.5V6.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  wallet: '<path d="M3.5 8.5h17v11h-17z"/><path d="M3.5 8.5 5.5 4h13l2 4.5"/><path d="M12 12v4.5M12 16.5 10 14.5M12 16.5l2-2"/>',
  arrowUpRight: '<path d="M5 15l5-5 4 4 5.5-6"/><path d="M14.5 7H20v5.5"/>',
  send: '<path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-7.5L3 9.5Z"/>',
  phone: '<path d="M7 3.5h3l1.5 4-2 1.5a10 10 0 0 0 4.5 4.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z"/>',
  banknote: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
  battery: '<rect x="2.5" y="7.5" width="16" height="9" rx="2.5"/><path d="M21.5 11v2"/>',
  signal: '<path d="M4.5 20v-4M9.5 20V12M14.5 20V8M19.5 20V4"/>',
  monitor: '<rect x="3.5" y="4.5" width="17" height="12" rx="2.5"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  bolt: '<path d="M13.5 3 5.5 13.5h5L10 21l8.5-10.5h-5Z"/>',
  refresh: '<path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 19 4M15.5 7.5l2 2M18 5l2 2"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="3"/><path d="M8.5 10V7.6a3.5 3.5 0 0 1 7 0V10"/><path d="M12 14.5v2.5"/>',
  unlock: '<rect x="4.5" y="10" width="15" height="10.5" rx="3"/><path d="M8.5 10V7.6a3.5 3.5 0 0 1 6.8-1.2"/><path d="M12 14.5v2.5"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.9 5.9A10.6 10.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.3 4M6.2 8.1A17 17 0 0 0 2.5 12S6 18.2 12 18.2c1.2 0 2.2-.2 3.1-.6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  block: '<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>',
  inbox: '<path d="M3.5 13.5h4l1.5 3h6l1.5-3h4"/><path d="M5.6 5.2 3.5 13.5v4a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4l-2.1-8.3A2 2 0 0 0 16.5 4h-9a2 2 0 0 0-1.9 1.2Z"/>',
  trash: '<path d="M4.5 6.5h15"/><path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5"/>',
  sparkle: '<path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18l-1.8-5.4L4.7 10.8 10.2 9Z"/>',

  /* ---- Mobile app shell: bottom navigation, headers and screen chrome ---- */

  /** Bottom-nav "Home". */
  home: '<path d="M3.5 10.6 12 3.6l8.5 7"/><path d="M5.8 12.4v7.2a1 1 0 0 0 1 1h3.4v-5.1h3.6v5.1h3.4a1 1 0 0 0 1-1v-7.2"/>',
  /** Bottom-nav "More": three stacked dots. */
  more: '<circle cx="12" cy="5.2" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18.8" r="1.6"/>',
  /** Back arrow for a pushed sub-screen. */
  arrowLeft: '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  /** "Today" summary tile. */
  calendarCheck: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8.5 3.5V6.5M15.5 3.5V6.5"/><path d="M9 14.5l2 2 4-4"/>',
  /** Cash-in: arrow into a wallet. */
  cashIn: '<path d="M3.5 8.5h17v11h-17z"/><path d="M3.5 8.5 5.5 4h13l2 4.5"/><path d="M12 14v-4"/><path d="M9.8 12.2 12 10l2.2 2.2"/>',
  /** Withdrawals: arrow out of a wallet. */
  cashOut: '<path d="M3.5 8.5h17v11h-17z"/><path d="M3.5 8.5 5.5 4h13l2 4.5"/><path d="M12 12v4"/><path d="M9.8 13.8 12 16l2.2-2.2"/>',
  /** SIM card glyph for the device detail rows. */
  sim: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h4.5"/><rect x="8.8" y="11" width="6.4" height="5" rx="1.4"/>',
  /** Signal bars: network generation. */
  wifi: '<path d="M3.5 9.2a13 13 0 0 1 17 0"/><path d="M7 12.7a8.4 8.4 0 0 1 10 0"/><path d="M10.4 16.2a3.9 3.9 0 0 1 3.2 0"/><path d="M12 19.6h.01"/>',
  /** Device identity / handset id. */
  fingerprint: '<path d="M12 3.5a8.5 8.5 0 0 0-8.5 8.5v1.4"/><path d="M20.5 12a8.5 8.5 0 0 0-4.6-7.7"/><path d="M8 20.5a12 12 0 0 0 1.5-6.5 2.5 2.5 0 0 1 5 0c0 1.6-.2 3.2-.7 4.7"/><path d="M15.9 20.3c.8-1.8 1.2-3.7 1.3-5.6"/><path d="M12 12v3.4"/>',
  /** Power / restart. */
  power: '<path d="M12 3.5v8"/><path d="M17.7 6.6a8 8 0 1 1-11.4 0"/>',
  /** Generic toggle switch knob. */
  toggle: '<rect x="2.5" y="7" width="19" height="10" rx="5"/>',
  /** Log out. */
  logout: '<path d="M14.5 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h8"/><path d="M11 12h9"/><path d="M17 8.5 20.5 12 17 15.5"/>',
  /** Profile / account. */
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.4 7.4 0 0 1 14.4 0"/>',
  /** About / information. */
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
  /** Notifications tab state. */
  bellMuted: '<path d="M18 8.5a6 6 0 0 0-8.4-5.5"/><path d="M6.2 6.6A6 6 0 0 0 6 8.5c0 5-2 6.5-2 6.5h13"/><path d="M13.7 19a2 2 0 0 1-3.4 0"/><path d="M4 4l16 16"/>',
  /** Empty-state / generic no data. */
  empty: '<rect x="3.5" y="5.5" width="17" height="14" rx="3"/><path d="M3.5 10.5h17"/><path d="M9 15h6"/>',
  /** Filter tab marker. */
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  /** Busy indicator for the Sign In button; paired with the CSS `spin` class. */
  loader: '<path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/>'
} as const;

export type IconName = keyof typeof PATHS;

/**
 * Renders an icon as an inline `<svg>`.
 *
 * @param name  Key of the icon registry.
 * @param size  Pixel box size; the stroke is scaled so it stays optically even.
 * @param className Optional extra class for sizing/colouring from CSS.
 */
export function icon(name: IconName, size = 20, className = ''): string {
  const body = PATHS[name];
  if (!body) throw new Error(`Unknown admin icon: ${name}`);
  return (
    `<svg class="ico${className ? ' ' + className : ''}" viewBox="0 0 24 24" width="${size}" height="${size}" ` +
    `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`
  );
}