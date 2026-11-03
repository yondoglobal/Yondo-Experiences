# Attraction metadata: display name, category, emirate, one-line blurb, image key, flags.
# Keys are the exact attraction names from the supplier price list (whitespace-normalised).
# hidden=True keeps the attraction out of the public site (still imported, admin can unhide).

CATS = {
    "thrill":  {"label": "Theme parks",        "blurb": "Coasters, rides and full-day park passes."},
    "water":   {"label": "Water parks",        "blurb": "Slides, lazy rivers and beach-day energy."},
    "desert":  {"label": "Desert",             "blurb": "Dune bashing, camps, buggies and starry nights."},
    "sea":     {"label": "On the water",       "blurb": "Yachts, jet skis, dhow cruises and sunset sails."},
    "sky":     {"label": "Sky high",           "blurb": "Observation decks, helicopters and big drops."},
    "city":    {"label": "City & culture",     "blurb": "Museums, aquariums, shows and the city's icons."},
    "trips":   {"label": "Day trips & tours",  "blurb": "Guided tours and full days out beyond the city."},
    "events":  {"label": "Events",             "blurb": "Race weekends, gala nights and one-offs."},
}

M = {}
def a(src, name, cat, emirate, blurb, img, featured=False, hidden=False):
    M[src] = dict(name=name, cat=cat, emirate=emirate, blurb=blurb, img=img, featured=featured, hidden=hidden)

# --- Theme parks
a("IMG Worlds of Adventure Theme Park", "IMG Worlds of Adventure", "thrill", "Dubai",
  "Indoor theme park with Marvel and Cartoon Network zones, coasters and dark rides. Fully air-conditioned.", "coaster", featured=True)
a("Motion Gate Dubai Theme Park", "Motiongate Dubai", "thrill", "Dubai",
  "Hollywood-themed park at Dubai Parks and Resorts, with combo options for a second park.", "coaster")
a("Real Madrid World", "Real Madrid World", "thrill", "Dubai",
  "Football-themed park at Dubai Parks and Resorts. Combine it with Motiongate or LEGOLAND.", "coaster")
a("LEGOLAND Dubai Theme Park", "LEGOLAND Dubai", "thrill", "Dubai",
  "LEGO-built rides and Miniland at Dubai Parks and Resorts, best with younger siblings.", "coaster")
a("Ferrari World Abu Dhabi Theme Park", "Ferrari World Abu Dhabi", "thrill", "Abu Dhabi",
  "Racing-themed indoor park on Yas Island, home of Formula Rossa.", "coaster", featured=True)
a("Warner Bros. World Abu Dhabi Theme Park", "Warner Bros. World Abu Dhabi", "thrill", "Abu Dhabi",
  "Indoor park on Yas Island with Gotham City and Metropolis lands.", "coaster")
a("Sea World Abu Dhabi", "SeaWorld Abu Dhabi", "thrill", "Abu Dhabi",
  "Marine-life theme park on Yas Island with rides, shows and animal encounters.", "aquarium")
a("Yas Island Multi Day, Multi Park Ticket (Ferrari, Warner, Yas & Seaworld)", "Yas Island multi-park pass", "thrill", "Abu Dhabi",
  "One pass across Ferrari World, Warner Bros. World, Yas Waterworld and SeaWorld.", "coaster", featured=True)
a("Kidzania Dubai", "KidZania Dubai", "thrill", "Dubai",
  "Role-play city for kids inside The Dubai Mall.", "city-lights", hidden=True)

# --- Water parks
a("Aquaventure World Waterpark", "Aquaventure Waterpark", "water", "Dubai",
  "Atlantis The Palm's waterpark: big slides, river rides and a private beach.", "waterpark", featured=True)
a("Wild Wadi Waterpark", "Wild Wadi Waterpark", "water", "Dubai",
  "Classic Jumeirah waterpark with Burj Al Arab views.", "waterpark")
