export const cropAdvantages = {
    // Kharif
    "Rice": "Staple food crop with high market demand; excellent yield in monsoon waterlogged areas.",
    "Paddy(Dhan)(Common)": "Staple food crop with high market demand; excellent yield in monsoon waterlogged areas.",
    "Paddy(Dhan)(Basmati)": "Premium export market product, exceptionally high market value.",
    "Maize": "Versatile crop used for food, fodder, and industrial uses; extremely robust.",
    "Cotton": "Major cash crop; high profitability due to textile industry demand.",
    "Groundnut": "Excellent oilseed crop; improves soil fertility by fixing atmospheric nitrogen.",
    
    // Rabi
    "Wheat": "Staple grain with consistent government procurement and universal domestic demand.",
    "Mustard": "High yield oilseed with great profitability; requires less water than wheat.",
    "Potato": "High carbohydrate yield per acre; massive consumer demand year-round.",
    "Onion": "Essential culinary ingredient; strong domestic and export demand.",
    "Garlic": "High market price density; medicinal properties make it globally sought after.",
    
    // Zaid
    "Water Melon": "Short duration cash crop; massive demand in summer yields quick returns.",
    "Pumpkin": "Long shelf life and low maintenance; grows easily in high temperatures.",
    "Bottle gourd": "Fast-growing vine with multiple harvests; popular in summer diets.",
    
    // All Year
    "Tomato": "Continuous harvesting capability; universal ingredient with short crop cycles.",
    "Apple": "High-value fruit crop with significant export potential and long cold-storage life.",
    "Banana": "Year-round yield; very high domestic consumption and consistent cash flow."
};

export const getCropAdvantages = (crop) => {
    if (!crop) return "";
    return cropAdvantages[crop] || `Growing ${crop} diversifies your farm profile, protects ground soil, and provides stable alternate income streams.`;
};
