import { useState } from "react";
import { getCropImage } from "../utils/getCropImage";

function FavoriteCrops({ allCrops = [] }) {
  const saved =
    JSON.parse(localStorage.getItem("favoriteCrops")) || [];

  const [favorites, setFavorites] = useState(saved);

  const toggleCrop = crop => {
    let updated;

    if (favorites.includes(crop)) {
      updated = favorites.filter(c => c !== crop);
    } else {
      updated = [...favorites, crop];
    }

    setFavorites(updated);
    localStorage.setItem(
      "favoriteCrops",
      JSON.stringify(updated)
    );
  };

  if (!allCrops.length) return null;

  return (
    <div style={{ padding: "20px" }}>
      <h3>⭐ Select Your Favorite Crops</h3>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "10px"
        }}
      >
        {allCrops.map(crop => (
          <button
            key={crop}
            onClick={() => toggleCrop(crop)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px 6px 6px",
              borderRadius: "30px",
              border: favorites.includes(crop)
                ? "2px solid green"
                : "1px solid #ccc",
              background: favorites.includes(crop)
                ? "#e8f5e9"
                : "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "transform 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <img 
              src={getCropImage(crop)} 
              alt={crop} 
              style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", border: "1px solid #ddd" }} 
            />
            {favorites.includes(crop) ? "⭐ " : ""}
            {crop}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FavoriteCrops;
