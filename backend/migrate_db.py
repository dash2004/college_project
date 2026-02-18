"""Quick DB migration: add phone_number to students table."""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "sql_app.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Add phone_number to students
c.execute("PRAGMA table_info(students)")
cols = [col[1] for col in c.fetchall()]
print(f"students columns: {cols}")

if "phone_number" not in cols:
    c.execute("ALTER TABLE students ADD COLUMN phone_number TEXT")
    print("-> Added phone_number column to students")
else:
    print("-> phone_number already exists")

conn.commit()
conn.close()
print("Migration complete!")
