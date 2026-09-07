# RasterNorm

A lightweight web tool for normalizing raster images. Upload a GeoTIFF or raster file, normalize pixel values to 0-255 using per-band min-max scaling, and download the result.

The frontend is hosted on **GitHub Pages**. The backend runs on **Render.com**.

---

## Features

- Upload raster files by drag and drop or file browser
- Per-band min-max normalization (each band processed independently)
- Supports multi-band rasters
- Preserves spatial metadata and CRS in the output GeoTIFF
- Upload progress bar and processing status
- One-click download of normalized file

---

## Supported Formats

| Input | Output |
|---|---|
| `.tif` / `.tiff` | `.tif` (GeoTIFF) |
| `.img` | `.tif` (GeoTIFF) |
| `.png`, `.jpg`, `.bmp` | `.tif` (GeoTIFF) |

---

## How It Works

Each band is normalized independently using min-max scaling:

```
normalized = (pixel_value - band_min) / (band_max - band_min) * 255
```

NoData pixels are masked before computing min and max. The output is saved as an 8-bit unsigned integer GeoTIFF with spatial reference intact.

---

## Hosting Setup

The project is split into two parts:

| Part | Hosting |
|---|---|
| Frontend (HTML, CSS, JS) | GitHub Pages |
| Backend (Python / Flask) | Render.com |

### Step 1 — Deploy the backend on Render.com

1. Go to [render.com](https://render.com) and create a free account.
2. Click **New** then **Web Service**.
3. Connect your GitHub account and select this repository.
4. Render will detect `render.yaml` automatically. Confirm these settings:
   - **Build Command:** `pip install --prefer-binary -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Environment:** Python 3
5. Click **Create Web Service**.
6. Wait for the deploy to finish. Copy your service URL. It will look like:
   ```
   https://rasternorm-backend.onrender.com
   ```

### Step 2 — Update the frontend with your Render URL

Open `script.js` and replace the placeholder on line 2 with your actual Render URL:

```js
const API = "https://rasternorm-backend.onrender.com";
```

Save the file and commit the change to GitHub.

### Step 3 — Enable GitHub Pages

1. Go to your repository on GitHub.
2. Click **Settings** then **Pages**.
3. Under **Source**, select **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)` folder.
5. Click **Save**.
6. Your site will be live at:
   ```
   https://your-username.github.io/rasternorm/
   ```

---

## Project Structure

```
rasternorm/
├── index.html          # Main web interface
├── style.css           # Stylesheet
├── script.js           # Frontend logic (set API URL here)
├── app.py              # Flask backend
├── requirements.txt    # Python dependencies
├── Procfile            # Render start command
├── render.yaml         # Render deployment config
├── start.bat           # Windows local launcher
└── start.sh            # Mac / Linux local launcher
```

---

## Running Locally

If you want to run the project on your own PC without cloud hosting:

**Windows:** Double-click `start.bat`

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

Then open `index.html` in your browser. Change the API URL in `script.js` to `http://localhost:5000` for local use.

---

## Dependencies

| Package | Purpose |
|---|---|
| Flask | Web server and API |
| flask-cors | Cross-origin requests |
| rasterio | Raster file reading and writing |
| NumPy | Band normalization |
| Pillow | Image format support |
| gunicorn | Production WSGI server for Render |

---

## Notes

- Uploaded files are deleted from the server immediately after processing.
- Render free tier services sleep after 15 minutes of inactivity. The first request after sleep may take 30-60 seconds. This is normal.
- Do not upload files with sensitive or confidential data to the hosted version.

---

## License

MIT License. See `LICENSE` for details.
