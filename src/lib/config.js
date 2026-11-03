// Public configuration. The anon key is safe to ship: every table is protected by row-level security
// and supplier costs are only reachable by admins.
export const SUPABASE_URL = 'https://qzjawhlufbibpovqveny.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6amF3aGx1ZmJpYnBvdnF2ZW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2OTI0ODcsImV4cCI6MjEwOTI2ODQ4N30.aQREyreKdHlvfpxgGk3t7NdyLair2YZc-YTxPUermSo'

export const IS_ARTIFACT = typeof __ARTIFACT__ !== 'undefined' && __ARTIFACT__

export const BRAND = {
  name: 'Yondo Experiences',
  site: 'https://experiences.yondo.global',
  whatsapp: '971503676042',
  whatsappDisplay: '+971 50 367 6042',
  email: 'harrsh@yondo.global',
  instagram: 'yondo.experiences',
  googleReviews: 'https://share.google/wpT4mj3k5yt2fROYn',
  googleReviewCount: 27,
  company: 'Bindal Univentures LLC',
  licence: '2433960.01',
  licenceIssuer: 'Sharjah Media City (Shams)',
  address: 'Sharjah Media City (Shams), UAE',
}

export const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']
