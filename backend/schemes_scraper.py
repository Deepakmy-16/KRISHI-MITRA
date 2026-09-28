import requests
from bs4 import BeautifulSoup
import json
import os

def scrape_schemes():
    print("Starting scraper...")
    # Target URL for Agriculture schemes on myScheme portal
    url = "https://www.myscheme.gov.in/search/category/Agriculture,Community%20&%20Social%20Development"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        schemes = []
        
        # Note: selectors might need adjustment based on site updates
        # This is based on the general structure of myScheme cards
        items = soup.select('.grid.grid-cols-1.gap-4 > div') or soup.select('a[href*="/schemes/"]')
        
        for item in items:
            try:
                title_elem = item.find('h2') or item.find('h3')
                if not title_elem: continue
                
                title = title_elem.text.strip()
                desc_elem = item.find('p')
                description = desc_elem.text.strip() if desc_elem else "Click to view more details about this scheme."
                
                link = item.get('href') or (item.find('a')['href'] if item.find('a') else "")
                if link and not link.startswith('http'):
                    link = "https://www.myscheme.gov.in" + link
                
                schemes.append({
                    "id": len(schemes) + 1,
                    "title": title,
                    "description": description,
                    "benefits": "Check official portal for latest benefits.",
                    "eligibility": "Varies by state and land holding.",
                    "link": link,
                    "category": "Agriculture",
                    "tags": ["Latest", "Auto-Updated"]
                })
            except Exception as e:
                print(f"Error parsing item: {e}")
                continue

        if not schemes:
            print("No schemes found. Using fallback data.")
            return False

        # Save to backend/data/live_schemes.json
        output_dir = os.path.join(os.path.dirname(__file__), 'data')
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        output_file = os.path.join(output_dir, 'live_schemes.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(schemes, f, indent=4)
        
        print(f"Successfully scraped {len(schemes)} schemes!")
        return True

    except Exception as e:
        print(f"Scraper error: {e}")
        return False

if __name__ == "__main__":
    scrape_schemes()
