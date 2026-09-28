const VEGETABLE_KEYWORDS = [
  "tomato", "potato", "onion", "chilli", "brinjal", "cabbage", "cauliflower",
  "capsicum", "carrot", "radish", "raddish", "beetroot", "beans", "gourd",
  "pumpkin", "spinach", "cucumber", "cucumbar", "drumstick", "peas", "pea",
  "tinda", "chow chow", "bhindi", "ladies finger", "leafy", "methi", "mint",
  "coriander(leaves)", "turnip", "yam", "knool khol", "alsandikai", "amaranthus",
  "amphophalus", "ashgourd", "betal leaves", "season leaves", "seemebadnekai",
  "snakeguard", "ridgeguard", "sponge gourd", "squash", "suvarna gadde",
  "thogrikai", "thondekai", "pointed gourd", "little gourd", "long melon",
  "round gourd", "mashrooms", "parval", "kundru", "kakri"
];

const FRUIT_KEYWORDS = [
  "apple", "banana", "mango", "grapes", "orange", "papaya", "guava", "chikoo",
  "pomegranate", "pineapple", "fig", "pear", "plum", "lemon", "lime", "kinnow",
  "mousambi", "sweet lime", "sweet potato", "amla", "custard apple", "jack fruit",
  "water melon", "musk melon", "karbuja", "sharifa", "seetapal", "persimon"
];

export const getCategory = (crop) => {
  if (!crop) return "Others";
  const name = crop.trim().toLowerCase();

  for (const v of VEGETABLE_KEYWORDS) {
    if (name.includes(v)) return "Vegetables";
  }

  for (const f of FRUIT_KEYWORDS) {
    if (name.includes(f)) return "Fruits";
  }

  return "Others";
};
