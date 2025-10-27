import sqlite3

DB_PATH = "/Users/satyabharadwaj/Documents/latitude_health/ncd_lookup.db"

def lookup_ncd(title: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT NCD_mnl_sect_title, NCD_id, NCD_vrsn_num
        FROM ncd_lookup
        WHERE LOWER(NCD_mnl_sect_title) LIKE LOWER(?)
        LIMIT 5
    """, (f"%{title}%",))
    results = cur.fetchall()
    conn.close()

    if not results:
        print("❌ No match found.")
    else:
        print(f"🔍 Found {len(results)} match(es):")
        for r in results:
            print(f"• {r[0]} — ID: {r[1]}, Version: {r[2]}")

# Example usage
if __name__ == "__main__":
    lookup_ncd("Hyperbaric Oxygen Therapy")