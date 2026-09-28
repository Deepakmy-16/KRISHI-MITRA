import { useState } from "react";
import fertilizerData from "../utils/fertilizerData";
import "./FertilizerRecommendation.css";

function FertilizerRecommendation() {
  const [selectedCrop, setSelectedCrop] = useState("");

  const crops = Object.keys(fertilizerData);

  return (
    <div className="fertilizer-page">
      <h2>🌱 Fertilizer Recommendation</h2>

      <select
        value={selectedCrop}
        onChange={e => setSelectedCrop(e.target.value)}
        className="crop-select"
      >
        <option value="">🌾 Select Crop</option>
        {crops.map(crop => (
          <option key={crop} value={crop}>
            {crop}
          </option>
        ))}
      </select>

      {selectedCrop && (
        <div className="fertilizer-list">
          {fertilizerData[selectedCrop].map((item, index) => (
            <div key={index} className="fertilizer-card">
              <h4>🌿 Stage: {item.stage}</h4>
              <p><b>🧪 Fertilizer:</b> {item.fertilizer}</p>
              <p><b>✅ Benefit:</b> {item.benefit}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FertilizerRecommendation;