a("LEGOLAND Water Park", "LEGOLAND Water Park", "water", "Dubai",
  "Family waterpark at Dubai Parks and Resorts.", "waterpark")
a("Yas Waterworld, Abu Dhabi", "Yas Waterworld", "water", "Abu Dhabi",
  "Pearl-diving-themed waterpark on Yas Island.", "waterpark")

# --- Desert
a("Desert Safari in Dubai + Red Sands Camp", "Desert safari + Red Sands camp", "desert", "Dubai",
  "Dune bashing, camel ride, BBQ dinner and live shows at camp. The classic Dubai evening.", "desert-suv", featured=True)
a("Desert Safari in Dubai + Noble Safari Camp", "Desert safari + Noble camp", "desert", "Dubai",
  "Evening safari with dune drive and dinner at Noble Safari Camp.", "desert-camp")
a("Desert Safari + Al Faqaa Camp", "Desert safari + Al Faqaa camp", "desert", "Dubai",
  "Evening desert programme with dune drive and dinner at Al Faqaa camp.", "desert-dune")
a("Desert Safari in Abu Dhabi", "Abu Dhabi desert safari", "desert", "Abu Dhabi",
  "Evening safari in the Abu Dhabi dunes, shared or private car.", "desert-suv")
a("Desert Safari in Ras Al-Khaimah & Fujeirah", "RAK evening desert safari", "desert", "Ras Al Khaimah",
  "Evening desert safari in Ras Al Khaimah with pick-up from Fujairah.", "desert-dune")
a("Buggy & Quad Bike Safari in Dubai", "Buggy & quad bike safari", "desert", "Dubai",
  "Drive your own Polaris buggy or quad through the dunes. Transfers included.", "desert-buggies", featured=True)
a("Extreme desert buggy and ATV safari in Ras Al Khaimah", "RAK buggy & ATV safari", "desert", "Ras Al Khaimah",
  "An hour on a buggy or quad, then BBQ dinner and a show. Shared transfers included.", "desert-buggies")
a("Morning Desert Safari Dubai", "Morning desert safari", "desert", "Dubai",
  "Beat the heat: a private-car morning run through the dunes.", "desert-dune")
a("Sonara Camp", "Sonara Camp", "desert", "Dubai",
  "Sunset, dinner or both at Sonara Camp in the Nara desert.", "desert-camp")
a("Heritage Safari", "Heritage desert safari", "desert", "Dubai",
  "Bedouin-heritage safari by vintage Land Rover or by camel.", "desert-camels")
a("Heritage Morning Safari: Bedouin Culture", "Heritage morning safari", "desert", "Dubai",
  "A morning of Bedouin culture, falconry and the desert at golden hour.", "desert-camels")
a("Heritage Cultural Retreat: Overnight Safari with Hot Air Balloon", "Overnight safari + hot air balloon", "desert", "Dubai",
  "Overnight in the desert, then a sunrise balloon flight.", "balloon")
a("Overnight Desert Safari with Stone Dwelling Stay", "Overnight desert stay", "desert", "Dubai",
  "Sleep under the desert sky in a stone dwelling camp.", "desert-camp")
a("Platinum safari", "Platinum desert safari", "desert", "Dubai",
  "Premium heritage safari with private-car options.", "desert-camels")
a("Royal Platinum Desert Experience", "Royal Platinum desert experience", "desert", "Dubai",
  "The top-tier private desert experience.", "desert-dune")
a("Royal Falconry Training & Nature Safari", "Falconry & nature safari", "desert", "Dubai",
  "Hands-on falconry training and a nature drive, private car.", "desert-camels")
a("Private Night Safari and Astronomy", "Night safari & stargazing", "desert", "Dubai",
  "Private night drive and stargazing, with overnight and balloon add-ons.", "desert-night")
a("Vintage G-Class Evening Heritage Safari at Al Marmoom", "Vintage G-Class evening safari", "desert", "Dubai",
  "Evening safari at Al Marmoom in a vintage G-Class, with a 5-course Bedouin dinner.", "desert-suv")
