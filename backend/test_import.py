import sys
import os

# Add current directory to path
cwd = os.getcwd()
sys.path.append(cwd)

print(f"CWD: {cwd}")
print(f"Path: {sys.path}")

try:
    import app
    print("Success: import app")
    print(f"App file: {app.__file__}")
except ImportError as e:
    print(f"Failed: import app ({e})")

try:
    from app.core import config
    print("Success: from app.core import config")
except ImportError as e:
    print(f"Failed: from app.core import config ({e})")
except Exception as e:
    print(f"Error during import: {e}")
