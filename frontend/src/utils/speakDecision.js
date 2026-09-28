export function speakDecision({
  userName,
  crop,
  market,
  state,
  price,
  allPrices
}) {
  if (!window.speechSynthesis) return;

  const avg =
    allPrices.reduce((a, b) => a + b, 0) /
    allPrices.length;

  let decision = "hold";
  let decisionText = "You can hold.";

  if (price >= avg * 1.1) {
    decision = "sell";
    decisionText = "You should sell now.";
  } else if (price <= avg * 0.9) {
    decision = "wait";
    decisionText = "Please wait. Price is low.";
  }

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  const text = `${greeting} ${userName}. 
${crop} price in ${market}, ${state} is ${price} rupees. 
${decisionText}`;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-IN";
  utter.rate = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
