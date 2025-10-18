# 🏥 MCP Tool: priorauth-checker

### Overview
`priorauth-checker` is a **TypeScript-based Model Context Protocol (MCP)** server that retrieves **CMS National Coverage Determination (NCD)** policy data for prior authorization and coverage eligibility workflows.  
It fetches official Medicare policy metadata by **NCD ID**, **version**, or **title**, using either a **built-in lookup table** or the **CMS Coverage API** for live policy retrieval.

This tool forms the **second stage** of the Latitude Health pipeline:  
→ *Structured clinical note (via raw2structured)* → **priorauth-checker** → *CMS coverage validation + reasoning*

---

## 🧩 Features

- 🔗 **Live CMS Coverage API integration** for NCD data retrieval  
- 🧠 **Built-in lookup table** for offline or fallback matching (e.g., Lumbar Disc Replacement, Electrical Nerve Stimulators)  
- ⚙️ **Single MCP tool** `fetch_ncd_policy` supporting both title-based and ID-based lookups  
- 🧩 **HTML cleaning and normalization** for model-friendly output  
- 🧰 **MCP-compliant server** built with `@modelcontextprotocol/sdk` and `zod`  
- 🪶 Lightweight and deterministic — ideal for embedding in LLM pipelines

---

## 🏗️ Architecture

| Layer | Description |
|-------|--------------|
| **MCP Server** | Implements the `fetch_ncd_policy` tool using the MCP standard |
| **Lookup Table** | Hardcoded reference table for quick NCD ID/version resolution |
| **CMS Fetcher** | Retrieves live NCD data from `https://api.coverage.cms.gov/v1/data/ncd/` |
| **Cleaner Utility** | Strips HTML and normalizes whitespace for clean text output |
| **Transport Layer** | Uses `StdioServerTransport` for MCP-based communication |

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

---

## 🚀 Running the MCP Server

```bash
npm start
```
or manually:

```bash
node build/index.js
```

Expected console output:
```
✅ Loaded 2 built-in NCD entries
🚀 MCP server 'priorauth-checker' running — built-in lookup active
```

---

## 🧩 Exposed MCP Tool

| Tool Name | Description |
|------------|--------------|
| `fetch_ncd_policy` | Fetches a CMS NCD policy using either title or direct ID/version parameters. |

### **Parameters**
| Parameter | Type | Required | Description |
|------------|------|-----------|--------------|
| `ncd_id` | string | Optional | NCD numeric identifier (e.g., `"360"`) |
| `ncd_ver` | string | Optional | Version number (e.g., `"2"`) |
| `title` | string | Optional | Policy title (used for lookup fallback) |

---

## 🧠 Example Usage

### **1️⃣ Query by Title**
```json
{
  "title": "Electrical Nerve Stimulators"
}
```

**Response**
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

### **2️⃣ Query by ID and Version**
```json
{
  "ncd_id": "313",
  "ncd_ver": "2"
}
```

**Response**
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

## 🧠 Design Rationale

- **Transparency:** Returns normalized JSON with clean text and traceable sources  
- **Reliability:** Uses deterministic lookups and clear API fallbacks  
- **Modularity:** Functions independently or as a downstream MCP service  
- **Interoperability:** Aligns with CMS Coverage API and MCP protocol conventions  
- **Auditability:** Logs all lookups and fetch requests to `stderr` for traceability  

---

## 📁 File Structure

```
mcp-priorauth-checker/
├── build/
│   └── index.js                  # Compiled JavaScript MCP server
├── src/
│   └── index.ts                  # TypeScript MCP implementation
├── node_modules/
├── package.json
├── package-lock.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## 🔗 Related Repository
- [mcp-raw2structured](https://github.com/Satya-Bharadwaj/mcp-raw2structured)
