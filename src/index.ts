import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Database from "better-sqlite3";

/* -------------------------------------------------------------------------- */
/*  DATABASE SETUP                                                            */
/* -------------------------------------------------------------------------- */
const DB_PATH = "/Users/satyabharadwaj/Documents/latitude_health/ncd_lookup.db";
let db: Database.Database;

try {
  db = new Database(DB_PATH, { readonly: true });
  console.error(`✅ Connected to SQLite database at ${DB_PATH}`);
} catch (err) {
  console.error(`❌ Failed to open database: ${(err as Error).message}`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/*  TYPES                                                                     */
/* -------------------------------------------------------------------------- */
interface NCDItem {
  document_id: string;
  document_version: number;
  title?: string;
  benefit_category?: string;
  indications_limitations?: string;
  transmittal_number?: string;
  transmittal_url?: string;
}

interface NCDResponse {
  data?: NCDItem[];
  error?: string;
}

interface NCDLookupRow {
  NCD_mnl_sect_title: string;
  NCD_id: string;
  NCD_vrsn_num: string;
}

/* -------------------------------------------------------------------------- */
/*  MCP SERVER SETUP                                                          */
/* -------------------------------------------------------------------------- */
const server = new McpServer({
  name: "priorauth-checker",
  version: "2.3.0",
  capabilities: { resources: {}, tools: {} },
});

/* -------------------------------------------------------------------------- */
/*  UTILS                                                                     */
/* -------------------------------------------------------------------------- */
function stripHtml(html: string = ""): string {
  return html.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, " ").trim();
}

function lookupNCDFromDB(title: string): NCDLookupRow | undefined {
  const stmt = db.prepare(`
    SELECT NCD_mnl_sect_title, NCD_id, NCD_vrsn_num
    FROM ncd_lookup
    WHERE LOWER(NCD_mnl_sect_title) LIKE LOWER(?)
    LIMIT 1
  `);
  const result = stmt.get(`%${title}%`) as NCDLookupRow | undefined;
  return result;
}

/* -------------------------------------------------------------------------- */
/*  HELPER — Fetch CMS Coverage Data                                          */
/* -------------------------------------------------------------------------- */
async function fetchNCDData(ncdid: string, ncdver: string): Promise<NCDResponse> {
  const url = `https://api.coverage.cms.gov/v1/data/ncd/?ncdid=${ncdid}&ncdver=${ncdver}`;
  console.error(`Fetching CMS NCD data from ${url}`);

  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/* -------------------------------------------------------------------------- */
/*  TOOL — fetch_ncd_policy                                                   */
/* -------------------------------------------------------------------------- */
server.tool(
  "fetch_ncd_policy",
  "Fetch CMS NCD policy using either title or direct ID/version (database lookup).",
  {
    ncd_id: z.string().optional(),
    ncd_ver: z.string().optional(),
    title: z.string().optional(),
  },
  async ({ ncd_id, ncd_ver, title }) => {
    let resolvedId = ncd_id;
    let resolvedVer = ncd_ver;

    // 🔍 Step 1: Lookup in SQLite DB if title provided
    if (!resolvedId && title) {
      const row = lookupNCDFromDB(title);
      if (row) {
        resolvedId = row.NCD_id;
        resolvedVer = row.NCD_vrsn_num;
        console.error(`✅ Matched title "${title}" → NCD ${resolvedId} v${resolvedVer}`);
      } else {
        return { content: [{ type: "text", text: `⚠️ No database match found for "${title}"` }] };
      }
    }

    // 🧩 Step 2: Ensure we have ID and version
    if (!resolvedId || !resolvedVer) {
      return { content: [{ type: "text", text: "Missing NCD ID or version." }] };
    }

    // 📄 Step 3: Fetch from CMS API
    console.error(`⚙️ Retrieving NCD ${resolvedId} v${resolvedVer}`);
    const ncdData = await fetchNCDData(resolvedId, resolvedVer);
    if (ncdData.error) {
      return { content: [{ type: "text", text: `CMS API error: ${ncdData.error}` }] };
    }

    const item = ncdData?.data?.[0];
    if (!item) {
      return {
        content: [{ type: "text", text: `⚠️ No NCD record found for id=${resolvedId} version=${resolvedVer}` }],
      };
    }

    const cleanPolicy = {
      document_id: item.document_id,
      document_version: item.document_version,
      title: stripHtml(item.title || ""),
      benefit_category: stripHtml(item.benefit_category || ""),
      indications_limitations: stripHtml(item.indications_limitations || ""),
      transmittal_number: stripHtml(item.transmittal_number || ""),
      transmittal_url: item.transmittal_url || "",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(cleanPolicy, null, 2) }],
    };
  }
);

/* -------------------------------------------------------------------------- */
/*  START SERVER                                                              */
/* -------------------------------------------------------------------------- */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🚀 MCP server 'priorauth-checker' running — database lookup active");