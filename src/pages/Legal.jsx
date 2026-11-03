import { useEffect } from 'react'
import { BRAND } from '../lib/config.js'

const UPDATED = '3 November 2026'

const PAGES = {
  'booking-policy': {
    title: 'Booking and cancellations',
    body: (
      <>
        <p>
          Yondo Experiences books tickets, tours and activities run by third-party suppliers in the UAE (and, for the Musandam day trip, Oman). This
          page explains how a booking works from request to ticket.
        </p>
        <h2>1. Your request</h2>
        <p>
          When you send a booking request on this site, nothing is charged. A request tells us what you want; it is not a confirmed booking. Prices
          shown are for the date you choose and come from our current supplier price list.
        </p>
        <h2>2. Confirmation</h2>
        <p>
          We check availability with the supplier and reply on WhatsApp. If your slot is available, we confirm the price, what is included, any age,
          ID or dress rules, and the supplier's cancellation terms. If it isn't available, we suggest alternatives or close the request at no cost.
        </p>
        <h2>3. Payment</h2>
        <p>
          We send a secure card payment link. Your booking is only confirmed once payment is received. Payment links can expire; if yours does, ask us
          for a new one. Prices are in UAE dirhams (AED) and we don't add booking fees on top of the price we confirm.
        </p>
        <h2>4. Tickets and vouchers</h2>
        <p>
          After payment we send your tickets or booking voucher on WhatsApp and by email. Bring the ID the venue asks for. For tours with pickup, we
          confirm the pickup time and place before the day.
        </p>
        <h2>5. Changes and cancellations</h2>
        <p>
          Every supplier sets its own rules, so cancellation and change terms differ by experience and ticket type. We tell you the terms that apply
          before you pay. Many dated tickets and event tickets can't be refunded once issued. Where a refund is due under the supplier's terms, we
          return it to the original payment method.
        </p>
        <h2>6. If the supplier cancels</h2>
        <p>
          If a supplier cancels (for example because of weather or operational reasons), we offer you a new date, an alternative, or a refund of the
          amount you paid for that booking.
        </p>
        <h2>7. Referral codes</h2>
        <p>
          Referral codes may reduce the price where the ticket allows it. Codes can't be exchanged for cash, can have limits or expiry dates, and only
          apply when entered at the time of the request.
        </p>
        <h2>8. Contact</h2>
        <p>
          WhatsApp {BRAND.whatsappDisplay} or email {BRAND.email}, any time.
        </p>
      </>
    ),
  },
  terms: {
    title: 'Terms of use',
    body: (
      <>
        <p>
          This website is operated by {BRAND.company} ({BRAND.address}, licence no. {BRAND.licence}) under the brand Yondo Experiences. By using the
          site you agree to these terms.
        </p>
        <h2>Our role</h2>
        <p>
          We arrange bookings with independent suppliers who run the experiences. The supplier is responsible for delivering the experience safely
          and as described, and its own terms and safety rules apply on the day.
        </p>
        <h2>Information on this site</h2>
        <p>
          We work to keep descriptions and prices accurate, but suppliers can change opening hours, inclusions and prices. The details we confirm on
          WhatsApp before you pay are the ones that apply to your booking. Photos are illustrative unless stated otherwise.
        </p>
        <h2>Your account and passport</h2>
        <p>
          Your Yondo passport, stamps, badges and tiers are a loyalty feature. They have no cash value, can't be transferred, and perks are offered at
          our discretion. We may correct stamps added in error.
        </p>
        <h2>Acceptable use</h2>
        <p>Don't send false booking requests, misuse referral codes or try to interfere with the site. We may cancel requests or codes that do.</p>
        <h2>Liability</h2>
        <p>
          To the extent the law allows, we aren't liable for losses caused by a supplier, by events outside our control, or by information you give
          us that is incorrect. Nothing here limits rights you have under UAE consumer protection law.
        </p>
        <h2>Law</h2>
        <p>These terms are governed by the laws of the United Arab Emirates.</p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy',
    body: (
      <>
        <p>
          {BRAND.company} ("Yondo Experiences", "we") is responsible for the personal data you give us on this site. This notice explains what we
          collect and why.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>Booking and quote details: name, WhatsApp number, email, university (optional), the experience, date, guests and any notes you add.</li>
          <li>Passport details: your email, and the name and university you add to your profile.</li>
          <li>Referral codes you enter, so the right person gets credit.</li>
        </ul>
        <h2>Why we use it</h2>
        <ul>
          <li>To check availability, confirm and deliver your booking, and contact you about it.</li>
          <li>To run your passport (stamps, badges and tiers) and work out referral commission.</li>
          <li>To keep records we're required to keep.</li>
        </ul>
        <p>We don't sell your data. We share booking details with the supplier only as needed to fulfil your booking.</p>
        <h2>Where it's stored</h2>
        <p>
          Bookings and profiles are stored with our cloud database provider, Supabase, whose servers for this site are outside the UAE. Messages you
          send us on WhatsApp are handled by WhatsApp.
        </p>
        <h2>How long we keep it</h2>
        <p>We keep booking records for as long as we need them for the booking, accounting and legal purposes, then delete or anonymise them.</p>
        <h2>Your choices</h2>
        <p>
          You can ask to see, correct or delete your data, or close your passport, by emailing {BRAND.email}. This site stores small preferences in
          your browser (like your last search and contact details for faster booking); you can clear them in your browser settings.
        </p>
      </>
    ),
  },
}

export default function Legal({ page }) {
  const p = PAGES[page] || PAGES['booking-policy']
  useEffect(() => {
    document.title = `${p.title} | Yondo Experiences`
  }, [p])
  return (
    <article className="wrap legal">
      <h1>{p.title}</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <div className="legal-body">{p.body}</div>
      <nav className="legal-nav" aria-label="Policies">
        <a href="#booking-policy">Booking and cancellations</a>
        <a href="#terms">Terms of use</a>
        <a href="#privacy">Privacy</a>
      </nav>
    </article>
  )
}
