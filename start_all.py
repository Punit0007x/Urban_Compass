import subprocess
import sys
import time
import os
import signal

def run_app():
    print("\n" + "="*50)
    print("🚀 URBAN COMPASS: ALL-IN-ONE STARTER")
    print("="*50 + "\n")
    
    # 1. Start Backend
    print("📡 [1/2] Starting Backend (FastAPI) on http://localhost:8000...")
    backend_dir = os.path.join(os.getcwd(), "backend")
    
    # Ensure dependencies are installed for backend
    # subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], cwd=backend_dir)
    
    backend_process = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=backend_dir
    )
    
    # 2. Wait a moment for backend to initialize
    time.sleep(2)
    
    # 3. Start Frontend
    print("💻 [2/2] Starting Frontend (Vite) on http://localhost:8080...")
    
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.getcwd()
    )
    
    print("\n" + "-"*50)
    print("✅ SERVICES ARE RUNNING")
    print("Press Ctrl+C to stop both services.")
    print("-"*50 + "\n")

    def signal_handler(sig, frame):
        print("\n🛑 Stopping Urban Compass...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✅ Shutdown complete. Goodbye!")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    # Monitor processes and stream output
    try:
        while True:
            # Check if processes are still running
            if backend_process.poll() is not None:
                print("❌ Backend process stopped.")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend process stopped.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    run_app()
