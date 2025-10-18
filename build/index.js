import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
/* -------------------------------------------------------------------------- */
/*  BUILT-IN LOOKUP TABLE                                                     */
/* -------------------------------------------------------------------------- */
const lookupTable = [
    { NCD_mnl_sect_title: "Lumbar Artificial Disc Replacement", NCD_id: "313", NCD_vrsn_num: "2" },
    { NCD_mnl_sect_title: "Electrical Nerve Stimulators", NCD_id: "240", NCD_vrsn_num: "1" },
];
console.error(`✅ Loaded ${lookupTable.length} built-in NCD entries`);
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
function stripHtml(html = "") {
    return html.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, " ").trim();
}
/* -------------------------------------------------------------------------- */
/*  HELPER — Fetch CMS Coverage Data                                          */
/* -------------------------------------------------------------------------- */
async function fetchNCDData(ncdid, ncdver) {
    const url = `https://api.coverage.cms.gov/v1/data/ncd/?ncdid=${ncdid}&ncdver=${ncdver}`;
    console.error(`Fetching CMS NCD data from ${url}`);
    try {
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: message };
    }
}
/* -------------------------------------------------------------------------- */
/*  TOOL — fetch_ncd_policy                                                   */
/* -------------------------------------------------------------------------- */
server.tool("fetch_ncd_policy", "Fetch CMS NCD policy using either title or direct ID/version (built-in lookup).", {
    ncd_id: z.string().optional(),
    ncd_ver: z.string().optional(),
    title: z.string().optional(),
}, async ({ ncd_id, ncd_ver, title }) => {
    let resolvedId = ncd_id;
    let resolvedVer = ncd_ver;
    // 🔍 Step 1: Lookup from built-in table if title is provided
    if (!resolvedId && title) {
        const normalizedTitle = title.trim().toLowerCase();
        const match = lookupTable.find(row => {
            const t = row.NCD_mnl_sect_title.toLowerCase();
            return t.includes(normalizedTitle) || normalizedTitle.includes(t);
        });
        if (match) {
            resolvedId = match.NCD_id;
            resolvedVer = match.NCD_vrsn_num;
            console.error(`✅ Matched title "${title}" → NCD ${resolvedId} v${resolvedVer}`);
        }
        else {
            return {
                content: [{ type: "text", text: `⚠️ No built-in match found for "${title}"` }],
            };
        }
    }
    // 🧩 Step 2: Ensure we have ID and version
    if (!resolvedId || !resolvedVer) {
        return { content: [{ type: "text", text: "Missing NCD ID or version." }] };
    }
    // 📄 Step 3: Fetch from CMS
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
});
/* -------------------------------------------------------------------------- */
/*  START SERVER                                                              */
/* -------------------------------------------------------------------------- */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🚀 MCP server 'priorauth-checker' running — built-in lookup active");
