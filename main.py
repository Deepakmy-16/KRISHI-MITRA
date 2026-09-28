# main.py
import requests
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY")
URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

def fetch_crop_data(crop_name, limit=100):
    """Fetch real-time price data for a given crop from Agmarknet API."""
    params = {
        "api-key": API_KEY,
        "format": "json",
        "limit": limit,
        "filters[commodity]": crop_name
    }

    response = requests.get(URL, params=params)
    if response.status_code != 200:
        raise Exception(f"Error {response.status_code}: {response.text}")

    data = response.json().get("records", [])
    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)

    # ✅ Create the folder automatically if it doesn't exist
    os.makedirs("data", exist_ok=True)

    df.to_csv(f"data/{crop_name}_realtime.csv", index=False)
    return df
