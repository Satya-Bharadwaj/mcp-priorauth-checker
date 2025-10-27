# 🏥 MCP Tool: priorauth-checker

### Overview
`priorauth-checker` is a **Model Context Protocol (MCP)** server implemented in **TypeScript**.  
It retrieves **CMS National Coverage Determination (NCD)** policy data for prior authorization and coverage eligibility workflows.  
The tool uses a **local SQLite database** for fast lookup and the **CMS Coverage API** for live retrieval of policy details.

This project is part of a healthcare automation workflow:  
→ *Structured clinical note (via raw2structured)* → **priorauth-checker** → *CMS coverage validation + reasoning*

---

## 🧩 Key Features

- 🔍 **SQLite-backed lookup** of NCD policies using local database (`ncd_lookup.db`)  
- 🔗 **CMS Coverage API integration** for real-time policy retrieval  
- 🧠 **Automatic title → ID/version resolution** using SQL `LIKE` queries  
- 🧹 **HTML cleaning** for model-friendly output  
- ⚙️ **MCP-compliant server** using `@modelcontextprotocol/sdk` and `zod`  
- 🪶 Lightweight and deterministic for LLM pipelines  

---

## 🏗️ Architecture

| Layer | Description |
|-------|--------------|
| **MCP Server** | Uses `McpServer` to define the `fetch_ncd_policy` tool |
| **SQLite Database** | Local `ncd_lookup.db` stores NCD title → ID/version mapping |
| **Fetcher** | Retrieves live CMS data from `https://api.coverage.cms.gov/v1/data/ncd/` |
| **Cleaner** | Removes HTML and extra whitespace for consistent text |
| **Transport Layer** | Uses `StdioServerTransport` for MCP I/O |

---

## ⚙️ Setup & Installation

```bash
# Clone repository
git clone https://github.com/Satya-Bharadwaj/mcp-priorauth-checker.git
cd mcp-priorauth-checker

# Install dependencies
npm install

# Build project
npm run build
```

Ensure the SQLite database path is valid in your system:  
`/Users/<username>/Documents/latitude_health/ncd_lookup.db`

---

## 🚀 Running the MCP Server

```bash
npm start
```
or manually:
```bash
node build/index.js
```

**Expected Console Output:**
```
✅ Connected to SQLite database at /Users/<username>/Documents/latitude_health/ncd_lookup.db
🚀 MCP server 'priorauth-checker' running — database lookup active
```

---

## 🧩 Exposed MCP Tool

### Tool Name: `fetch_ncd_policy`

**Description:**  
Fetches CMS NCD policy data using either a **title-based** database lookup or direct **ID/version** query.

| Parameter | Type | Required | Description |
|------------|------|-----------|--------------|
| `ncd_id` | string | Optional | NCD numeric identifier (e.g., `"240"`) |
| `ncd_ver` | string | Optional | Version number (e.g., `"1"`) |
| `title` | string | Optional | Policy title for SQLite lookup |

---

## 🧠 Example Usage

### 1️⃣ Query by Title

**Input:**
```json
{
  "title": "Electrical Nerve Stimulators"
}
```

**Console Log:**
```
✅ Matched title "Electrical Nerve Stimulators" → NCD 240 v1
⚙️ Retrieving NCD 240 v1
```

**Response:**
```json
{
  "document_id": "240",
  "document_version": 1,
  "title": "Electrical Nerve Stimulators",
  "benefit_category": "Durable Medical Equipment",
  "indications_limitations": "Covered for chronic pain unresponsive to conservative therapy...",
  "transmittal_number": "R240NCD",
  "transmittal_url": "https://www.cms.gov/medicare-coverage-database/view/ncd.aspx?ncdid=240"
}
```

---

### 2️⃣ Query by ID and Version

**Input:**
```json
{
  "ncd_id": "313",
  "ncd_ver": "2"
}
```

**Console Log:**
```
⚙️ Retrieving NCD 313 v2
```

**Response:**
```json
{
  "document_id": "313",
  "document_version": 2,
  "title": "Lumbar Artificial Disc Replacement",
  "benefit_category": "Surgery",
  "indications_limitations": "Non-covered for patients over 60 years of age...",
  "transmittal_number": "R313NCD",
  "transmittal_url": "https://www.cms.gov/medicare-coverage-database/view/ncd.aspx?ncdid=313"
}
```

---

## 🧠 How It Works

1. **SQLite Title Lookup**  
   Searches for NCD ID/version in local DB:
   ```sql
   SELECT NCD_mnl_sect_title, NCD_id, NCD_vrsn_num
   FROM ncd_lookup
   WHERE LOWER(NCD_mnl_sect_title) LIKE LOWER('%<title>%')
   LIMIT 1;
   ```

2. **CMS Fetch**  
   Retrieves policy data from CMS Coverage API:
   ```bash
   https://api.coverage.cms.gov/v1/data/ncd/?ncdid=<id>&ncdver=<version>
   ```

3. **HTML Cleaning**  
   Uses regex to remove tags and compress whitespace.

4. **JSON Output**  
   Returns structured policy object with cleaned text.

---

## 📁 File Structure

```
mcp-priorauth-checker/
├── src/
│   └── index.ts                # Main MCP server
├── ncd_lookup.db               # SQLite database for title → ID mapping
├── package.json
├── package-lock.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## 🧩 Dependencies

- **Node.js** ≥ 20  
- **better-sqlite3** — for local DB lookups  
- **@modelcontextprotocol/sdk** — MCP runtime  
- **zod** — schema validation  
- **TypeScript** — build/runtime safety  

---

## 🔗 Related Repositories
- [mcp-raw2structured](https://github.com/Satya-Bharadwaj/mcp-raw2structured)
