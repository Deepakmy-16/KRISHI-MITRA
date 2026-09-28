import { useState } from "react";
import productGroups from "../utils/productGroups";
import { getCropImage } from "../utils/getCropImage";

function ProductGroups({ crops = [], onCropSelect }) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  const groupedCrops = selectedGroup
    ? crops.filter(crop => {
        const name = crop.toLowerCase();
        return productGroups[selectedGroup].some(k =>
          name.includes(k)
        );
      })
    : [];

  return (
    <div style={{ padding: "20px" }}>
      <h2>📦 Products</h2>

      {/* GROUP BUTTONS */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {Object.keys(productGroups).map(group => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            style={{
              padding: "10px 16px",
              borderRadius: "20px",
              border: "1px solid #aaa",
              cursor: "pointer",
              background:
                selectedGroup === group ? "#d1f2eb" : "#f5f5f5"
            }}
          >
            {group}
          </button>
        ))}
      </div>

      {/* CROPS */}
      {selectedGroup && (
        <div style={{ marginTop: "15px" }}>
          <h3>{selectedGroup}</h3>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {groupedCrops.map((crop, i) => (
              <span
                key={i}
                onClick={() => onCropSelect(crop)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px 4px 4px",
                  borderRadius: "20px",
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "transform 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <img 
                  src={getCropImage(crop)} 
                  alt={crop} 
                  style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", border: "1px solid #eee" }} 
                />
                {crop}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductGroups;
