// 🔊 Speak single market price (used in PriceListPage)
export function speakPrice({ crop, market, price, state }) {
  if (!window.speechSynthesis) return;

  const message = `The price of ${crop} in ${market}, ${state} is ${price} rupees.`;

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-IN";
  utterance.rate = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// 🔊 Speak best market (used in Dashboard)
export function speakBestMarket({
  crop,
  market,
  state,
  price,
  greeting
}) {
  if (!window.speechSynthesis) return;

  const message = `${greeting}. Today the best market is ${market}, ${state}. ${crop} price is ${price} rupees.`;

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-IN";
  utterance.rate = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// 🔊 Speak comparison (used in ComparisonPage)
export function speakComparison({
  cropA,
  priceA,
  cropB,
  priceB
}) {
  if (!window.speechSynthesis) return;

  let message = "";

  if (priceA < priceB) {
    message = `${cropA} price is lower than ${cropB}. ${cropB} has a higher market price today.`;
  } else if (priceA > priceB) {
    message = `${cropB} price is lower than ${cropA}. ${cropA} has a higher market price today.`;
  } else {
    message = `${cropA} and ${cropB} have the same market price today.`;
  }

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-IN";
  utterance.rate = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
