/** Public company details: the only contact shown on the site. */
export const CONTACT = {
  email: "info@webvisit360.com",
  phone: "+386 41 698 386",
  phoneHref: "tel:+38641698386",
  company: "AGENCIJA SINHRON d.o.o.",
  brand: "Webvisit360",
  address: "Tomšičeva 12, 2310 Slovenska Bistrica",
  street: "Tomšičeva 12",
  postalCode: "2310",
  city: "Slovenska Bistrica",
  registration: "7216165000",
  vat: "SI32150245",
  director: "Franc Potočnik",
} as const;

/** The studio's public profiles (footer, structured data). */
export const SOCIAL = [
  { name: "Facebook", url: "https://www.facebook.com/Webvisit360" },
  { name: "Instagram", url: "https://www.instagram.com/webvisit360" },
  { name: "Kuula", url: "https://kuula.co/profile/WEBVISIT360" },
] as const;

export const TRUSTED_BADGE = { src: "/images/street-view-trusted.png", alt: "Google Street View Trusted" } as const;
