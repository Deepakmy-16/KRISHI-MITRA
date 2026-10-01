// =========================================================
// cropHelpers.js — Agricultural commodity filtering & helpers
// =========================================================

const NON_CROP_KEYWORDS = [
  "pig", "pigs", "goat", "goats", "sheep", "bull", "bulls", "cow", "cows",
  "buffalo", "buffaloes", "calf", "calves", "camel", "camels", "cock", "hen",
  "chicken", "poultry", "donkey", "horse", "mule", "meat", "fish", "egg", "eggs",
  "ox", "oxen", "ram", "ewe", "kid", "lamb"
];

/**
 * Filter out livestock / animals / non-crops
 */
export function isAgriculturalCrop(item) {
  if (!item) return false;
  const name = (
    item.Commodity ||
    item.commodity ||
    item.Crop ||
    item.crop_name ||
    (typeof item === "string" ? item : "")
  ).toLowerCase().trim();

  if (!name) return false;

  return !NON_CROP_KEYWORDS.some((kw) => {
    return (
      name === kw ||
      name.startsWith(kw + " ") ||
      name.endsWith(" " + kw) ||
      name.includes(`(${kw})`) ||
      name.includes(` ${kw} `)
    );
  });
}

/**
 * Return an agricultural emoji for the commodity
 */
export function getCropEmoji(rawName = "") {
  const n = (rawName || "").toLowerCase();
  if (n.includes("wheat")) return "🌾";
  if (n.includes("rice") || n.includes("paddy")) return "🍚";
  if (n.includes("tomato")) return "🍅";
  if (n.includes("onion")) return "🧅";
  if (n.includes("potato")) return "🥔";
  if (n.includes("ginger")) return "🫚";
  if (n.includes("garlic")) return "🧄";
  if (n.includes("chilli") || n.includes("chili")) return "🌶️";
  if (n.includes("apple")) return "🍎";
  if (n.includes("banana")) return "🍌";
  if (n.includes("mango")) return "🥭";
  if (n.includes("orange") || n.includes("citrus") || n.includes("mosambi")) return "🍊";
  if (n.includes("grape")) return "🍇";
  if (n.includes("cotton")) return "☁️";
  if (n.includes("maize") || n.includes("corn")) return "🌽";
  if (n.includes("mustard")) return "🌼";
  if (n.includes("groundnut") || n.includes("peanut")) return "🥜";
  if (n.includes("soyabean") || n.includes("soybean")) return "🌱";
  if (n.includes("gram") || n.includes("chana") || n.includes("dal") || n.includes("moong") || n.includes("urad") || n.includes("arhar")) return "🫘";
  if (n.includes("brinjal") || n.includes("eggplant")) return "🍆";
  if (n.includes("cabbage")) return "🥬";
  if (n.includes("cauliflower")) return "🥦";
  if (n.includes("carrot")) return "🥕";
  if (n.includes("radish")) return "🥕";
  if (n.includes("turmeric")) return "💛";
  if (n.includes("cardamom")) return "🌿";
  if (n.includes("sugarcane")) return "🎋";
  if (n.includes("tea") || n.includes("coffee")) return "☕";
  if (n.includes("coconut")) return "🥥";
  if (n.includes("papaya")) return "🍈";
  if (n.includes("lemon") || n.includes("lime")) return "🍋";
  if (n.includes("guava")) return "🍐";
  if (n.includes("pomegranate")) return "🍎";
  if (n.includes("coriander")) return "🌿";
  if (n.includes("cumin") || n.includes("jeera")) return "🌿";
  if (n.includes("sunflower")) return "🌻";
  if (n.includes("sesamum") || n.includes("til")) return "🌱";
  if (n.includes("fenugreek") || n.includes("methi")) return "🌿";
  if (n.includes("pumpkin") || n.includes("gourd")) return "🎃";
  if (n.includes("cucumber")) return "🥒";
  if (n.includes("capsicum")) return "🫑";
  if (n.includes("peas") || n.includes("matar")) return "🫛";
  return "🌱";
}

/**
 * Classify commodity into a category
 */
export function getCropCategory(rawName = "") {
  const n = (rawName || "").toLowerCase();

  // Vegetables
  if (
    n.includes("tomato") || n.includes("onion") || n.includes("potato") ||
    n.includes("brinjal") || n.includes("cabbage") || n.includes("cauliflower") ||
    n.includes("carrot") || n.includes("radish") || n.includes("pumpkin") ||
    n.includes("gourd") || n.includes("cucumber") || n.includes("capsicum") ||
    n.includes("peas") || n.includes("bhindi") || n.includes("lady") ||
    n.includes("spinach") || n.includes("palak") || n.includes("methi") ||
    n.includes("beetroot") || n.includes("drumstick")
  ) {
    return "Vegetables";
  }

  // Fruits
  if (
    n.includes("apple") || n.includes("banana") || n.includes("mango") ||
    n.includes("orange") || n.includes("grape") || n.includes("papaya") ||
    n.includes("guava") || n.includes("pomegranate") || n.includes("lemon") ||
    n.includes("watermelon") || n.includes("melon") || n.includes("pineapple") ||
    n.includes("custard") || n.includes("sapota") || n.includes("chikoo") ||
    n.includes("sweet orange") || n.includes("citrus")
  ) {
    return "Fruits";
  }

  // Grains & Cereals
  if (
    n.includes("wheat") || n.includes("rice") || n.includes("paddy") ||
    n.includes("maize") || n.includes("corn") || n.includes("barley") ||
    n.includes("jowar") || n.includes("bajra") || n.includes("ragi") ||
    n.includes("millet") || n.includes("sorghum")
  ) {
    return "Grains & Cereals";
  }

  // Pulses
  if (
    n.includes("gram") || n.includes("chana") || n.includes("dal") ||
    n.includes("moong") || n.includes("urad") || n.includes("arhar") ||
    n.includes("tur") || n.includes("lentil") || n.includes("masur") ||
    n.includes("bean") || n.includes("cowpea") || n.includes("rajma")
  ) {
    return "Pulses";
  }

  // Spices
  if (
    n.includes("ginger") || n.includes("garlic") || n.includes("chilli") ||
    n.includes("chili") || n.includes("turmeric") || n.includes("cardamom") ||
    n.includes("coriander") || n.includes("cumin") || n.includes("jeera") ||
    n.includes("black pepper") || n.includes("fennel") || n.includes("clove")
  ) {
    return "Spices";
  }

  // Oilseeds
  if (
    n.includes("mustard") || n.includes("groundnut") || n.includes("peanut") ||
    n.includes("soyabean") || n.includes("soybean") || n.includes("sunflower") ||
    n.includes("sesamum") || n.includes("til") || n.includes("castor") ||
    n.includes("linseed")
  ) {
    return "Oilseeds";
  }

  return "Other Crops";
}
