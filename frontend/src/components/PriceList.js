function PriceList({ data }) {
  return (
    <div className="crop-grid">
      {data.map((crop, i) => (
        <div className="crop-card" key={i}>
          <img src={crop.image} alt={crop.name} />
          <h3>{crop.name}</h3>
          <p>Present Price: ₹{crop.present}</p>
          <p>Previous Price: ₹{crop.previous}</p>
        </div>
      ))}
    </div>
  );
}

export default PriceList;