a("Conservation Drive & Breakfast at Al Maha", "Conservation drive & breakfast at Al Maha", "desert", "Dubai",
  "Private wildlife drive in the conservation reserve, then breakfast at Al Maha.", "desert-camels")

# --- On the water
a("Shared Luxury Yacht Tour with Breakfast or BBQ", "Shared yacht tour", "sea", "Dubai",
  "Sunset, extended sunset or dinner sailings on a shared luxury yacht. Great value for a squad.", "yacht", featured=True)
a("Xclusive Super Yacht Cruise", "Super yacht cruise + dinner", "sea", "Dubai",
  "Super yacht cruise with dinner and drinks, 5pm or 9pm sailing.", "yacht")
a("Alexandra Dhow Cruise in Dubai Marina", "Dhow dinner cruise, Dubai Marina", "sea", "Dubai",
  "Dinner cruise through Dubai Marina, 9:00 to 10:45pm, upper or lower deck.", "dhow")
a("Alexandra Sea Lounge", "Alexandra Sea Lounge dinner cruise", "sea", "Dubai",
  "Dinner cruise on the Alexandra Sea Lounge, with or without transfers.", "marina-night")
a("Dubai Water Canal Dhow Cruise", "Dubai Water Canal dhow cruise", "sea", "Dubai",
  "Evening dhow cruise along the Dubai Water Canal.", "dhow")
a("Lotus Royale Dinner Cruise", "Lotus Royale dinner cruise", "sea", "Dubai",
  "Mega-yacht dinner cruise with standard, VIP and drinks packages.", "marina-night")
a("Ocean Empress Dinner Cruise", "Ocean Empress dinner cruise", "sea", "Dubai",
  "Dinner cruise with top-deck and VIP packages.", "marina-night")
a("Jet Ski from Dubai Harbour", "Jet ski, Dubai Harbour", "sea", "Dubai",
  "Yamaha jet ski from Dubai Harbour, 30 or 60 minutes.", "jetski", featured=True)
a("Jet Ski Burj Al Arab", "Jet ski, Burj Al Arab", "sea", "Dubai",
  "1800cc jet ski with Burj Al Arab in the background.", "jetski")
a("Jet Ski in Abu Dhabi", "Jet ski, Abu Dhabi", "sea", "Abu Dhabi",
  "20, 30 or 60 minutes on the water in Abu Dhabi.", "jetski")
a("Speed Boat Tour Dubai", "Speed boat tour", "sea", "Dubai",
  "Fast boat tour from Dubai Marina.", "marina-sunset")
a("Wakeboarding from Dubai Marina", "Wakeboarding", "sea", "Dubai",
  "30 or 60 minute wakeboarding session from Dubai Marina.", "jetski")
a("Wakesurfing from Dubai Marina", "Wakesurfing", "sea", "Dubai",
  "30 or 60 minute wakesurf session from Dubai Marina.", "jetski")
a("Fly Board Burj Al Arab", "Flyboard, Umm Suqeim", "sea", "Dubai",
  "30 minutes on a water-jet flyboard off Umm Suqeim beach.", "burj-al-arab")
a("Donut Ride Burj Al Arab", "Donut ride, Burj Al Arab", "sea", "Dubai",
  "30-minute inflatable donut ride towed past Burj Al Arab.", "burj-al-arab")
a("Deep Sea Fishing in Dubai", "Deep sea fishing, Dubai", "sea", "Dubai",
  "4 or 5 hour fishing trip, with or without return transfers.", "fishing")
a("Deep Sea Fishing in Abu Dhabi", "Deep sea fishing, Abu Dhabi", "sea", "Abu Dhabi",
  "4 or 5 hour fishing trip from Abu Dhabi.", "fishing")
