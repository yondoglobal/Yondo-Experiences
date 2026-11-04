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
  // Photos of the actual place (location checked on Unsplash)
  'ferrari-world': ['photo-1760184762745-c04986a86c54', 'Po-Hsuan Huang', 'The Ferrari World roller coaster on Yas Island'],
  legoland: ['photo-1699297863328-ae9fb0add4ad', 'aboodi vesakaran', 'A building made of LEGO bricks at LEGOLAND Dubai'],
  seaworld: ['photo-1788795141148-a8d4061dfef1', 'Jack Sparrow', 'Flamingos in the tropical habitat at SeaWorld Yas Island'],
  atlantis: ['photo-1634148551170-d37d021e0cc9', 'Faisal Manga', 'Atlantis The Palm on the Dubai coast'],
  'dubai-aquarium': ['photo-1590999242684-55484214bceb', 'Dovlet Hojayev', 'Visitors in the Underwater Zoo at Dubai Aquarium'],
  'green-planet': ['photo-1787496323580-ba69dd2f7ddf', 'Vanburn Gonsalves', 'The giant tree under the glass dome at The Green Planet'],
  'safari-park': ['photo-1612798849321-2a0f1a2595ff', 'Mohammed Ayman', 'Dubai Safari Park'],
  'zayed-museum': ['photo-1765774909821-14e1f21b0f7b', 'Miguel Joya', 'Zayed National Museum on Saadiyat Island'],
  'nhm-abu-dhabi': ['photo-1786968302025-63f55efec3df', 'Dilip Poddar', 'A dinosaur skeleton at the Natural History Museum Abu Dhabi'],
  'sky-views': ['photo-1708361089093-beef4c4584e7', 'Fabien Bellanger', 'Burj Khalifa at twilight from Sky Views Observatory'],
  'grand-mosque': ['photo-1512632578888-169bbbc64f33', 'David Rodrigo', 'Sheikh Zayed Grand Mosque reflected at sunset'],
  'museum-future': ['photo-1686918269961-507270a5a238', 'Haris Khan', 'The Museum of the Future in Dubai at golden hour'],
  'water-canal': ['photo-1542544499-bce9dc3bb4e8', 'Pranav Madhu', 'Dubai Water Canal lit up at night'],
  'marina-dhow': ['photo-1778008452928-8da3c5b9b9cd', 'Anubhav Sonker', 'A dhow sailing past the Dubai Marina towers at night'],
  'marina-day': ['photo-1582120042072-d01e2fc8f3ea', 'Timo Volz', 'A boat cruising through Dubai Marina'],
  'marina-aerial': ['photo-1737724035436-1a301aca2aa2', 'Jhonwayne Pumaras', 'Dubai Marina from above'],
  falcon: ['photo-1742237281799-85c274bbbec1', 'Humphrey M', 'A falconer on a desert safari outside Dubai'],
  'desert-abu-dhabi': ['photo-1510479524860-95998e54a8c6', 'Jakub David', 'A 4x4 in the desert near Abu Dhabi'],
  'balloon-dubai': ['photo-1508655826745-dfce6993b8f4', 'James Mills', 'A hot air balloon over the Dubai desert'],
  // Accurate photos of the activity
  'desert-atv': ['photo-1742237281789-c37c5b38e0a9', 'Humphrey M', 'ATVs riding across the desert'],
  'fishing-boat': ['photo-1722404189738-a9059eddb540', 'Kate Trysh', 'A fishing boat with anglers on a calm sea'],
  'jetski-sunset': ['photo-1768463852042-656c293ce22f', 'Dawid Tkocz', 'A jet ski on the water at sunset'],
  butterfly: ['photo-1558898478-9ac0461266c1', 'Sarah Brown', 'A butterfly resting on flowers'],
  crocodile: ['photo-1605649461784-7d5e4df56c97', 'Shelly Collins', 'A crocodile in the water'],
}

// Keys whose photo shows the actual place (the rest show the activity). Used by the admin photo report.
export const PLACE_PHOTOS = new Set([
  'global-village', 'museum', 'palace', 'flowers', 'burj-night', 'downtown', 'burj-al-arab', 'palm', 'musandam', 'f1', 'jetski',
  'frame', 'ferrari-world', 'legoland', 'seaworld', 'atlantis', 'dubai-aquarium', 'green-planet', 'safari-park', 'zayed-museum',
  'nhm-abu-dhabi', 'sky-views', 'grand-mosque', 'museum-future', 'water-canal', 'marina-dhow', 'marina-day', 'marina-aerial',
  'falcon', 'desert-abu-dhabi', 'balloon-dubai', 'east-coast',
])

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

export function photoUrl(key, w = 800, h, force = false) {
  const p = PHOTOS[key]
  if (!p || (!photosEnabled && !force)) return null
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
