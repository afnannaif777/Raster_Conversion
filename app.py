from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import numpy as np
import os
import uuid
import traceback
from pathlib import Path

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".tif", ".tiff", ".img", ".png", ".jpg", ".jpeg", ".bmp"}

def allowed_file(filename):
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

def normalize_raster(input_path, output_path):
    """
    Normalize raster image bands to 0-255 using min-max normalization.
    Handles multi-band rasters. Outputs a GeoTIFF.
    """
    import rasterio
    from rasterio.transform import from_bounds

    with rasterio.open(input_path) as src:
        meta = src.meta.copy()
        data = src.read()  # shape: (bands, rows, cols)
        nodata = src.nodata

    normalized = np.zeros_like(data, dtype=np.uint8)

    for i in range(data.shape[0]):
        band = data[i].astype(np.float64)

        if nodata is not None:
            mask = band == nodata
        else:
            mask = np.zeros_like(band, dtype=bool)

        valid = band[~mask]
        if valid.size == 0:
            normalized[i] = 0
            continue

        band_min = valid.min()
        band_max = valid.max()

        if band_max == band_min:
            norm = np.zeros_like(band, dtype=np.float64)
        else:
            norm = (band - band_min) / (band_max - band_min) * 255.0

        norm[mask] = 0
        normalized[i] = np.clip(norm, 0, 255).astype(np.uint8)

    meta.update({
        "dtype": "uint8",
        "nodata": None,
        "count": data.shape[0],
    })

    with rasterio.open(output_path, "w", **meta) as dst:
        dst.write(normalized)

    return data.shape[0], data.shape[1], data.shape[2]


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    original_name = Path(file.filename).stem
    suffix = Path(file.filename).suffix.lower()

    if not allowed_file(file.filename):
        return jsonify({"error": f"Unsupported file type: {suffix}"}), 400

    unique_id = str(uuid.uuid4())[:8]
    input_filename = f"{unique_id}_input{suffix}"
    output_filename = f"{unique_id}_normalized.tif"

    input_path = os.path.join(UPLOAD_FOLDER, input_filename)
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    file.save(input_path)

    try:
        bands, rows, cols = normalize_raster(input_path, output_path)
        return jsonify({
            "success": True,
            "output_file": output_filename,
            "original_name": original_name,
            "bands": bands,
            "rows": rows,
            "cols": cols
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route("/download/<filename>", methods=["GET"])
def download_file(filename):
    output_path = os.path.join(OUTPUT_FOLDER, filename)
    if not os.path.exists(output_path):
        return jsonify({"error": "File not found"}), 404

    original_name = request.args.get("name", "normalized")
    download_name = f"{original_name}_normalized.tif"

    return send_file(
        output_path,
        as_attachment=True,
        download_name=download_name,
        mimetype="image/tiff"
    )


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    print(f"\n  Raster Normalizer — Server Running on port {port}\n")
    app.run(debug=debug, host="0.0.0.0", port=port)
