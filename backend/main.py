import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import analysis

app = FastAPI(title="Urban Compass AI Analysis Engine", version="1.0.0")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(analysis.router, prefix="/api/v1", tags=["Analysis"])

@app.get("/health")
async def health_check():
    import datetime
    return {
        "status": "healthy",
        "service": "Urban Compass AI Engine",
        "environment": "development",
        "timestamp": datetime.datetime.now().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
