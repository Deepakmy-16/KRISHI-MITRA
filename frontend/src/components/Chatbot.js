import React, { useState, useEffect, useRef } from "react";
import { BotIcon, MicIcon, SendIcon, XIcon, Volume2Icon } from "./Icons";
import "./Chatbot.css";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const language = localStorage.getItem("lang") || "en";
  const [messages, setMessages] = useState([
    { text: "Namaste! I am your AI Kisan Assistant. How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const welcomeMessages = {
    en: "Namaste! I am your AI Kisan Assistant. How can I help you today?",
    hi: "नमस्ते! मैं आपका किसान सहायक हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
    kn: "ನಮಸ್ತೆ! ನಾನು ನಿಮ್ಮ ಕಿಸಾನ್ ಸಹಾಯಕಿ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    ta: "வணக்கம்! நான் உங்கள் கிசான் உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    te: "నమస్తే! నేను మీ కిసాన్ అసిస్టెంట్. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?"
  };

  useEffect(() => {
    setMessages([{ text: welcomeMessages[language] || welcomeMessages.en, isUser: false }]);
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const speakText = (text) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const locales = { en: "en-IN", hi: "hi-IN", kn: "kn-IN", ta: "ta-IN", te: "te-IN" };
      utter.lang = locales[language] || "en-IN";
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { text: input, isUser: true };
    setMessages((prev) => [...prev, userMsg]);
    const sentText = input;
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: sentText, language: language })
      });
      const data = await response.json();
      const reply = data.response || "I am processing your query based on APMC Mandi data.";

      setMessages((prev) => [...prev, { text: reply, isUser: false }]);
      speakText(reply);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMsgs = {
        en: "Sorry, I am having trouble connecting to backend.",
        hi: "क्षमा करें, मैं अभी जुड़ नहीं पा रहा हूँ।",
        kn: "ಕ್ಷಮಿಸಿ, ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ.",
        ta: "மன்னிக்கவும், இணைப்பதில் சிக்கல் உள்ளது.",
        te: "క్షమించండి, కనెక్ట్ చేయడంలో సమస్య ఉంది."
      };
      setMessages((prev) => [
        ...prev,
        { text: errorMsgs[language] || errorMsgs.en, isUser: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }

    const recognition = new SpeechRecognition();
    const locales = { en: "en-IN", hi: "hi-IN", kn: "kn-IN", ta: "ta-IN", te: "te-IN" };
    recognition.lang = locales[language] || "en-IN";
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const placeholders = {
    en: "Ask about crops, mandi prices, sprays...",
    hi: "फसल, मंडी भाव या खाद के बारे में पूछें...",
    kn: "ಬೆಳೆ, ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...",
    ta: "பயிர் மற்றும் விலை பற்றி கேளுங்கள்...",
    te: "పంట ధరల గురించి అడగండి..."
  };

  return (
    <div className="floating-chatbot-root">
      {!isOpen ? (
        <button
          className="chatbot-floating-trigger"
          onClick={() => setIsOpen(true)}
          title="Open AI Kisan Assistant"
        >
          <div className="chatbot-icon-inner">
            <BotIcon size={24} />
          </div>
          <span className="chatbot-badge-tag">AI Assistant</span>
          <span className="chatbot-online-dot"></span>
        </button>
      ) : (
        <div className="chatbot-window-box kisan-card animate-fade-in">
          {/* Header */}
          <div className="chatbot-top-bar">
            <div className="bot-title-group">
              <div className="bot-avatar-badge">🌾</div>
              <div>
                <h4>AI Kisan Assistant</h4>
                <span className="bot-status-sub">Online • Voice Enabled</span>
              </div>
            </div>
            <button
              className="chatbot-close-action"
              onClick={() => setIsOpen(false)}
              aria-label="Close Chat"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="chatbot-messages-feed">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble-row ${msg.isUser ? "user-bubble-row" : "bot-bubble-row"}`}
              >
                <div className="chat-bubble-text">{msg.text}</div>
                {!msg.isUser && (
                  <button
                    className="btn-bubble-speak"
                    onClick={() => speakText(msg.text)}
                    title="Speak"
                  >
                    <Volume2Icon size={12} />
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-row bot-bubble-row">
                <div className="chat-bubble-text typing">
                  <span>●</span>
                  <span>●</span>
                  <span>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="chatbot-tray-input-box">
            <button
              type="button"
              className={`btn-chatbot-mic ${isListening ? "active-listen" : ""}`}
              onClick={handleVoiceInput}
              title="Click to speak"
            >
              <MicIcon size={18} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={placeholders[language]}
              className="chatbot-input-field"
            />

            <button
              type="button"
              className="btn-chatbot-send"
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              <SendIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
