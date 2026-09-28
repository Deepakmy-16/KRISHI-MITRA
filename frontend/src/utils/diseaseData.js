const diseaseData = {
  Tomato: {
    "Yellow leaves": {
      problem: "Nitrogen Deficiency",
      fertilizer: "Urea",
      stage: "Vegetative stage",
      benefit: "Improves leaf growth and yield"
    },
    "Flower drop": {
      problem: "Boron Deficiency",
      fertilizer: "Boron (Borax)",
      stage: "Flowering stage",
      benefit: "Prevents flower drop"
    },
    "Leaf spots": {
      problem: "Fungal Disease",
      fertilizer: "Potash + Mancozeb",
      stage: "Any stage",
      benefit: "Controls leaf infection"
    }
  },

  Rice: {
    "Yellow leaves": {
      problem: "Nitrogen Deficiency",
      fertilizer: "Urea",
      stage: "Tillering stage",
      benefit: "Improves tiller growth"
    },
    "Poor growth": {
      problem: "Phosphorus Deficiency",
      fertilizer: "DAP",
      stage: "Early stage",
      benefit: "Strong root development"
    }
  },

  Cotton: {
    "Flower drop": {
      problem: "Potassium Deficiency",
      fertilizer: "Potash",
      stage: "Flowering stage",
      benefit: "Better boll formation"
    },
    "Weak plants": {
      problem: "Nitrogen Deficiency",
      fertilizer: "Urea",
      stage: "Vegetative stage",
      benefit: "Improves plant strength"
    }
  }
};

export default diseaseData;
