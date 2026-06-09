// analyze-bol — Claude Sonnet 4.5 vision OCR for Bill of Lading (BOL) documents.
//
// Sibling of analyze-receipt (H-2A reimbursement OCR). Same provider/auth/CORS
// pattern; different schema — full BOL extraction including line items, piece
// counts, and weights for eBerry hauling trips.
//
// Auth: Requires Bearer JWT (or SUPABASE_SERVICE_ROLE_KEY).
// Secrets required: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://cyndyhernandez76-hub.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function corsHeaders(requestOrigin) {
  const origin = requestOrigin && ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(body, status, requestOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(requestOrigin) },
  });
}

const SYSTEM_PROMPT = `You are an OCR and extraction assistant for Bill of Lading (BOL) documents at eBerry Harvest, an agricultural hauling operation.

BOLs accompany loads of produce (pallets, flats, clamshells, cases) hauled by company trucks. They may be in English or Spanish, may be poor-quality phone photos, scanned PDFs, or printed pages. Extract everything you can; leave a field null if it is not present.

Return STRICT JSON only — no markdown, no commentary. Schema:

{
  "bol_number": string | null,
  "bill_to": {"name": string | null, "address": string | null, "phone": string | null},
  "shipper": {"name": string | null, "address": string | null, "city_state": string | null},
  "consignee": {"name": string | null, "address": string | null, "city_state": string | null},
  "carrier": {"name": string | null, "scac": string | null},
  "trailer_number": string | null,
  "seal_number": string | null,
  "pickup_date": "YYYY-MM-DD" | null,
  "delivery_date": "YYYY-MM-DD" | null,
  "commodity_summary": string | null,
  "line_items": [
    {
      "line_no": number,
      "description": string,
      "qty": number | null,
      "unit": string,
      "piece_count": number | null,
      "weight_lbs": number | null,
      "lot_number": string | null
    }
  ],
  "total_pieces": number | null,
  "total_weight_lbs": number | null,
  "freight_terms": "prepaid" | "collect" | "third_party" | null,
  "confidence": number,
  "raw_ocr_text": string
}

Extraction rules:
- line_items: one entry per distinct commodity/line. Number them sequentially in line_no starting at 1.
- unit: use the literal unit on the document when present (e.g. "pallets", "flats", "clamshells", "cases", "boxes"); otherwise best guess.
- piece_count: total individual pieces for the line if shown separately from qty; null otherwise.
- weight_lbs: per-line weight in pounds. Convert kg to lbs (1 kg = 2.20462 lbs) and note the conversion in raw_ocr_text if you do.
- total_pieces / total_weight_lbs: document totals if printed; otherwise sum the line items when reasonable, else null.
- freight_terms: normalize to one of prepaid | collect | third_party | null.
- raw_ocr_text: the full text you read off the document, lightly cleaned.
- confidence: 0..1 overall. If below 0.7, mention what was ambiguous in raw_ocr_text so a human can verify.

Return ONLY the JSON object.`;

async function callAnthropicVision(imageDataBase64, mimeType, anthropicKey) {
  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5";
  const url = "https://api.anthropic.com/v1/messages";
  const body = {
    model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: imageDataBase64 } },
          { type: "text", text: "Extract this Bill of Lading according to the schema. Return JSON only." },
        ],
      },
    ],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errBody}`);
  }

  const result = await resp.json();
  const textBlock = (result.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("Anthropic response missing text content");

  let raw = textBlock.text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/m, "").trim();
  }
  return { parsed: JSON.parse(raw), usage: result.usage, model };
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);

  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  if (!anthropicKey) {
    return jsonResponse({ ok: false, error: "Server configuration error: ANTHROPIC_API_KEY not set" }, 500, origin);
  }
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401, origin);
  }

  const token = authHeader.slice(7);
  const isServiceRole = token === serviceRoleKey;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!isServiceRole) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      // PWA uses the anon key directly (PIN-based driver auth, no Supabase user
      // session), so accept anon-key callers like the fuel-receipt function does.
      if (token !== anonKey) return jsonResponse({ ok: false, error: "Unauthorized" }, 401, origin);
    }
  }

  let body;
  try { body = await req.json(); } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, origin);
  }

  const storage_path = body.storage_path;
  const bol_doc_id = body.bol_doc_id;
  const bucket = body.bucket || "bol-documents";

  if (!storage_path || typeof storage_path !== "string") {
    return jsonResponse({ ok: false, error: "storage_path is required" }, 400, origin);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: fileBlob, error: downloadError } = await serviceClient.storage
    .from(bucket).download(storage_path);
  if (downloadError) {
    return jsonResponse({ ok: false, error: "Could not download BOL: " + downloadError.message }, 500, origin);
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let mimeType = fileBlob.type || "";
  if (!mimeType || mimeType === "application/octet-stream") {
    const lower = storage_path.toLowerCase();
    if (lower.endsWith(".pdf")) mimeType = "application/pdf";
    else if (lower.endsWith(".png")) mimeType = "image/png";
    else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (lower.endsWith(".webp")) mimeType = "image/webp";
    else if (lower.endsWith(".gif")) mimeType = "image/gif";
    else mimeType = "image/jpeg";
  }

  const supported = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
  if (!supported.includes(mimeType)) {
    return jsonResponse({ ok: false, error: `Unsupported file type ${mimeType}` }, 400, origin);
  }

  const maxBytes = mimeType === "application/pdf" ? 32 * 1024 * 1024 : 5 * 1024 * 1024;
  if (bytes.length > maxBytes) {
    return jsonResponse({
      ok: false,
      error: `File too large (${(bytes.length / 1024 / 1024).toFixed(1)}MB). Limit ${maxBytes / 1024 / 1024}MB.`,
    }, 413, origin);
  }

  const base64 = bytesToBase64(bytes);

  let analysis, usage, model;
  try {
    const result = await callAnthropicVision(base64, mimeType, anthropicKey);
    analysis = result.parsed;
    usage = result.usage;
    model = result.model;
  } catch (err) {
    console.error("Anthropic vision call failed:", err);
    return jsonResponse({ ok: false, error: "OCR failed: " + (err.message || String(err)) }, 502, origin);
  }

  // Optionally persist OCR back to an existing fleet.bol_document row.
  if (bol_doc_id && typeof bol_doc_id === "string") {
    const conf = typeof analysis.confidence === "number" ? analysis.confidence : null;
    const { error: updateError } = await serviceClient
      .schema("fleet").from("bol_document")
      .update({
        ocr_json: analysis,
        ocr_status: "parsed",
        ocr_confidence: conf,
        bol_number: analysis.bol_number ?? null,
        bill_to_name: analysis.bill_to?.name ?? null,
        shipper_name: analysis.shipper?.name ?? null,
        consignee_name: analysis.consignee?.name ?? null,
        carrier_name: analysis.carrier?.name ?? null,
        pickup_date: analysis.pickup_date ?? null,
        delivery_date: analysis.delivery_date ?? null,
        commodity_summary: analysis.commodity_summary ?? null,
        total_pieces: analysis.total_pieces ?? null,
        total_weight_lbs: analysis.total_weight_lbs ?? null,
        freight_terms: analysis.freight_terms ?? null,
      })
      .eq("bol_doc_id", bol_doc_id);
    if (updateError) {
      console.warn("Failed to persist OCR to bol_document:", updateError.message);
    }
  }

  return jsonResponse({
    ok: true,
    analysis,
    usage,
    model,
    storage_path,
    mime_type: mimeType,
    bytes: bytes.length,
  }, 200, origin);
});
