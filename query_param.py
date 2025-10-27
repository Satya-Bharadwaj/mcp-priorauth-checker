import sqlite3
import csv

csv_path = "/Users/satyabharadwaj/Documents/latitude_health/query_param_lookup.csv"
db_path = "/Users/satyabharadwaj/Documents/latitude_health/ncd_lookup.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS ncd_lookup (
    NCD_mnl_sect_title TEXT,
    NCD_id TEXT,
    NCD_vrsn_num TEXT
)
""")

with open(csv_path, "r", newline="", encoding="utf-8-sig") as csvfile:
    reader = csv.DictReader(csvfile, delimiter=",")
    rows = [(row["NCD_mnl_sect_title"], row["NCD_id"], row["NCD_vrsn_num"]) for row in reader]

cur.executemany("INSERT INTO ncd_lookup VALUES (?, ?, ?)", rows)
conn.commit()
conn.close()

print(f"✅ Imported {len(rows)} rows into {db_path}")