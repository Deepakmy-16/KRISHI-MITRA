export function speakText(text) {
  if (!window.speechSynthesis) {
    alert("Text to speech not supported");
    return;
  }

  if (!text || text.trim() === "") {
    alert("No text to speak");
    return;
  }

  // Stop any previous speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "en-IN";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Small delay FIX (very important)
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 300);
}
