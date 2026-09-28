export const cropSeasonMap = {
  // Kharif (Monsoon: June - October)
  "Rice": "Kharif",
  "Paddy(Dhan)(Common)": "Kharif",
  "Paddy(Dhan)(Basmati)": "Kharif",
  "Maize": "Kharif",
  "Cotton": "Kharif",
  "Bajra(Pearl Millet/Cumbu)": "Kharif",
  "Groundnut": "Kharif",
  "Ground Nut Seed": "Kharif",
  "Soyabean": "Kharif",
  "Jowar(Sorghum)": "Kharif",
  "Ragi (Finger Millet)": "Kharif",
  "Arhar (Tur/Red Gram)(Whole)": "Kharif",
  "Arhar Dal(Tur Dal)": "Kharif",
  "Brinjal": "Kharif",
  "Bhindi(Ladies Finger)": "Kharif",
  "Green Chilli": "Kharif",
  "Bitter gourd": "Kharif",

  // Rabi (Winter: October - March)
  "Wheat": "Rabi",
  "Barley (Jau)": "Rabi",
  "Mustard": "Rabi",
  "Mustard Oil": "Rabi",
  "Bengal Gram(Gram)(Whole)": "Rabi",
  "Bengal Gram Dal (Chana Dal)": "Rabi",
  "Lentil (Masur)(Whole)": "Rabi",
  "Masur Dal": "Rabi",
  "Peas(Dry)": "Rabi",
  "Peas Wet": "Rabi",
  "White Peas": "Rabi",
  "Potato": "Rabi",
  "Tomato": "Rabi",
  "Cabbage": "Rabi",
  "Cauliflower": "Rabi",
  "Carrot": "Rabi",
  "Raddish": "Rabi",
  "Onion": "Rabi",
  "Onion Green": "Rabi",
  "Garlic": "Rabi",

  // Zaid (Summer: March - June)
  "Water Melon": "Zaid",
  "Karbuja(Musk Melon)": "Zaid",
  "Cucumbar(Kheera)": "Zaid",
  "Pumpkin": "Zaid",
  "Sweet Pumpkin": "Zaid",
  "White Pumpkin": "Zaid",
  "Bottle gourd": "Zaid",
  "Ridgeguard(Tori)": "Zaid",
  "Sponge gourd": "Zaid",
  "Grapes": "Zaid",

  // All Year / Perennial (Often trees or multi-harvest crops)
  "Apple": "All Year",
  "Banana": "All Year",
  "Banana - Green": "All Year",
  "Coconut": "All Year",
  "Tender Coconut": "All Year",
  "Copra": "All Year",
  "Arecanut(Betelnut/Supari)": "All Year",
  "Papaya": "All Year",
  "Papaya (Raw)": "All Year",
  "Coffee": "All Year",
  "Ginger(Green)": "All Year",
  "Ginger(Dry)": "All Year",
  "Turmeric": "All Year",
  "Black pepper": "All Year",
  "Mango": "All Year",
  "Mango (Raw-Ripe)": "All Year",
  "Lemon": "All Year",
  "Lime": "All Year",
  "Sweet Potato": "All Year",
};

/**
 * Returns the season for a given crop name.
 */
export const getCropSeason = (cropName) => {
  if (!cropName) return "All Year";
  const trimmed = cropName.trim();
  if (cropSeasonMap[trimmed]) return cropSeasonMap[trimmed];
  
  const low = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(cropSeasonMap)) {
    if (k.toLowerCase() === low || low.includes(k.toLowerCase())) {
      return v;
    }
  }

  // Heuristic fallbacks for broader matching
  if (low.includes("wheat") || low.includes("mustard") || low.includes("gram") || low.includes("masur") || low.includes("garlic") || low.includes("pea") || low.includes("carrot") || low.includes("cabbage")) return "Rabi";
  if (low.includes("rice") || low.includes("paddy") || low.includes("cotton") || low.includes("bajra") || low.includes("jowar") || low.includes("tur") || low.includes("moong") || low.includes("urd") || low.includes("soyabean") || low.includes("groundnut") || low.includes("maize")) return "Kharif";
  if (low.includes("melon") || low.includes("gourd") || low.includes("cucumber") || low.includes("pumpkin")) return "Zaid";

  return "All Year";
};

/**
 * Get current season based on current month in India.
 */
export const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1; // 1 to 12
    
    // Kharif: June (6) to October (10)
    if (month >= 6 && month <= 10) return "Kharif";
    
    // Rabi: November (11) to March (3)
    if (month === 11 || month === 12 || month <= 3) return "Rabi";
    
    // Zaid: April (4) to May (5)
    return "Zaid";
};
