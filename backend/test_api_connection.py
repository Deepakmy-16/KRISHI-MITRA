import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
api_key = os.getenv("DATA_GOV_API_KEY") or os.getenv("API_KEY")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}

rid = "9ef84268-d588-465a-a308-a864a43d0070"
url = f"https://api.data.gov.in/resource/{rid}"

# Test 1: with filters[commodity]=Potato
params1 = {
    "api-key": api_key,
    "format": "json",
    "limit": 5,
    "filters[commodity]": "Potato"
}

print("--- Test 1: filters[commodity]=Potato ---")
try:
    r = requests.get(url, params=params1, headers=headers, timeout=15)
    print("Status code:", r.status_code)
    print("Body snippet:", r.text[:300])
except Exception as e:
    print("Error:", e)

# Test 2: without filters, limit=1
params2 = {
    "api-key": api_key,
    "format": "json",
    "limit": 1
}
print("\n--- Test 2: limit=1 ---")
try:
    r = requests.get(url, params=params2, headers=headers, timeout=15)
    print("Status code:", r.status_code)
    print("Body snippet:", r.text[:300])
except Exception as e:
    print("Error:", e)
