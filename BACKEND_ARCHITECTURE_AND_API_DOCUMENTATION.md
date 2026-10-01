# Krishi Mitra: Backend Architecture & Real-Time Price API Documentation
**Project Title**: Krishi Mitra (Smart Agricultural Advisory & Best Time to Sell Platform)  
**Document Type**: Technical Architecture & API Specification Report  
**Target Audience**: Academic Reviewers, Project Guides, and Viva Examiners  

---

## 1. Executive Summary

**Krishi Mitra** is a full-stack, data-driven agricultural decision support platform engineered to assist Indian farmers in optimizing crop yields, minimizing post-harvest losses, and maximizing revenue through data intelligence.

The backend is developed with **Python (Flask)** adhering to a decoupled service-layer architecture. It features:
- **Real-Time Market Intelligence**: Ingestion of live APMC mandi prices from the Government of India's Open Data Portal (`data.gov.in` - Agmarknet).
- **Deep Learning Disease Diagnosis**: Computer Vision via a Convolutional Neural Network (PyTorch CNN) classifying 38 distinct crop diseases.
- **Smart Advisory Engines**: Decision heuristics for crop-selling time ("Sell vs. Hold") and state-specific seed variety selection.
- **Automated Alerting Pipeline**: Background task scheduling (`APScheduler`) integrated with **Twilio (SMS)** and **Resend (Email)** for proactive threshold notifications.

---

## 2. System Architecture

```
+-------------------------------------------------------------------------+
|                              PRESENTATION LAYER                         |
|                 React.js Frontend (SPA) - Responsive UI                 |
+------------------------------------+------------------------------------+
                                     |
                                     | HTTP / JSON Requests (REST)
                                     v
+-------------------------------------------------------------------------+
|                              APPLICATION LAYER                          |
|                       Flask Application (backend/app.py)                |
|  - Cross-Origin Resource Sharing (CORS)                                 |
|  - Blueprints: Plant Disease, Recommendation, Farmer History            |
+-------------------+---------------------------------+-------------------+
                    |                                 |
                    v                                 v
+-----------------------------------+ +-----------------------------------+
|          SERVICE ENGINES          | |       BACKGROUND PROCESSOR        |
| - crop_recommendation_service     | | - APScheduler Engine              |
| - seed_recommendation_service     | | - alert_checker.py                |
| - plant_disease_service (PyTorch) | | - 12-Hour Mandi Price Sync        |
| - email_service & sms_service     | | - 5-Minute Price Alert Evaluation |
+-------------------+---------------+ +-----------------+-----------------+
                    |                                   |
                    v                                   v
+-----------------------------------+ +-----------------------------------+
|           STORAGE LAYER           | |         EXTERNAL INTEGRATIONS     |
| - SQLite: users.db & alerts.db    | | - Government Agmarknet API        |
| - Cached JSON: live_crops.json    | | - Twilio Telephony SMS API        |
| - Clean Datasets: CSV Files       | | - Resend Transactional Email API  |
+-----------------------------------+ +-----------------------------------+
```

---

## 3. Real-Time Crop Price API: Detailed Technical Walkthrough

### 3.1 Overview & Architecture Flow
The real-time price pipeline connects the official APMC Mandi database to the farmer's browser through a reliable 3-stage process:

```
[1. Government Agmarknet Server]
             |
             | HTTP GET with DATA_GOV_API_KEY
             v
[2. backend/crop_scraper.py]
             |
             | Parse, sanitize, format & write to disk
             v
[3. backend/data/live_crops.json (Cache)]
             |
             | Read into memory on demand
             v
[4. backend/app.py (/api/data)]
             |
             | HTTP 200 JSON Response
             v
[5. frontend/src/pages/PriceListPage.js]
```

---

### 3.2 Program File 1: Ingestion & Web Scraping Engine
- **File**: `backend/crop_scraper.py`
- **Function**: `fetch_realtime_prices()`

#### Implementation Details:
1. **Authentication**: Reads `DATA_GOV_API_KEY` from project environment configurations.
2. **Endpoint Targeting**: Queries the Agmarknet resource ID (`9ef2718d-35fe-4544-a3f3-db36ad213cb9`).
3. **Data Transformation**: Normalizes government records into standardized camel-cased dictionary items (`State`, `District`, `Market`, `Commodity`, `Arrival_Date`, `Min_Price`, `Max_Price`, `Modal_Price`).
4. **Local Caching**: Serializes the sanitized output to `backend/data/live_crops.json`.
5. **Fault Tolerance**: If the API times out, returns HTTP 429 (Rate Limit), or is offline, the backend activates `save_fallback_data()`, which dynamically generates realistic price distributions for 181 crops across 14 major agricultural states so the client application never crashes.

