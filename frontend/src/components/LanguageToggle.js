import { useState, useEffect } from "react";

function LanguageToggle() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("lang");
    if (savedLang) setLang(savedLang);
  }, []);

  const handleChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    window.location.reload(); // simple refresh to update global state
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिन्दी" },
    { code: "kn", name: "ಕನ್ನಡ" },
    { code: "ta", name: "தமிழ்" },
    { code: "te", name: "తెలుగు" }
  ];

  return (
    <select
      value={lang}
      onChange={handleChange}
      style={{
        padding: "6px 10px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        cursor: "pointer",
        background: "#f1f8e9",
        fontWeight: "bold",
        fontSize: "14px"
      }}
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

export default LanguageToggle;