a("Dolphin Bay at Atlantis the Palm", "Dolphin Bay, Atlantis", "sea", "Dubai",
  "Meet, interact or swim with dolphins at Atlantis The Palm.", "dolphin")

# --- Sky high
a("Burj Khalifa - At The Top", "Burj Khalifa: At The Top", "sky", "Dubai",
  "Floors 124/125 and up, with prime-time, fast-track and rooftop options.", "burj-night", featured=True)
a("Burj Khalifa - At The Top - Peak Dates", "Burj Khalifa: peak dates", "sky", "Dubai",
  "Peak-date tickets (duplicate of main listing).", "burj-night", hidden=True)
a("Sky View Dubai", "Sky Views Dubai", "sky", "Dubai",
  "Glass Slide and Edge Walk on the outside of Address Sky View.", "skyline-night")
a("The View Palm Jumeirah", "The View at The Palm", "sky", "Dubai",
  "240m-high views over the whole Palm Jumeirah.", "palm")
a("Dubai Frame", "Dubai Frame", "sky", "Dubai",
  "Glass-floor sky bridge between old and new Dubai.", "frame")
a("Helicopter Flight from Dubai Police Academy by HeliDubai", "Helicopter tour by HeliDubai", "sky", "Dubai",
  "12 to 30 minute tours over the city's icons, shared or private.", "helicopter")
a("Helicopter flight from the Palm Island, Dubai", "Helicopter tour from the Palm", "sky", "Dubai",
  "Shared or private helicopter flights from the Palm, panoramic seats available.", "helicopter")
a("Helicopter Flight Abu Dhabi", "Helicopter tour, Abu Dhabi", "sky", "Abu Dhabi",
  "17 or 30 minute flights over the capital.", "helicopter")
a("Gyrocopter Flight in Dubai", "Gyrocopter flight", "sky", "Dubai",
  "Gyrocopter flight over Dubai.", "helicopter")
a("Hot Air Ballon Flight in Dubai", "Hot air balloon flight", "sky", "Dubai",
  "Sunrise balloon flight over the Dubai desert.", "balloon")
a("The Dubai Balloon at Atlantis", "The Dubai Balloon at Atlantis", "sky", "Dubai",
  "Tethered balloon ride at Atlantis on the Palm.", "palm")
a("Sky Dive Dubai", "Skydive Dubai: Palm drop zone", "sky", "Dubai",
  "Tandem skydive over the Palm Jumeirah.", "skydive")
a("Zipline Dubai Marina", "XLine Dubai Marina zipline", "sky", "Dubai",
  "One of the longest urban ziplines, straight over Dubai Marina.", "marina-sunset")
a("Dinner in the Sky", "Dinner in the Sky", "sky", "Dubai",
  "Dinner served at a table suspended high above the city.", "skyline-night")

# --- City & culture
a("Global Village", "Global Village", "city", "Dubai",
  "Pavilions from around the world, street food, rides and shows. Open evenings in season.", "global-village", featured=True)
a("Ski Dubai", "Ski Dubai", "city", "Dubai",
  "Real snow inside Mall of the Emirates: slopes, snow park and rides.", "snow", featured=True)
a("Aquarium and Underwater Zoo at the Dubai Mall", "Dubai Aquarium & Underwater Zoo", "city", "Dubai",
  "The Dubai Mall aquarium tunnel and zoo, with penguin add-ons.", "aquarium")
a("Lost World Aquarium", "Lost World Aquarium, Atlantis", "city", "Dubai",
  "The aquarium inside Atlantis The Palm.", "aquarium")
a("National Aquarium Abu Dhabi", "National Aquarium Abu Dhabi", "city", "Abu Dhabi",
  "Large aquarium at Al Qana with all-access and behind-the-glass passes.", "aquarium")
a("Deep Dive Dubai", "Deep Dive Dubai", "city", "Dubai",
  "Snorkel or scuba in a 60-metre-deep pool built as a sunken city.", "aquarium")
