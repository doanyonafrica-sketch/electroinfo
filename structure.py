import os, sys
from datetime import datetime

sys.stdout = open("output.txt", "w", encoding="utf-8")

IGNORE_DIRS = {"node_modules", ".git", "__pycache__", ".next", "dist", "build", ".venv", "venv", "dataconnect-generated"}
IGNORE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".zip", ".lock", ".lnk", ".pdf"}

# Limite taille fichier pour éviter les gros fichiers CSS/JS minifiés
MAX_FILE_SIZE_KB = 100

def show_structure(path=".", indent=0):
    items = sorted(os.listdir(path))
    dirs = [i for i in items if os.path.isdir(os.path.join(path, i))]
    files = [i for i in items if not os.path.isdir(os.path.join(path, i))]

    for item in dirs + files:
        if item in IGNORE_DIRS or item.startswith("."):
            continue

        full_path = os.path.join(path, item)
        prefix = "  " * indent

        if os.path.isdir(full_path):
            print(f"\n{prefix}[DIR] {item}/")
            show_structure(full_path, indent + 1)
        else:
            ext = os.path.splitext(item)[1].lower()
            size = os.path.getsize(full_path)
            size_kb = size // 1024
            size_str = f"{size}B" if size < 1024 else f"{size_kb}KB"
            print(f"\n{prefix}[FILE] {item}  ({size_str})")

            if ext not in IGNORE_EXTENSIONS:
                # Skip les fichiers trop gros (CSS/JS minifiés)
                if size_kb > MAX_FILE_SIZE_KB:
                    print(f"{prefix}  ⚠️ Fichier trop grand ({size_kb}KB) — contenu ignoré")
                    continue
                try:
                    with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read()
                    print(f"{prefix}{'─'*40}")
                    for line in content.splitlines():
                        print(f"{prefix}  {line}")
                    print(f"{prefix}{'─'*40}")
                except Exception as e:
                    print(f"{prefix}  Impossible de lire: {e}")

# Header avec date
print(f"=== SCAN DU PROJET ===")
print(f"Date : {datetime.now().strftime('%Y-%m-%d %H:%M')}")
print(f"Dossier : {os.path.abspath('.')}")
print(f"{'='*40}\n")

show_structure()
print("\nTermine ! Fichier output.txt cree.")
sys.stdout.close()
