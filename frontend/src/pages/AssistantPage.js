import React, { useState, useEffect, useRef } from "react";
import translations from "../utils/translations";
import { BotIcon, MicIcon, SendIcon, SparklesIcon, Volume2Icon, RefreshCwIcon } from "../components/Icons";
import "./AssistantPage.css";

function AssistantPage() {
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const [messages, setMessages] = useState([
    {
      text: "Namaste! I am your AI Kisan Assistant. Ask me anything about crop prices, best markets, pest treatments, fertilizer dosage, or government schemes!",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const welcomeMessages = {
    en: "Namaste! I am your AI Kisan Assistant. How can I help you today with crops, market prices, or farming techniques?",
    hi: "नमस्ते! मैं आपका एआई किसान सहायक हूँ। फसलों, मंडी भावों या खेती तकनीकों के बारे में मैं आपकी क्या मदद कर सकता हूँ?",
    kn: "ನಮಸ್ತೆ! ನಾನು ನಿಮ್ಮ AI ಕಿಸಾನ್ ಸಹಾಯಕ. ಬೆಳೆಗಳು, ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು ಅಥವಾ ಕೃಷಿ ತಂತ್ರಗಳ ಕುರಿತು ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    ta: "வணக்கம்! நான் உங்கள் AI உழவர் உதவியாளர். பயிர்கள், சந்தை விலைகள் அல்லது விவசாய முறைகள் குறித்து நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    te: "నమస్తే! నేను మీ AI రైతు సహాయకుడిని. పంటలు, మార్కెట్ ధరలు లేదా వ్యవసాయ పద్ధతుల గురించి నేను మీకు ఎలా సహాయం చేయగలను?"
  };

  useEffect(() => {
    if (welcomeMessages[lang]) {
      setMessages([
        {
          text: welcomeMessages[lang],
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const locales = { en: "en-IN", hi: "hi-IN", kn: "kn-IN", ta: "ta-IN", te: "te-IN" };
      utter.lang = locales[lang] || "en-IN";
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleSend = async (customPrompt) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { text: textToSend, isUser: true, timestamp: timeStr };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, language: lang })
      });
      const data = await response.json();
      const botResponse = data.response || "Here is information based on current agricultural data.";

      setMessages((prev) => [
        ...prev,
        {
          text: botResponse,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      speakText(botResponse);
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "I am having trouble reaching the knowledge server. Please ensure the Flask backend is active.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    const locales = { en: "en-IN", hi: "hi-IN", kn: "kn-IN", ta: "ta-IN", te: "te-IN" };
    recognition.lang = locales[lang] || "en-IN";
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

  const suggestedQuestions = [
    "What is today's highest price for Tomato?",
    "Which fertilizer is best for Wheat during vegetative stage?",
    "How to prevent leaf blast in Rice crops?",
    "Tell me about PM-Kisan scheme benefits"
  ];

  return (
    <div className="assistant-page-container animate-fade-in">
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <BotIcon size={28} color="#15803d" />
            {t.aiAssistant || "AI Farmer Assistant"}
          </h1>
          <p>24/7 Voice & Chat Agri-Intelligence powered by AI and real-time market data</p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              setMessages([
                {
                  text: welcomeMessages[lang] || welcomeMessages.en,
                  isUser: false,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
            }}
          >
            <RefreshCwIcon size={16} /> Clear Chat
          </button>
        </div>
      </div>

      <div className="assistant-main-card kisan-card">
        {/* Suggestion Chips */}
        <div className="assistant-suggestions-bar">
          <span className="suggestions-label">💡 Suggested Questions:</span>
          <div className="suggestions-list">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => handleSend(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Feed */}
        <div className="assistant-chat-window">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message-bubble ${msg.isUser ? "user-side" : "bot-side"}`}>
              {!msg.isUser && (
                <div className="bot-avatar-icon">
                  <BotIcon size={18} />
                </div>
              )}
              <div className="message-content-box">
                <div className="message-text">{msg.text}</div>
                <div className="message-footer-meta">
                  <span className="timestamp">{msg.timestamp}</span>
                  {!msg.isUser && (
                    <button
                      className="btn-speak-msg"
                      onClick={() => speakText(msg.text)}
                      title="Speak message"
                    >
                      <Volume2Icon size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message-bubble bot-side">
              <div className="bot-avatar-icon">
                <BotIcon size={18} />
              </div>
              <div className="message-content-box typing-box">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">Analyzing agri-database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="assistant-input-tray">
          <button
            type="button"
            className={`btn-tray-mic ${isListening ? "listening" : ""}`}
            onClick={handleVoiceInput}
            title={isListening ? "Listening..." : "Click to speak in your language"}
          >
            <MicIcon size={20} />
          </button>

          <input
            type="text"
            className="assistant-text-input"
            placeholder="Type your question or click mic to speak in English / हिन्दी / ಕನ್ನಡ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button
            type="button"
            className="btn-tray-send"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <SendIcon size={18} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssistantPage;