a("Dubai Dolphinarium", "Dubai Dolphinarium", "city", "Dubai",
  "Dolphin and seal show at Creek Park.", "dolphin")
a("Dubai Miracle Garden", "Dubai Miracle Garden", "city", "Dubai",
  "Millions of flowers shaped into giant installations. Seasonal.", "flowers")
a("Dubai Butterfly Garden", "Dubai Butterfly Garden", "city", "Dubai",
  "Domes full of free-flying butterflies next to Miracle Garden.", "flowers")
a("Dubai Garden Glow", "Dubai Garden Glow", "city", "Dubai",
  "Glow-in-the-dark art park, best after sunset.", "city-lights")
a("Dubai Safari Park", "Dubai Safari Park", "city", "Dubai",
  "Safari park with African, Asian and Arabian zones.", "safari")
a("Dubai Crocodile Park", "Dubai Crocodile Park", "city", "Dubai",
  "Nile crocodiles up close, near Mushrif Park.", "safari")
a("Abu Dhabi Emirates Park Zoo", "Emirates Park Zoo, Abu Dhabi", "city", "Abu Dhabi",
  "Zoo and animal encounters in Al Bahia.", "safari")
a("The Green Planet", "The Green Planet", "city", "Dubai",
  "Indoor tropical rainforest in City Walk.", "flowers")
a("Madame Tussauds Dubai", "Madame Tussauds Dubai", "city", "Dubai",
  "Wax figures and photo ops on Bluewaters Island.", "city-lights")
a("AYA Universe Dubai", "AYA Universe", "city", "Dubai",
  "Immersive light-and-art worlds at Wafi City.", "city-lights", featured=True)
a("House of Hype", "House of Hype", "city", "Dubai",
  "Interactive, social-media-ready experience rooms at Dubai Mall.", "city-lights")
a("TeamLab Phenomena", "teamLab Phenomena Abu Dhabi", "city", "Abu Dhabi",
  "Immersive digital-art museum on Saadiyat Island.", "city-lights")
a("La Perle show", "La Perle by Dragone", "city", "Dubai",
  "Water-and-acrobatics stage show at Al Habtoor City.", "city-lights")
a("Louvre Abu Dhabi", "Louvre Abu Dhabi", "city", "Abu Dhabi",
  "Art museum under a floating dome on Saadiyat Island.", "museum")
a("Zayed National Museum, Abu Dhabi", "Zayed National Museum", "city", "Abu Dhabi",
  "The UAE's national museum on Saadiyat Island.", "museum")
a("Natural History Museum, Abu-Dhabi", "Natural History Museum Abu Dhabi", "city", "Abu Dhabi",
  "Dinosaurs, meteorites and the story of life on Earth, on Saadiyat Island.", "museum")
a("Qasr Al Watan, Royal Palace", "Qasr Al Watan", "city", "Abu Dhabi",
  "The presidential palace in Abu Dhabi, open to visitors.", "palace")
a("Shindhaga Museum", "Al Shindagha Museum", "city", "Dubai",
  "Dubai's story told in restored historic houses by the Creek.", "museum")
a("Dubai Mall Fountain & Lake Ride", "Dubai Fountain lake ride", "city", "Dubai",
  "Boat ride on Burj Lake during the fountain show.", "burj-night")
a("The Palm Monorail", "The Palm Monorail", "city", "Dubai",
  "Monorail from Nakheel Mall to Atlantis Aquaventure.", "palm")
a("Amazing Dubai Pass: Four Dubai Experiences in One Pass", "Amazing Dubai Pass", "city", "Dubai",
  "Four Dubai experiences on one pass.", "downtown")

# --- Day trips & tours
a("Musandam Day Trip", "Musandam day trip (Oman)", "trips", "Musandam",
  "Fjords, dhow cruise and dolphins in Oman's Musandam. Passport/visa rules apply.", "musandam", featured=True)
