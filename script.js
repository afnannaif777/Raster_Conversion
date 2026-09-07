/* =============================================
   RasterNorm — Main Script
   ============================================= */

// Replace this URL with your Render backend URL after deploying.
// Example: "https://rasternorm.onrender.com"
const API = "https://YOUR-APP-NAME.onrender.com";

// ── DOM refs ───────────────────────────────────
const dropzone      = document.getElementById("dropzone");
const fileInput     = document.getElementById("fileInput");
const serverDot     = document.getElementById("serverDot");
const serverLabel   = document.getElementById("serverLabel");

const stageUpload   = document.getElementById("stageUpload");
const stageProcess  = document.getElementById("stageProcess");
const stageResult   = document.getElementById("stageResult");
const stageError    = document.getElementById("stageError");

const fileName      = document.getElementById("fileName");
const fileSize      = document.getElementById("fileSize");
const uploadStatus  = document.getElementById("uploadStatus");
const uploadBar     = document.getElementById("uploadBar");
const uploadPct     = document.getElementById("uploadPct");

const processFileName = document.getElementById("processFileName");

const resultMeta    = document.getElementById("resultMeta");
const downloadBtn   = document.getElementById("downloadBtn");
const resetBtn      = document.getElementById("resetBtn");

const errorMsg      = document.getElementById("errorMsg");
const errorResetBtn = document.getElementById("errorResetBtn");

// ── State ──────────────────────────────────────
let currentOutputFile = null;
let currentOriginalName = null;

// ── Server health check ────────────────────────
async function checkServer() {
  try {
    const res = await fetch(`${API}/health`, { method: "GET" });
    if (res.ok) {
      serverDot.className = "badge-dot online";
      serverLabel.textContent = "Server online";
    } else {
      throw new Error("Bad response");
    }
  } catch {
    serverDot.className = "badge-dot offline";
    serverLabel.textContent = "Backend offline — check Render deployment";
  }
}

checkServer();
setInterval(checkServer, 8000);

// ── Raster preview (decorative hero grid) ──────
function buildRasterGrid() {
  const rawGrid  = document.querySelector(".rp-grid.raw");
  const normGrid = document.querySelector(".rp-grid.norm");
  if (!rawGrid || !normGrid) return;

  // Simple procedural landscape-ish pattern
  const rawValues = [
    12,8,15,22,18,9,5,11,
    20,35,48,62,55,42,30,18,
    45,70,95,120,110,85,60,38,
    80,115,148,180,170,140,105,72,
    90,130,160,200,190,155,118,85,
    70,105,135,165,150,120,92,65,
    40,68,90,115,105,82,60,42,
    18,30,48,65,58,45,32,20
  ];
  const max = Math.max(...rawValues);
  const min = Math.min(...rawValues);

  rawValues.forEach(v => {
    const cell = document.createElement("div");
    cell.className = "cell";
    const t = (v - min) / (max - min);
    const c = Math.round(20 + t * 60);
    cell.style.background = `rgb(${c},${Math.round(c*0.9)},${Math.round(c*1.1)})`;
    rawGrid.appendChild(cell);
  });

  rawValues.forEach(v => {
    const cell = document.createElement("div");
    cell.className = "cell";
    const t = (v - min) / (max - min);
    const c = Math.round(t * 255);
    // teal-ish normalized
    const r = Math.round(0   + t * 50);
    const g = Math.round(100 + t * 155);
    const b = Math.round(120 + t * 80);
    cell.style.background = `rgb(${r},${g},${b})`;
    normGrid.appendChild(cell);
  });
}

buildRasterGrid();

// ── Format file size ───────────────────────────
function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Show / hide stages ─────────────────────────
function hideAll() {
  [stageUpload, stageProcess, stageResult, stageError].forEach(s => s.hidden = true);
  dropzone.hidden = false;
}

function showStage(el) {
  [stageUpload, stageProcess, stageResult, stageError].forEach(s => s.hidden = true);
  dropzone.hidden = true;
  el.hidden = false;
}

// ── Drag & Drop ────────────────────────────────
dropzone.addEventListener("dragover", e => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", e => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

dropzone.addEventListener("click", e => {
  if (e.target.tagName === "LABEL") return;
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
  fileInput.value = "";
});

// ── Main handler ───────────────────────────────
async function handleFile(file) {
  // Show upload stage
  fileName.textContent    = file.name;
  fileSize.textContent    = formatSize(file.size);
  processFileName.textContent = file.name;
  uploadBar.style.width   = "0%";
  uploadPct.textContent   = "0%";
  uploadStatus.textContent = "Uploading…";
  showStage(stageUpload);

  const formData = new FormData();
  formData.append("file", file);

  try {
    // XHR for upload progress
    const response = await uploadWithProgress(formData);
    const data = JSON.parse(response);

    if (data.error) throw new Error(data.error);

    // Switch to processing stage
    showStage(stageProcess);

    // Small delay so the user sees the processing bar
    await delay(900);

    // Store result info
    currentOutputFile  = data.output_file;
    currentOriginalName = data.original_name;

    // Build result metadata
    resultMeta.innerHTML = `
      <span>File: <b>${data.original_name}</b></span>
      <span>Bands: ${data.bands} &nbsp;·&nbsp; ${data.cols} × ${data.rows} px</span>
      <span>Output: ${data.original_name}_normalized.tif</span>
    `;

    showStage(stageResult);

  } catch (err) {
    console.error(err);
    errorMsg.textContent = err.message || "Upload or processing failed.";
    showStage(stageError);
  }
}

// ── XHR upload with progress ───────────────────
function uploadWithProgress(formData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        uploadBar.style.width = pct + "%";
        uploadPct.textContent  = pct + "%";
        if (pct === 100) {
          uploadStatus.textContent = "Upload complete ✓";
        }
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        try {
          const d = JSON.parse(xhr.responseText);
          reject(new Error(d.error || `Server error ${xhr.status}`));
        } catch {
          reject(new Error(`Server error ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Cannot reach the backend. Check that your Render service is running."));
    });

    xhr.open("POST", `${API}/upload`);
    xhr.send(formData);
  });
}

// ── Download ───────────────────────────────────
downloadBtn.addEventListener("click", () => {
  if (!currentOutputFile) return;
  const url = `${API}/download/${currentOutputFile}?name=${encodeURIComponent(currentOriginalName)}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentOriginalName}_normalized.tif`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// ── Reset buttons ──────────────────────────────
resetBtn.addEventListener("click", reset);
errorResetBtn.addEventListener("click", reset);

function reset() {
  currentOutputFile  = null;
  currentOriginalName = null;
  hideAll();
}

// ── Util ───────────────────────────────────────
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
