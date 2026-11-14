// Shared Car Brand Logos & Helpers

export const LOGO_MAP = {
    "alfa-romeo": "/logos/alfa-romeo.jpg",
    "audi": "/logos/audi.png",
    "bentley": "/logos/bentley.jpg",
    "baic": "/logos/biac.jpg",
    "biac": "/logos/biac.jpg",
    "bmw": "/logos/bmw.png",
    "byd": "/logos/byd.png",
    "cadillac": "/logos/cadillac.jpg",
    "ferrari": "/logos/ferrari.png",
    "fiat": "/logos/fiat.jpg",
    "ford": "/logos/ford.jpg",
    "hyundai": "/logos/haundai.jpg",
    "haundai": "/logos/haundai.jpg",
    "jeep": "/logos/jeep.jpg",
    "kia": "/logos/kia.jpg",
    "lamborghini": "/logos/lamborghini.jpg",
    "land-rover": "/logos/land-rover.jpg",
    "maserati": "/logos/maserati.jpg",
    "mazda": "/logos/mazda.jpg",
    "mercedes-benz": "/logos/mercedes-benz.png",
    "mercedes-benz": "/logos/mercedes-benz.png",
    "porsche": "/logos/Porche.png",
    "porche": "/logos/Porche.png",
    "renault": "/logos/renault.jpg",
    "skoda": "/logos/skoda.jpg",
    "volkswagen": "/logos/volkswagen.jpg"
};

export const BRAND_LIST = [
    "Alfa Romeo",
    "Audi",
    "BAIC",
    "Bentley",
    "BMW",
    "BYD",
    "Cadillac",
    "Ferrari",
    "Fiat",
    "Ford",
    "Hyundai",
    "Jeep",
    "Kia",
    "Lamborghini",
    "Land Rover",
    "Maserati",
    "Mazda",
    "Mercedes-Benz",
    "Porsche",
    "Renault",
    "Skoda",
    "Volkswagen"
];

export const getBrandLogoUrl = (brandName) => {
    if (!brandName || brandName === 'Unknown') return null;
    const normalized = String(brandName).toLowerCase().trim().replace(/\s+/g, '-');
    return LOGO_MAP[normalized] || `/logos/${normalized}.png`;
};
