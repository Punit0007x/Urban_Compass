# Urban Compass AI Analysis Backend

This is the Python-based AI engine for Urban Compass, providing geospatial analysis, land suitability scoring, and wasteland detection.

## Prerequisites
- Python 3.10+
- virtualenv

## Setup & Run

1. **Create and Activate Virtual Environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Server:**
   ```bash
   python main.py
   ```
   The server will start at `http://localhost:8000`.

## API Endpoints

- `GET /health`: System health check
- `POST /api/v1/analyze-area`: Geometric profiling (Area, Centroid, BBox)
- `POST /api/v1/analyze-slope`: Terrain and elevation statistics
- `POST /api/v1/analyze-vegetation`: Multi-spectral analysis (NDVI/NDWI)
- `POST /api/v1/analyze-road-connectivity`: Infrastructure/Road audit
- `POST /api/v1/analyze-suitability`: Multi-Criteria Decision Analysis (MCDA)
- `POST /api/v1/detect-wasteland`: Smart discovery based on thresholds