a("Abu Dhabi City Tour with English Speaking Guide", "Abu Dhabi city tour", "trips", "Abu Dhabi",
  "Full-day guided tour of the capital from Dubai, English-speaking guide.", "palace")
a("Morning Dubai City Tour", "Dubai city tour", "trips", "Dubai",
  "Shared morning tour of old and new Dubai.", "downtown")
a("Cabrio Tour", "Cabrio car tour", "trips", "Dubai",
  "Open-top car tour with driver or guide, 5 or 8 hours.", "downtown")
a("Private Fujairah City Tour from Fujairah", "Private Fujairah city tour", "trips", "Fujairah",
  "Private tour of Fujairah's east-coast sights.", "east-coast")

# --- Events
a("Formula 1 Etihad Airways Abu Dhabi Grand Prix 2026 (03 - 06 December)", "Abu Dhabi Grand Prix 2026", "events", "Abu Dhabi",
  "Formula 1 season finale at Yas Marina Circuit, 3 to 6 December.", "f1", featured=True)
a("Alexandra Floating Restaurants Gala Dinner New Year Eve", "NYE gala dinner cruise", "events", "Dubai",
  "Ring in 2027 on the water with a gala dinner cruise.", "marina-night")

# Excluded from the public site entirely (language-specific guide tours, transfers)
EXCLUDE_PREFIX = ["5 Emirates + Indian Ocean Tour (Russian", "Abu Dhabi City Tour form Abu Dhabi (Russian",
                  "Abu Dhabi City Tour with transfer from all emirates", "Classic Dubai City Tour with Spanish",
                  "Modern Dubai City Tour", "Night Dubai city tour with dinner cruise (Russian",
                  "Two Pearls of the East", "Private Transfers & Chauffeur", "Sharing transfer to Dubai Mall"]

# --- Photo per experience (keys in web/src/lib/photos.js). Place-specific where a free-licence photo of
# the actual place exists; otherwise an accurate photo of the activity. Admin can replace any of these.
PHOTO = {
    "Ferrari World Abu Dhabi": "ferrari-world", "Yas Island multi-park pass": "ferrari-world",
    "LEGOLAND Dubai": "legoland", "SeaWorld Abu Dhabi": "seaworld", "Aquaventure Waterpark": "atlantis",
    "Abu Dhabi desert safari": "desert-abu-dhabi", "Falconry & nature safari": "falcon",
    "Overnight safari + hot air balloon": "balloon-dubai", "Hot air balloon flight": "balloon-dubai",
    "RAK buggy & ATV safari": "desert-atv",
    "Deep sea fishing, Abu Dhabi": "fishing-boat", "Deep sea fishing, Dubai": "fishing-boat",
    "Dhow dinner cruise, Dubai Marina": "marina-dhow", "Dubai Water Canal dhow cruise": "water-canal",
    "Jet ski, Abu Dhabi": "jetski-sunset", "Speed boat tour": "marina-day",
    "Sky Views Dubai": "sky-views", "The Dubai Balloon at Atlantis": "atlantis",
    "XLine Dubai Marina zipline": "marina-aerial",
    "Dubai Aquarium & Underwater Zoo": "dubai-aquarium", "Dubai Butterfly Garden": "butterfly",
    "Dubai Crocodile Park": "crocodile", "Dubai Safari Park": "safari-park", "The Green Planet": "green-planet",
    "Zayed National Museum": "zayed-museum", "Natural History Museum Abu Dhabi": "nhm-abu-dhabi",
    "Abu Dhabi city tour": "grand-mosque", "Dubai city tour": "museum-future",
    "Wakeboarding": "jetski-sunset", "Wakesurfing": "jetski-sunset", "Al Shindagha Museum": "dhow",
}
for _m in M.values():
    if _m["name"] in PHOTO:
        _m["img"] = PHOTO[_m["name"]]
_missing = set(PHOTO) - {m["name"] for m in M.values()}
assert not _missing, _missing
