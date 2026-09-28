export const speakDisease = ({ crop, problem, fertilizer, stage }) => {
  if (!window.speechSynthesis) {
    alert("Voice not supported");
    return;
  }

  const text = `For ${crop} crop, the problem is ${problem}. Apply ${fertilizer} at ${stage}.`;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};
