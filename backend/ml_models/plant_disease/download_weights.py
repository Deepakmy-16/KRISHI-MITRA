import os
import sys
import urllib.request

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(MODEL_DIR, "plant_disease_model_1_latest.pt")
DOWNLOAD_URL = "https://drive.usercontent.google.com/download?id=1GWJ5HC8LxQsExmHEZWf7q89MRUquqt7U&export=download&confirm=t"

def ensure_model_weights():
    """Ensure that the trained PyTorch weights file exists, downloading if necessary."""
    if os.path.exists(MODEL_FILE) and os.path.getsize(MODEL_FILE) > 100_000_000:
        return MODEL_FILE

    print(f"[Plant Disease Model] Model weights not found or incomplete. Downloading from Google Drive...")
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(DOWNLOAD_URL, headers=headers)
    
    tmp_file = MODEL_FILE + ".tmp"
    try:
        with urllib.request.urlopen(req) as response, open(tmp_file, "wb") as out_file:
            total_size = int(response.headers.get("Content-Length", 0))
            downloaded = 0
            chunk_size = 1024 * 1024  # 1MB
            
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                out_file.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    pct = (downloaded / total_size) * 100
                    sys.stdout.write(f"\rDownloading model weights: {downloaded / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB ({pct:.1f}%)")
                    sys.stdout.flush()
                else:
                    sys.stdout.write(f"\rDownloading model weights: {downloaded / (1024*1024):.1f} MB")
                    sys.stdout.flush()

        print("\n[Plant Disease Model] Download complete. Validating...")
        if os.path.exists(tmp_file) and os.path.getsize(tmp_file) > 100_000_000:
            if os.path.exists(MODEL_FILE):
                os.remove(MODEL_FILE)
            os.rename(tmp_file, MODEL_FILE)
            print(f"[Plant Disease Model] Saved weights to {MODEL_FILE}")
            return MODEL_FILE
        else:
            raise Exception("Downloaded file is smaller than expected.")
    except Exception as e:
        if os.path.exists(tmp_file):
            try:
                os.remove(tmp_file)
            except OSError:
                pass
        raise RuntimeError(f"Failed to download plant disease model weights: {e}")

if __name__ == "__main__":
    ensure_model_weights()
