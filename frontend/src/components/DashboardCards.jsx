import React from "react";
import "./DashboardCards.css";
import { getCategory } from "../utils/cropCategories";
import { SproutIcon } from "./Icons";

function DashboardCards({ data = [], selectedCategory, onCategoryClick }) {
  const vegetables = data.filter(
    (d) => getCategory(d.Commodity || d.commodity || d.Crop || d.crop_name) === "Vegetables"
  ).length;

  const fruits = data.filter(
    (d) => getCategory(d.Commodity || d.commodity || d.Crop || d.crop_name) === "Fruits"
  ).length;

  const others = Math.max(0, data.length - vegetables - fruits);

  const categories = [
    {
      id: "Vegetables",
      title: "Fresh Vegetables",
      emoji: "🥦",
      count: vegetables,
      colorClass: "green",
      desc: "Tomato, Onion, Potato, Chilli & greens"
    },
    {
      id: "Fruits",
      title: "Seasonal Fruits",
      emoji: "🍎",
      count: fruits,
      colorClass: "orange",
      desc: "Banana, Mango, Apple, Papaya & citrus"
    },
    {
      id: "Others",
      title: "Grains & Cash Crops",
      emoji: "🌾",
      count: others,
      colorClass: "blue",
      desc: "Wheat, Rice, Cotton, Mustard & pulses"
    }
  ];

  return (
    <div className="dashboard-category-block">
      <div className="category-block-header">
        <div className="title-with-icon">
          <SproutIcon size={22} color="#15803d" />
          <h3>Crop Category Explorer</h3>
        </div>
        <span className="category-hint">Select a category to filter crops and instant sell/wait advice</span>
      </div>

      <div className="category-cards-grid">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;

          return (
            <div
              key={cat.id}
              className={`category-action-card ${cat.colorClass} ${isSelected ? "selected" : ""}`}
              onClick={() => onCategoryClick(cat.id)}
            >
              <div className="card-top-row">
                <span className="category-emoji-box">{cat.emoji}</span>
                <span className="crop-count-badge">
                  {cat.count} {cat.count === 1 ? "Variety" : "Varieties"}
                </span>
              </div>

              <div className="card-body-row">
                <h4>{cat.title}</h4>
                <p>{cat.desc}</p>
              </div>

              <div className="card-bottom-row">
                <span className="view-details-text">
                  {isSelected ? "● Viewing Crops" : "Click to view Mandi rates &rarr;"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardCards;
