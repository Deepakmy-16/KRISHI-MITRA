export const speakFertilizer = ({ crop, stage, fertilizer }) => {
  if (!window.speechSynthesis) {
    alert("Voice not supported");
    return;
  }

  const text = `For ${crop}, apply ${fertilizer} at ${stage} stage.`;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};
