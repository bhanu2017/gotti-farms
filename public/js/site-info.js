// ============================================================================
//  YOUR BUSINESS DETAILS: fill these in once and they appear across the site
//  (top bar, footer, WhatsApp button, Contact page, policy pages).
//
//  Replace each [PLACEHOLDER] with your real details and keep the quotes.
//  Example:  phone: '+91 83091 83156',
// ============================================================================

export const SITE = {
  businessName: 'Gotti Farms',

  // Shown in the top bar and footer. Write it the way people should read it.
  phone: '+91 83091 83156',                 // e.g. '+91 83091 83156'

  // WhatsApp number WITH country code, digits only (no + or spaces).
  whatsapp: '918309183156',           // e.g. '918309183156'

  email: 'gottifarms018@gmail.com',                 // e.g. 'gottifarms018@gmail.com'

  // Full farm / business address.
  address: 'Gudipudi, Sattenapalli Mandal, Palnadu District, Andhra Pradesh',             // e.g. 'Gotti Farms, Village, Mandal, Guntur District, Andhra Pradesh 522xxx'

  // FSSAI food licence number (14 digits).
  fssai: '[FSSAI NUMBER]',       // not yet: FSSAI lines stay hidden until you put the number here

  // Delivery information shown near the cart, checkout and on product pages.
  deliveryAreas: 'Home delivery to your doorstep', // e.g. 'Guntur, Vijayawada, Tenali and nearby towns'
  deliveryDays: '2 to 5 days, depending on your location',   // e.g. '2–4 days'

  // Refer a friend: what each person gets.
  referralReward: '10% off one order', // e.g. '₹50 off'

  // Social media links (leave '' to hide an icon).
  facebook: '',
  instagram: '',
  youtube: '',

  // Message that opens in WhatsApp when someone taps "Order on WhatsApp".
  whatsappMessage: 'Hi Gotti Farms, I want to order',

  // Google Analytics 4 measurement ID, e.g. 'G-ABC123XYZ'. Leave as is to turn analytics off.
  gaId: '[GA_ID]',
  // Google Search Console code: paste it into the google-site-verification tag in public/index.html.
};

/** True while a value is still a [PLACEHOLDER] or empty. */
export const isPlaceholder = (v) => !v || /^\[.*\]$/.test(String(v).trim());

/** Link that opens a WhatsApp chat with a ready message. */
export function whatsappLink(message = SITE.whatsappMessage) {
  const num = String(SITE.whatsapp).replace(/\D/g, '');
  const text = encodeURIComponent(message || '');
  return num ? `https://wa.me/${num}${text ? `?text=${text}` : ''}` : `https://wa.me/${text ? `?text=${text}` : ''}`;
}
