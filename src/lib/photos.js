import { IS_ARTIFACT } from './config.js'

// Free-licence Unsplash photos (Unsplash License: commercial use allowed, no attribution required;
// we credit photographers anyway). Loaded from Unsplash's image CDN on the live site.
// [path, photographer, alt]
export const PHOTOS = {
  downtown: ['photo-1512453979798-5ea266f8880c', 'David Rodrigo', 'Burj Khalifa and Downtown Dubai at sunrise'],
  'burj-night': ['photo-1582120031356-35f21bf61055', 'Timo Volz', 'Burj Khalifa lit up at night'],
  'burj-al-arab': ['photo-1546412414-e1885259563a', 'Darcey Beau', 'Burj Al Arab on the Jumeirah coast'],
  'skyline-night': ['flagged/photo-1559717201-fbb671ff56b7', 'ZQ Lee', 'Dubai skyline at night'],
  'marina-sunset': ['photo-1768463852019-4881a17a1c0e', 'Dawid Tkocz', 'A boat crossing the water at sunset with skyscrapers behind'],
  'marina-night': ['photo-1728418598142-75c1b31cb318', 'Nejc Soklič', 'A boat on the water in front of a lit-up city at night'],
  yacht: ['photo-1768463852040-4a4c2bcec1ed', 'Dawid Tkocz', 'A yacht and a jet ski on the water at sunset'],
  jetski: ['photo-1688219040240-df6398321243', 'Haris Khan', 'A jet ski tour in Dubai'],
  dhow: ['photo-1784821441779-8ed02fda2ebe', 'Jack Sparrow', 'Traditional dhow boats on Dubai Creek'],
  fishing: ['photo-1737183616956-7da135f9a41d', 'Rushikesh Patil', 'A harbour full of white boats'],
  dolphin: ['photo-1763920846903-8c5d9e6f23b3', 'Slavan', 'A dolphin leaping out of the water'],
  'desert-suv': ['photo-1588310558566-b983c7d257e4', 'Jônatas Tinoco', 'A 4x4 kicking up sand in the dunes'],
  'desert-buggies': ['photo-1695878868496-fcbd6ef47f57', 'Dreamer Dude', 'A group of buggies driving through the desert'],
  'desert-camels': ['photo-1549944850-84e00be4203b', 'Fernando Jorge', 'Camels resting in the desert outside Dubai'],
  'desert-dune': ['photo-1553796661-17b7fa359f49', 'Mike Iukhtenko', 'Wind-shaped sand dunes'],
  'desert-camp': ['photo-1714229727591-5a3e9e5e50c5', 'Kareem Saleh', 'A campfire in the desert at dusk'],
  'desert-night': ['photo-1527419105721-af1f23c86dec', 'Toa Heftiba', 'Outdoor beds under a starry desert sky'],
  balloon: ['photo-1717390700777-9f4f5becedf8', 'Maximus Beaumont', 'A hot air balloon over the desert at dawn'],
  coaster: ['photo-1704925052388-070244d29a3a', 'Zitesh Kaushal', 'A teal roller coaster track against a blue sky'],
  waterpark: ['photo-1739295194212-0602c4d1e797', 'Meg von Haartman', 'A water slide surrounded by palm trees'],
  snow: ['photo-1647644768239-6e937d5e9743', 'Benjamin Hayward', 'A snowboarder riding down a slope'],
  aquarium: ['photo-1709688870491-78539abd3f9d', 'Aaron De Wit', 'Sharks swimming in a large aquarium'],
  'global-village': ['photo-1670235809896-517273b009a9', 'Yasara Hansani', 'The lit-up entrance of Global Village at night'],
  'city-lights': ['photo-1748525938712-a065b4396ba4', 'Ruben Mavarez', 'People inside a glowing light installation'],
  museum: ['photo-1672324016837-4b803c38fc95', 'Yan Ma', 'Louvre Abu Dhabi and its dome over the water'],
  palace: ['photo-1580637648554-e79f16fe99ab', 'Dario Ciraulo', 'Qasr Al Watan reflected in water'],
  flowers: ['photo-1669117485067-9b39472a3ea6', 'Yasara Hansani', 'Flower installations at Dubai Miracle Garden'],
  safari: ['photo-1765706729982-e5475767c4ff', 'Mario Scheibl', 'A giraffe seen from a safari vehicle'],
  frame: ['photo-1680838730692-b08ee8fe4fcb', 'Ahmed Aldaie', 'The Dubai Frame against the city skyline'],
  palm: ['photo-1677632227880-4d21073ef8f4', 'Thomas Haas', 'Palm Jumeirah seen from above'],
  helicopter: ['photo-1656994865033-7523230269f8', 'Winston Tjia', 'A helicopter on the helipad'],
  skydive: ['photo-1591007232007-b26dfbbc9a9a', 'Ricardo Gomez Angel', 'A skydiver in free fall'],
  musandam: ['photo-1582461563126-3a470ec9ecb2', 'Musandam Dhow Tours', 'A dhow on the fjords of Musandam'],
  f1: ['photo-1673219956297-a2b87cee09ff', 'untldshots', 'Race cars on track'],
  'east-coast': ['photo-1751949400774-00c77118ddef', 'Samy Mar Boy', 'Boats on a beach on the east coast'],
  friends: ['photo-1511632765486-a01980e01a18', 'Helena Lopes', 'Friends with arms around each other watching the sunset'],
}

// Category art for when photos are off (preview) or still loading.
export const CAT_ART = {
  thrill: ['#00939f', '#05545c'],
  water: ['#1fb5c2', '#00707a'],
  desert: ['#f2b544', '#b9651d'],
  sea: ['#127d9a', '#0a3d55'],
  sky: ['#4b7fd1', '#1d3c7a'],
  city: ['#8a5cd6', '#3d2577'],
  trips: ['#24a37a', '#0f5a44'],
  events: ['#e0534a', '#7d1f1a'],
}

export const photosEnabled = !IS_ARTIFACT

export function photoUrl(key, w = 800, h) {
  const p = PHOTOS[key]
  if (!p || !photosEnabled) return null
  const size = h ? `&w=${w}&h=${h}&fit=crop&crop=entropy` : `&w=${w}&fit=max`
  return `https://images.unsplash.com/${p[0]}?auto=format&q=68${size}`
}

export function photoSrcSet(key, widths, h) {
  if (!photosEnabled || !PHOTOS[key]) return undefined
  return widths.map((w) => `${photoUrl(key, w, h ? Math.round((h / widths[0]) * w) : undefined)} ${w}w`).join(', ')
}

export function photoCredit(key) {
  const p = PHOTOS[key]
  return p ? p[1] : null
}
export function photoAlt(key) {
  const p = PHOTOS[key]
  return p ? p[2] : ''
}
