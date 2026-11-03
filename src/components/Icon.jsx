// Line icons drawn for this site (24px grid, 1.8 stroke). Category and badge icons share the same set.
const P = {
  search: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM21 21l-5.2-5.2',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  down: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4.5 12.5l4.5 4.5 10.5-11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  calendar: 'M4 6.5h16v13.5H4zM4 10.5h16M8.5 3.5v5M15.5 3.5v5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6',
  squad: 'M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM15.8 10.4a2.6 2.6 0 1 0 0-5.2M2.5 19.5c.8-3.4 3.2-5.2 6-5.2s5.2 1.8 6 5.2M16.5 13.8c2.4.2 4.3 1.9 5 5.2',
  ticket: 'M3.5 8V6h17v2a2.5 2.5 0 0 0 0 5v2h-17v-2a2.5 2.5 0 0 0 0-5ZM3.5 15v3h17v-3M14 6v12',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3ZM8.8 12.2l2.2 2.2 4.4-4.6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5.2l3.4 2',
  card: 'M3 6.5h18v11H3zM3 10h18M7 14.5h4',
  chat: 'M4 18.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H8l-4 2.5Z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3.5Z',
  dune: 'M2.5 18.5c3-5 6.5-7.5 9.5-7.5 2.6 0 4.2 1.4 5.3 3M10 18.5c2.2-2.7 4.6-4 7-4 1.6 0 3 .6 4.5 1.8M16.5 6.5a2 2 0 1 0 0-.1',
  wave: 'M2.5 9c2 0 2-1.5 4-1.5S8.5 9 10.5 9s2-1.5 4-1.5S16.5 9 18.5 9s2-1.5 3-1.5M2.5 14c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5M2.5 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5',
  boat: 'M3 15.5h18l-2.5 4h-13L3 15.5ZM12 3.5v12M12 4.5l6.5 9H12M12 6.5L6.5 13.5H12',
  tower: 'M12 2.5v3M10.5 5.5h3l1 15.5h-5l1-15.5ZM8 21h8M11 9.5h2M10.8 13.5h2.4',
  loop: 'M3 19.5c3 0 4-2.5 5.5-6.5S11 5 14 5s4.5 2.5 4.5 5-2 4.5-4.5 4.5S9.5 12 9.5 9.5M3 21h18',
  slide: 'M4 20.5V8.5a4 4 0 0 1 8 0c0 5 3 8 8 8M4 20.5h16M4 12.5h5',
  columns: 'M3.5 9.5L12 4l8.5 5.5M5 9.5h14M6.5 9.5v8.5M10 9.5v8.5M14 9.5v8.5M17.5 9.5v8.5M4 20.5h16',
  road: 'M8 3.5L4 20.5M16 3.5l4 17M12 4v2.5M12 10v3M12 16.5v3.5',
  flag: 'M5.5 21V3.5M5.5 4.5h12l-2.5 4 2.5 4h-12',
  pin: 'M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21ZM12 12.3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  moon: 'M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z',
  bolt: 'M13 2.5L4.5 13.5H12l-1 8 8.5-11H12l1-8Z',
  plane: 'M3 13.5l7-1.5 4-7.5h2.2l-1.7 7 5-1 1.5-2H22l-1.5 4 1.5 4h-1l-1.5-2-5-1 1.7 7H14l-4-7.5-7-1.5v-1Z',
  sparkle: 'M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  home: 'M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4v-9.5Z',
  book: 'M5 4.5h11.5a2 2 0 0 1 2 2v13.5h-11.5a2 2 0 0 1-2-2v-13.5ZM5 17.5a2 2 0 0 1 2-2h11.5M9 8.5h6',
  mail: 'M3.5 5.5h17v13h-17zM4 6l8 6.5L20 6',
  phone: 'M7 3.5h3l1.5 4.5-2 1.3a12 12 0 0 0 5.2 5.2l1.3-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 5 5.5a2 2 0 0 1 2-2Z',
  external: 'M14 4h6v6M20 4l-9 9M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.6v.1',
  filter: 'M4 5.5h16M7 12h10M10 18.5h4',
  copy: 'M8.5 8.5h11v11h-11zM5.5 15.5h-1a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  upload: 'M12 15.5V4M7.5 8.5L12 4l4.5 4.5M4.5 15.5v4h15v-4',
  download: 'M12 4v11.5M7.5 11L12 15.5l4.5-4.5M4.5 15.5v4h15v-4',
  logout: 'M14.5 4.5h4a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-4M10 16.5L5.5 12 10 7.5M5.5 12h10',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4.5H15',
  gift: 'M4 10h16v10H4zM3 6.5h18V10H3zM12 6.5V20M12 6.5C10.5 3 7 3 7 5s3 1.5 5 1.5ZM12 6.5C13.5 3 17 3 17 5s-3 1.5-5 1.5Z',
  lock: 'M6 10.5h12v9.5H6zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3',
  instagram: 'M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 7v.1',
  google: 'M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.8a4.2 4.2 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.6ZM12 21c2.4 0 4.5-.8 5.9-2.2L15 16.6c-.8.6-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0 0 12 21ZM7 13.8a5.4 5.4 0 0 1 0-3.6V7.9H4a9 9 0 0 0 0 8.2l3-2.3ZM12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 4 7.9l3 2.3c.7-2.1 2.7-3.6 5-3.6Z',
}

const WA =
  'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 16.4a7.4 7.4 0 0 1-3.8-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.4 7.4 0 1 1 12 19.4Zm4.1-5.5c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6 6 0 0 1-3-2.6c-.2-.4.2-.4.7-1.3.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4a.8.8 0 0 0-.6.3 2.5 2.5 0 0 0-.8 1.9c0 1.1.8 2.2.9 2.4.1.1 1.6 2.5 3.9 3.5 1.5.6 2 .7 2.7.6.4-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1l-.6-.4Z'

export function Icon({ name, size = 20, className = '', title, strokeWidth = 1.8 }) {
  if (name === 'whatsapp') {
    return (
      <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
        {title && <title>{title}</title>}
        <path d={WA} fill="currentColor" />
      </svg>
    )
  }
  const d = P[name] || P.sparkle
  const filled = name === 'sparkle'
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  )
}

export const CAT_ICON = { thrill: 'loop', water: 'slide', desert: 'dune', sea: 'boat', sky: 'tower', city: 'columns', trips: 'road', events: 'flag' }
