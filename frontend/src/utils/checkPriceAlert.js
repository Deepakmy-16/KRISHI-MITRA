let alerted = false; // prevent repeated alerts

export function checkPriceAlert(cropName, currentPrice) {
  if (alerted) return;

  const alertData = JSON.parse(localStorage.getItem("priceAlert"));
  if (!alertData) return;

  if (alertData.crop !== cropName) return;

  const min = Number(alertData.minPrice);
  const max = Number(alertData.maxPrice);
  const price = Number(currentPrice);

  if (min && price <= min) {
    alerted = true;
    showInAppAlert(
      `🔻 Price Drop Alert`,
      `${cropName} price fell to ₹${price}`
    );
  }

  if (max && price >= max) {
    alerted = true;
    showInAppAlert(
      `📈 Price Rise Alert`,
      `${cropName} price increased to ₹${price}`
    );
  }
}

function showInAppAlert(title, message) {
  // Popup (demo)
  alert(`${title}\n${message}`);

  // Save last alert (optional)
  localStorage.setItem(
    "lastAlert",
    JSON.stringify({ title, message, time: new Date() })
  );
}
