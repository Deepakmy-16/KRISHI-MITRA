const fertilizerData = {
  /* 🌿 VEGETABLES */
  Tomato: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Strong roots and soil fertility" },
    { stage: "Vegetative", fertilizer: "Urea", benefit: "Leaf and stem growth" },
    { stage: "Flowering", fertilizer: "Potash (MOP)", benefit: "Better fruit size" },
    { stage: "Micronutrients", fertilizer: "Boron + Zinc", benefit: "Prevents flower drop" }
  ],

  Onion: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Good bulb formation" },
    { stage: "Growth", fertilizer: "Urea", benefit: "Healthy leaves" },
    { stage: "Bulb stage", fertilizer: "Potash", benefit: "Bulb size improvement" }
  ],

  Potato: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Tuber initiation" },
    { stage: "Growth", fertilizer: "Urea", benefit: "Plant vigor" },
    { stage: "Tuber stage", fertilizer: "Potash", benefit: "Higher yield" }
  ],

  Brinjal: [
    { stage: "Basal", fertilizer: "FYM", benefit: "Soil fertility" },
    { stage: "Growth", fertilizer: "Urea", benefit: "Vegetative growth" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Fruit quality" }
  ],

  Cabbage: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Head formation" },
    { stage: "Growth", fertilizer: "Urea", benefit: "Leaf growth" }
  ],

  Cauliflower: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Curd development" },
    { stage: "Growth", fertilizer: "Urea", benefit: "Plant growth" }
  ],

  Chilli: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Healthy plant base" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "More flowers" },
    { stage: "Fruiting", fertilizer: "Calcium", benefit: "Prevents fruit drop" }
  ],

  /* 🌾 CEREALS */
  Rice: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Root & tiller growth" },
    { stage: "Tillering", fertilizer: "Urea", benefit: "More tillers" },
    { stage: "Panicle", fertilizer: "Potash", benefit: "Grain filling" }
  ],

  Wheat: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Root development" },
    { stage: "Tillering", fertilizer: "Urea", benefit: "More shoots" },
    { stage: "Grain filling", fertilizer: "Potash", benefit: "Grain weight" }
  ],

  Maize: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Strong roots" },
    { stage: "Vegetative", fertilizer: "Urea", benefit: "Leaf growth" },
    { stage: "Cob stage", fertilizer: "Potash", benefit: "Better cob size" }
  ],

  Sorghum: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Early growth" },
    { stage: "Growth", fertilizer: "Urea", benefit: "Stem development" }
  ],

  Bajra: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Root growth" },
    { stage: "Vegetative", fertilizer: "Urea", benefit: "Plant vigor" }
  ],

  /* 🌱 PULSES */
  RedGram: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Root nodulation" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Pod formation" }
  ],

  GreenGram: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Root growth" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Yield improvement" }
  ],

  BlackGram: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Early growth" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Pod filling" }
  ],

  Chickpea: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Root development" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Seed quality" }
  ],

  /* 🌻 OILSEEDS */
  Groundnut: [
    { stage: "Basal", fertilizer: "Gypsum + DAP", benefit: "Pod development" },
    { stage: "Flowering", fertilizer: "Calcium", benefit: "Better pod filling" }
  ],

  Sunflower: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Root growth" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Seed filling" }
  ],

  Mustard: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Early growth" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Oil content" }
  ],

  Soybean: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Root nodulation" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Seed quality" }
  ],

  /* 🍌 FRUITS */
  Banana: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Root establishment" },
    { stage: "Growth", fertilizer: "Urea", benefit: "Leaf growth" },
    { stage: "Bunch stage", fertilizer: "Potash", benefit: "Fruit weight" }
  ],

  Mango: [
    { stage: "Basal", fertilizer: "FYM", benefit: "Soil fertility" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Fruit set" }
  ],

  Grapes: [
    { stage: "Basal", fertilizer: "FYM", benefit: "Vine strength" },
    { stage: "Berry stage", fertilizer: "Potash", benefit: "Fruit quality" }
  ],

  Papaya: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Root growth" },
    { stage: "Fruiting", fertilizer: "Potash", benefit: "Sweet fruits" }
  ],

  /* 🌾 COMMERCIAL */
  Cotton: [
    { stage: "Basal", fertilizer: "DAP", benefit: "Early growth" },
    { stage: "Vegetative", fertilizer: "Urea", benefit: "Branch growth" },
    { stage: "Flowering", fertilizer: "Potash", benefit: "Boll formation" }
  ],

  Sugarcane: [
    { stage: "Basal", fertilizer: "FYM + DAP", benefit: "Strong cane" },
    { stage: "Growth", fertilizer: "Urea", benefit: "Stem elongation" }
  ]
};

export default fertilizerData;