#### Key Code Snippet:
```python
# backend/crop_scraper.py

import requests
import json
import os

def fetch_realtime_prices():
    api_key = os.getenv("DATA_GOV_API_KEY")
    resource_id = "9ef2718d-35fe-4544-a3f3-db36ad213cb9"
    url = f"https://api.data.gov.in/resource/{resource_id}?api-key={api_key}&format=json&limit=500"

    try:
        response = requests.get(url, timeout=30)
        data = response.json()
        records = data.get('records', [])

        formatted_data = []
        for r in records:
            formatted_data.append({
                "State": r.get('state'),
                "District": r.get('district'),
                "Market": r.get('market'),           # Mandi name
                "Commodity": r.get('commodity'),     # Crop name
                "Variety": r.get('variety') or "FAQ",
                "Arrival_Date": r.get('arrival_date'),
                "Min_x0020_Price": str(r.get('min_price')),
                "Max_x0020_Price": str(r.get('max_price')),
                "Modal_x0020_Price": str(r.get('modal_price')) # Current benchmark (Rs/Quintal)
            })

        output_path = os.path.join(os.path.dirname(__file__), 'data', 'live_crops.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, indent=4)
        return True

    except Exception as e:
        print(f"[Scraper Notice]: API unavailable ({e}). Using cached fallback.")
        return save_fallback_data()
```

---

### 3.3 Program File 2: REST API Server & Background Scheduler
- **File**: `backend/app.py`
- **Endpoint**: `GET /api/data`
- **Scheduler**: `APScheduler.BackgroundScheduler`

#### Implementation Details:
1. **Memory Caching**: Loads `live_crops.json` into a global memory structure `DATA` for sub-millisecond retrieval.
2. **Background Automation**: An asynchronous daemon scheduler runs `fetch_realtime_prices` on a 12-hour recurring interval, decoupling third-party network latency from user requests.
3. **Alert Triggering**: The scheduler evaluates farmer price thresholds every 5 minutes against current modal prices.

#### Key Code Snippet:
```python
# backend/app.py

from flask import Flask, jsonify
from apscheduler.schedulers.background import BackgroundScheduler
from crop_scraper import fetch_realtime_prices
import json
import os

app = Flask(__name__)
DATA = []

def load_data():
    global DATA
    live_path = os.path.join(BASE_DIR, "data", "live_crops.json")
    if os.path.exists(live_path):
        with open(live_path, 'r', encoding='utf-8') as f:
            DATA = json.load(f)

@app.route("/api/data", methods=["GET"])
def get_data():
    load_data()
    return jsonify(DATA)

# Asynchronous Background Scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(func=fetch_realtime_prices, trigger="interval", hours=12)
scheduler.start()
```

---

### 3.4 Program File 3: Presentation & Client Consumption
- **File**: `frontend/src/pages/PriceListPage.js`
- **Mechanism**: Asynchronous Fetch API (`window.fetch`)

#### Implementation Details:
1. Hooks into React's lifecycle via `useEffect`.
2. Dispatches an asynchronous `GET` request to `http://localhost:5000/api/data` (or production host).
3. Binds the response payload to state, enabling client-side search, filtering by State/District, and graphical price comparisons.

#### Key Code Snippet:
```javascript
// frontend/src/pages/PriceListPage.js

useEffect(() => {
  const fetchMandiPrices = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/data");
      const data = await response.json();
      setPriceData(data);
      setFilteredData(data);
    } catch (err) {
      console.error("Failed to load real-time market data:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchMandiPrices();
}, []);
```

---

## 4. Other Integrated Backend Subsystems

| Subsystem | Primary File | Description |
| :--- | :--- | :--- |
| **Plant Disease Diagnosis** | `backend/services/plant_disease_service.py` | PyTorch CNN classifying 38 crop leaf disease classes with pesticide/supplement solutions. |
| **Crop Selling Advisory** | `backend/services/crop_recommendation_service.py` | Heuristic engine comparing modal price against moving averages to suggest "Sell" or "Hold". |
| **Seed Variety Recommender** | `backend/services/seed_recommendation_service.py` | Geospatial and soil matching using `krishi_mitra_seed_varieties_clean.csv`. |
| **Government Welfare Schemes** | `backend/schemes_scraper.py` | HTML parser using `BeautifulSoup4` extracting latest benefits from `myscheme.gov.in`. |
| **SMS Notification System** | `backend/services/sms_service.py` | Twilio REST integration dispatching mobile alerts when crop prices reach a farmer's target. |

---

## 5. Viva / Presentation Q&A Preparation

### Q1: Why didn't you call the Government API directly from the React Frontend?
**Answer**:
> *"Direct browser-to-government API calls cause CORS (Cross-Origin Resource Sharing) errors, expose our private API secret keys in client JavaScript, and result in slow page loads due to government server latency. By fetching through our Flask backend, our API keys remain completely secure, responses are cached in JSON for sub-second retrieval, and automated fallback data protects against external outages."*

### Q2: What is the significance of the "Modal Price"?
**Answer**:
> *"In APMC mandis, transactions occur at minimum, maximum, and modal rates. The **Modal Price** represents the price at which the highest volume of that commodity was traded on that day, making it the most accurate benchmark of real market value for farmers."*

### Q3: How is system responsiveness maintained during background tasks?
**Answer**:
> *"We utilize `APScheduler` (`BackgroundScheduler`), which executes jobs in a background thread separate from Flask's request-handling threads. As a result, operations like scraping or sending SMS alerts never block client HTTP requests."*
