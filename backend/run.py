import os
import sys
import subprocess

if __name__ == "__main__":
    # Get backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Set PYTHONPATH
    env = os.environ.copy()
    if "PYTHONPATH" in env:
        env["PYTHONPATH"] = backend_dir + os.pathsep + env["PYTHONPATH"]
    else:
        env["PYTHONPATH"] = backend_dir

    print(f"Starting server from {backend_dir}...")
    
    # Run uvicorn as a subprocess (reload disabled for stability)
    try:
        subprocess.run(
            [
                sys.executable, "-m", "uvicorn", "app.main:app", 
                "--host", "127.0.0.1", 
                "--port", "8000",
                "--app-dir", backend_dir  # Explicitly set app dir
            ],
            cwd=backend_dir,
            env=env,
            check=True
        )
    except KeyboardInterrupt:
        print("\nServer stopped.")

