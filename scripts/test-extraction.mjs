/**
 * Standalone extraction test — no imports from the project.
 * Fetches the real Mutbex product page and runs it through the same extraction
 * logic as sourceValidation.ts + specLookup.ts (functions inlined here so no
 * path-alias or module issues). Edit the TARGET_URL to test other pages.
 *
 * Run: node scripts/test-extraction.mjs
 */

const TARGET_URL =
  process.env.TARGET_URL ||
  "https://www.mutbex.com/dito-sama-trs-vegetable-dicing-machine-single-speed-500-kg-hourly-capacity-220-240v1n-340-440v3n"
const MODEL_HINT = process.env.MODEL_HINT || "TRS"

// ─── Helpers inlined from sourceValidation.ts ─────────────────────────────

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&times;/g, "×")
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].replace(/\s+/g, " ").trim()
  }
  return ""
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function labelPattern(label) {
  return label.trim().split(/\s+/).map(escapeRegExp).join("\\s+")
}

function compactNumber(value) {
  const parsed = Number(String(value || "").replace(/,/g, ""))
  if (!Number.isFinite(parsed)) return ""
  return Number(parsed.toFixed(2)).toString()
}

function normaliseUnit(value) {
  const unit = String(value || "").toLowerCase()
  if (/\b(mil|mm|millimet)/.test(unit)) return "mm"
  if (/\b(cm|centimet)/.test(unit)) return "cm"
  if (/\b(kg|kilogram)/.test(unit)) return "kg"
  if (/\b(v|volt)/.test(unit)) return "V"
  if (/\b(kw|kilowatt)/.test(unit)) return "kW"
  if (/\b(w|watts?)/.test(unit)) return "W"
  return ""
}

function compactModel(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function tableColumnIndex(text, compactModelHint) {
  if (!compactModelHint) return -1
  const tokenRe = /\b([A-Z]{1,5}[- ]?[0-9][A-Z0-9]{1,9}(?:[- .][0-9A-Z]{1,8})*)\b/gi
  const tokens = Array.from(text.matchAll(tokenRe))
  for (let i = 0; i < tokens.length - 1; i++) {
    const run = [tokens[i][1]]
    let lastEnd = tokens[i].index + tokens[i][0].length
    for (let j = i + 1; j < Math.min(i + 8, tokens.length); j++) {
      if (tokens[j].index - lastEnd > 25) break
      run.push(tokens[j][1])
      lastEnd = tokens[j].index + tokens[j][0].length
    }
    if (run.length >= 2) {
      const compacts = run.map((t) => compactModel(t))
      const idx = compacts.indexOf(compactModelHint)
      if (idx !== -1) return idx
    }
  }
  return -1
}

function numberAfterLabel(text, labels, columnHint = -1) {
  const normalised = text.replace(/\s+/g, " ")
  for (const label of labels) {
    const pattern = new RegExp(
      `\\b${labelPattern(label)}\\b\\s*(?:\\(([^)]{0,40})\\))?\\s*[:\\-–—]?\\s*(\\d{1,6}(?:[,.]\\d+)?)\\s*([a-zA-Z/%]+)?`,
      "i"
    )
    const match = normalised.match(pattern)
    if (!match || match.index === undefined) continue
    const unitHint = normaliseUnit(match[3] || match[1])
    const afterFirst = normalised.slice(match.index + match[0].length)
    const rowRest = afterFirst.match(/^((?:\s+\d{2,5}(?:[,.]\d+)?)+)/)
    if (rowRest) {
      if (columnHint < 0) return null
      const extraNums = Array.from(rowRest[1].matchAll(/(\d{2,5}(?:[,.]\d+)?)/g)).map((m) => m[1])
      const allVals = [match[2], ...extraNums]
      if (columnHint < allVals.length) return { value: compactNumber(allVals[columnHint]), unit: unitHint }
      return null
    }
    return { value: compactNumber(match[2]), unit: unitHint }
  }
  return null
}

function formatMeasurement(measurement, fallbackUnit) {
  if (!measurement?.value) return ""
  return `${measurement.value} ${measurement.unit || fallbackUnit}`
}

function dimensionsFromLabeledFields(width, depth, height, fallbackUnit) {
  if (!width?.value || !depth?.value || !height?.value) return ""
  const unit = width.unit || depth.unit || height.unit || fallbackUnit
  return `${width.value} x ${depth.value} x ${height.value} ${unit}`
}

function parseDimStringToMm(dimStr) {
  const m = dimStr.match(
    /(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i
  )
  if (!m) return null
  const unit = (m[4] || "mm").toLowerCase()
  const factor = unit === "cm" ? 10 : unit === "m" ? 1000 : 1
  const vals = [m[1], m[2], m[3]].map((v) => Number(v.replace(",", ".")) * factor)
  if (vals.some((v) => !Number.isFinite(v) || v <= 0)) return null
  return [vals[0], vals[1], vals[2]]
}

function sanitiseDimensions(dimStr) {
  if (!dimStr) return dimStr
  const mm = parseDimStringToMm(dimStr)
  if (!mm) return dimStr
  if (mm.some((v) => v < 100 || v > 3500)) return ""
  const max = Math.max(...mm)
  const min = Math.min(...mm)
  if (min > 0 && max / min > 6) return ""
  return dimStr
}

function sanitiseWeight(weightStr) {
  if (!weightStr) return weightStr
  const m = weightStr.match(/(\d+(?:[,.]\d+)?)\s*kg/i)
  if (!m) return weightStr
  const kg = Number(m[1].replace(",", "."))
  if (!Number.isFinite(kg) || kg < 1 || kg > 3000) return ""
  return weightStr
}

function textAfterLabelUntilNext(text, label, nextLabels) {
  const normalised = text.replace(/\s+/g, " ")
  const nextPattern = nextLabels.map(labelPattern).join("|")
  const pattern = new RegExp(
    `\\b${labelPattern(label)}\\b\\s*(?:\\([^)]{0,40}\\))?\\s*[:\\-–—]?\\s*([A-Za-z0-9=.,;\\s/+\\-]{1,100}?)(?=\\s*(?:${nextPattern})\\b|$)`,
    "i"
  )
  const match = normalised.match(pattern)
  return match?.[1]?.replace(/\s+/g, " ").trim() || ""
}

function phaseFromLabel(text) {
  const value = textAfterLabelUntilNext(text, "Electrical Phase", [
    "Electrical Amps", "Electrical Voltage", "Ship Weight", "Product Height",
  ])
  if (/three|3/i.test(value)) return "Three phase"
  if (/single|one|1/i.test(value)) return "Single phase"
  return ""
}

function ampsFromLabel(text) {
  return textAfterLabelUntilNext(text, "Electrical Amps", [
    "Electrical Voltage", "Ship Weight", "Ship Height", "Product Height",
  ])
}

function kilowattsFromLabels(text) {
  const kw = numberAfterLabel(text, ["Kilowatts", "kW rating", "Power rating"])
  if (kw?.value) return `${kw.value} kW`
  const watts = numberAfterLabel(text, ["Electrical Watts", "Watts", "Wattage"])
  const wattValue = Number(watts?.value || "")
  if (Number.isFinite(wattValue) && wattValue > 0) {
    return wattValue >= 1000 ? `${Number((wattValue / 1000).toFixed(2))} kW` : `${wattValue} W`
  }
  return ""
}

function extractedSpecsFrom(text, modelHint) {
  const columnHint = modelHint ? tableColumnIndex(text, compactModel(modelHint)) : -1

  const productWidth  = numberAfterLabel(text, ["Product Width",  "Width"],  columnHint)
  const productDepth  = numberAfterLabel(text, ["Product Depth",  "Depth"],  columnHint)
  const productHeight = numberAfterLabel(text, ["Product Height", "Height"], columnHint)
  const shipWidth     = numberAfterLabel(text, ["Ship Width",  "Shipping Width",  "Packed Width"])
  const shipDepth     = numberAfterLabel(text, ["Ship Depth",  "Shipping Depth",  "Packed Depth"])
  const shipHeight    = numberAfterLabel(text, ["Ship Height", "Shipping Height", "Packed Height"])
  const productWeight = numberAfterLabel(text, ["Product Weight", "Net Weight", "Weight"])
  const shipWeight    = numberAfterLabel(text, ["Ship Weight", "Shipping Weight", "Packed Weight", "Gross Weight"])

  const rawDimensions =
    dimensionsFromLabeledFields(productWidth, productDepth, productHeight, "mm") ||
    firstMatch(text, [
      /\b(?:dimensions?|size|w\s?x\s?d\s?x\s?h)[^\d]{0,24}(\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?)/i,
      /\b(?:dimensions?|size)[^\d]{0,40}(\d{2,4}\s*\(\s*[hwd]\s*\)\s?[x×]\s?\d{2,4}\s*\(\s*[hwd]\s*\)\s?[x×]\s?\d{2,4}\s*\(\s*[hwd]\s*\)\s?(?:mm|cm)?)/i,
      /\b(\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?)\b/i,
      /\b(\d{2,4}\s*\(\s*[hwd]\s*\)\s?[x×]\s?\d{2,4}\s*\(\s*[hwd]\s*\)\s?[x×]\s?\d{2,4}\s*\(\s*[hwd]\s*\)\s?(?:mm|cm)?)\b/i,
    ])

  const labelled_weight_text = firstMatch(text, [
    /\b(?:weight|net weight|product weight|empty weight)[^\d]{0,40}(\d{1,4}(?:\.\d+)?\s?kg)\b/i,
    /\b(\d{1,4}(?:\.\d+)?\s?kg)\s*(?:empty\s*)?(?:weight|net)\b/i,
  ])
  const rawWeight = labelled_weight_text || formatMeasurement(productWeight, "kg")

  const rawGrossWeight =
    formatMeasurement(shipWeight, "kg") ||
    firstMatch(text, [
      /\b(?:gross weight|ship weight|shipping weight|packed weight)[^\d]{0,40}(\d{1,4}(?:\.\d+)?\s?kg)\b/i,
    ])

  return {
    _debug: {
      columnHint,
      productWidth, productDepth, productHeight,
      productWeight, shipWeight,
      rawDimensions,
      labelled_weight_text,
      rawWeight,
    },
    dimensions: sanitiseDimensions(rawDimensions),
    packedDimensions: dimensionsFromLabeledFields(shipWidth, shipDepth, shipHeight, "cm"),
    weight: sanitiseWeight(rawWeight),
    grossWeight: sanitiseWeight(rawGrossWeight),
    voltage:
      formatMeasurement(numberAfterLabel(text, ["Electrical Voltage", "Voltage"]), "V") ||
      firstMatch(text, [/\b(2[23]0\s?v|240\s?v|400\s?v|415\s?v)\b/i]),
    phase:
      phaseFromLabel(text) ||
      firstMatch(text, [/\b(single phase|three phase|3 phase|1 phase|3-phase|1-phase)\b/i]),
    amps:
      ampsFromLabel(text) || firstMatch(text, [/\b(\d{1,3}(?:\.\d+)?\s?a(?:mp|mps)?)\b/i]),
    kwRating:
      kilowattsFromLabels(text) || firstMatch(text, [/\b(\d{1,3}(?:\.\d+)?\s?kW)\b/i]),
    gasType: firstMatch(text, [/\b(natural gas|lpg|propane)\b/i]),
    capacity: firstMatch(text, [
      /\b(?:capacity)[^\d]{0,24}(\d{1,4}(?:\.\d+)?\s?(?:litres?|ltr|l\b|trays?|kg))\b/i,
    ]),
  }
}

// ─── Helpers inlined from specLookup.ts ───────────────────────────────────

function cleanText(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).replace(/\s+/g, " ").trim()
    : ""
}

function dimensionValueToCm(value, context) {
  const hasCm = /\bcm\b|centimet/i.test(context)
  const hasMm = /\bmm\b|millimet/i.test(context)
  const unitLooksMm = value > 300 || (hasMm && !hasCm)
  const unitLooksM = value < 10 && !hasCm && !hasMm
  const converted = unitLooksMm ? value / 10 : unitLooksM ? value * 100 : value
  return Number(converted.toFixed(1))
}

function parseDimensionNumber(value, context) {
  const parsed = Number(value.replace(",", "."))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return dimensionValueToCm(parsed, context)
}

function dimensionTripletFromMatch(match, order, context) {
  if (!match?.[1] || !match?.[2] || !match?.[3]) return null
  const values = [match[1], match[2], match[3]].map((item) => parseDimensionNumber(item, context))
  if (values.some((item) => !item)) return null
  return order.reduce(
    (acc, key, index) => ({ ...acc, [key]: values[index] || null }),
    { height_cm: null, width_cm: null, depth_cm: null }
  )
}

function dimensionsFromText(value) {
  const text = cleanText(value || "")
  if (!text) return { height_cm: null, width_cm: null, depth_cm: null }

  const headerHWD = dimensionTripletFromMatch(
    text.match(/\bheight\s+width\s+depth\b[^0-9]{0,40}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s+(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s+(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["height_cm", "width_cm", "depth_cm"], text
  )
  if (headerHWD?.height_cm && headerHWD.width_cm && headerHWD.depth_cm) return headerHWD

  const headerWDH = dimensionTripletFromMatch(
    text.match(/\b(?:width|w)\s+(?:depth|d|length|l)\s+(?:height|h)\b[^0-9]{0,40}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s+(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s+(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["width_cm", "depth_cm", "height_cm"], text
  )
  if (headerWDH?.height_cm && headerWDH.width_cm && headerWDH.depth_cm) return headerWDH

  const labeled = {
    width_cm:
      parseDimensionNumber(text.match(/\b(?:width|w)\b\s*(?:\([^)]*\))?\s*[:\-–—]?\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\b/i)?.[1] || "", text) ||
      parseDimensionNumber(text.match(/\b(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*(?:\(\s*w\s*\)|\bwide\b)/i)?.[1] || "", text),
    depth_cm:
      parseDimensionNumber(text.match(/\b(?:depth|length|d|l)\b\s*(?:\([^)]*\))?\s*[:\-–—]?\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\b/i)?.[1] || "", text) ||
      parseDimensionNumber(text.match(/\b(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*(?:\(\s*d\s*\)|\bdeep\b)/i)?.[1] || "", text),
    height_cm:
      parseDimensionNumber(text.match(/\b(?:height|h)\b\s*(?:\([^)]*\))?\s*[:\-–—]?\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\b/i)?.[1] || "", text) ||
      parseDimensionNumber(text.match(/\b(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*(?:\(\s*h\s*\)|\bhigh\b)/i)?.[1] || "", text),
  }
  if (labeled.height_cm && labeled.width_cm && labeled.depth_cm) return labeled

  const ldh = dimensionTripletFromMatch(
    text.match(/\b(?:dimensions?|size)[^\d]{0,80}(?:l\s*x\s*d\s*x\s*h|lxdxh|lxpxh|l\s*x\s*p\s*x\s*h)[^\d]{0,20}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["width_cm", "depth_cm", "height_cm"], text
  )
  if (ldh?.height_cm && ldh.width_cm && ldh.depth_cm) return ldh

  const wdh = dimensionTripletFromMatch(
    text.match(/\b(?:dimensions?|size)?[^\d]{0,40}(?:w\s*x\s*d\s*x\s*h|wxdxh|w\s*x\s*l\s*x\s*h)[^\d]{0,20}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["width_cm", "depth_cm", "height_cm"], text
  )
  if (wdh?.height_cm && wdh.width_cm && wdh.depth_cm) return wdh

  const hwd = dimensionTripletFromMatch(
    text.match(/\b(?:dimensions?|size)?[^\d]{0,40}(?:h\s*x\s*w\s*x\s*d|hxwxd|h\s*x\s*w\s*x\s*l)[^\d]{0,30}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["height_cm", "width_cm", "depth_cm"], text
  )
  if (hwd?.height_cm && hwd.width_cm && hwd.depth_cm) return hwd

  // Bare triplet with required trailing unit: "25.2 x 50 x 50.2 cm" or "252 x 500 x 502 mm"
  const trailingUnit = dimensionTripletFromMatch(
    text.match(/\b(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)\b/i),
    ["width_cm", "depth_cm", "height_cm"], text
  )
  if (trailingUnit?.height_cm && trailingUnit.width_cm && trailingUnit.depth_cm) return trailingUnit

  // Catch-all
  const axisMatches = Array.from(text.matchAll(/(\d+(?:[,.]\d+)?)\s*(mm|cm)?\s*(?:\(\s*([HWD])\s*\))?/gi))
  const useful = axisMatches
    .map((match) => ({
      value: Number(match[1].replace(",", ".")),
      hasUnit: Boolean(match[2]),
      axis: (match[3] || "").toUpperCase(),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0 && (item.hasUnit || item.axis))
    .slice(0, 3)

  if (useful.length < 3) return { height_cm: null, width_cm: null, depth_cm: null }
  const hasAnyLabel = useful.some((item) => item.axis)
  const hasAnyUnit = useful.some((item) => item.hasUnit)
  if (!hasAnyLabel && !hasAnyUnit) return { height_cm: null, width_cm: null, depth_cm: null }

  const converted = useful.map((item) => ({
    ...item, value: dimensionValueToCm(item.value, text),
  }))
  const byAxis = Object.fromEntries(converted.filter((item) => item.axis).map((item) => [item.axis, item.value]))
  if (byAxis.H && byAxis.W && byAxis.D) return { height_cm: byAxis.H, width_cm: byAxis.W, depth_cm: byAxis.D }
  const [width, depth, height] = converted.map((item) => item.value)
  return { height_cm: height, width_cm: width, depth_cm: depth }
}

// ─── Main ─────────────────────────────────────────────────────────────────

console.log("=".repeat(70))
console.log("CaterBot extraction test — " + TARGET_URL)
console.log("=".repeat(70))

const response = await fetch(TARGET_URL, {
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; CaterBidsBot/1.0)",
    "Accept": "text/html,application/xhtml+xml",
  },
  signal: AbortSignal.timeout(15000),
})

console.log(`\n[FETCH] status=${response.status} content-type=${response.headers.get("content-type")}`)

const raw = await response.text()
console.log(`[FETCH] raw HTML length: ${raw.length}`)

// ── Step 1: bodyText extraction (mirrors validateCaterBotProductSource) ──
const pageTitle = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || ""
console.log(`\n[STEP 1] pageTitle: "${pageTitle}"`)

const bodyText = decodeHtml(raw)
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .slice(0, 50000)

console.log(`[STEP 1] bodyText length after stripping: ${bodyText.length}`)

// ── Step 2: find "Dimensions" text in bodyText ───────────────────────────
const dimIdx = bodyText.search(/dimensions?/i)
if (dimIdx === -1) {
  console.log('\n[STEP 2] WARNING: "Dimensions" not found anywhere in stripped bodyText')
} else {
  const excerpt = bodyText.slice(Math.max(0, dimIdx - 30), dimIdx + 120)
  console.log(`\n[STEP 2] "Dimensions" found at char ${dimIdx}:`)
  console.log(`  ...${excerpt}...`)
}

// Also show text around "Weight"
const weightIdx = bodyText.search(/\bWeight\b/i)
if (weightIdx !== -1) {
  const excerpt = bodyText.slice(Math.max(0, weightIdx - 10), weightIdx + 80)
  console.log(`\n[STEP 2b] First "Weight" found at char ${weightIdx}:`)
  console.log(`  ...${excerpt}...`)
}

// Find all Weight occurrences
const weightMatches = []
let pos = 0
while (pos < bodyText.length) {
  const idx = bodyText.toLowerCase().indexOf("weight", pos)
  if (idx === -1) break
  weightMatches.push(idx)
  pos = idx + 1
  if (weightMatches.length >= 5) break
}
console.log(`\n[STEP 2c] "weight" positions: ${weightMatches.join(", ")} (first 5)`)
for (const p of weightMatches) {
  console.log(`  @${p}: "${bodyText.slice(Math.max(0, p - 5), p + 50).replace(/\n/g, "↵")}"`)
}

// Check for "kg" in bodyText
const kgIdx = bodyText.search(/\bkg\b/i)
console.log(`\n[STEP 2d] First "kg" at char ${kgIdx}: "${kgIdx >= 0 ? bodyText.slice(Math.max(0, kgIdx - 20), kgIdx + 30) : "NOT FOUND"}"`)

// Check for × or &times; in raw HTML
const timesInRaw = (raw.match(/&times;/g) || []).length
const unicodeTimes = (raw.match(/×/g) || []).length
console.log(`\n[STEP 2e] &times; in raw HTML: ${timesInRaw}, × (unicode) in raw HTML: ${unicodeTimes}`)
if (timesInRaw > 0 || unicodeTimes > 0) {
  const allTimesIdx = raw.search(/&times;|×/)
  const ctxRaw = raw.slice(Math.max(0, allTimesIdx - 40), allTimesIdx + 80)
  console.log(`  First occurrence context (raw): ...${ctxRaw.replace(/</g, "<")}...`)
}
// Check in decoded bodyText
const timesInBody = (bodyText.match(/×/g) || []).length
console.log(`  × in decoded bodyText: ${timesInBody}`)

// ── Step 3: extractedSpecsFrom ────────────────────────────────────────────
const sourceText = `${pageTitle} ${bodyText}`
console.log("\n" + "─".repeat(70))
console.log("[STEP 3] extractedSpecsFrom(sourceText, modelHint=" + MODEL_HINT + ")")
const extracted = extractedSpecsFrom(sourceText, MODEL_HINT)
const debug = extracted._debug
delete extracted._debug

console.log("\n  tableColumnIndex result:", debug.columnHint)
console.log("  productWidth  :", debug.productWidth)
console.log("  productDepth  :", debug.productDepth)
console.log("  productHeight :", debug.productHeight)
console.log("  productWeight :", debug.productWeight)
console.log("  rawDimensions :", JSON.stringify(debug.rawDimensions))
console.log("  labelled_weight_text :", JSON.stringify(debug.labelled_weight_text))
console.log("  rawWeight     :", JSON.stringify(debug.rawWeight))

console.log("\n  extractedSpecs result:")
for (const [k, v] of Object.entries(extracted)) {
  if (v) console.log(`    ${k}: ${JSON.stringify(v)}`)
}

// ── Step 4: dimensionsFromText on the extracted dims string ───────────────
console.log("\n" + "─".repeat(70))
console.log(`[STEP 4] dimensionsFromText("${extracted.dimensions}")`)
const parsedDims = dimensionsFromText(extracted.dimensions)
console.log("  result:", parsedDims)

// Also test on raw "252×500×502 mm" if found
const dimStrings = [
  extracted.dimensions,
  "25.2 x 50 x 50.2 cm",
  "252×500×502 mm",
  "252 x 500 x 502 mm",
]
console.log("\n[STEP 4b] dimensionsFromText on candidate strings:")
for (const s of dimStrings) {
  if (!s) continue
  const r = dimensionsFromText(s)
  console.log(`  "${s}" → ${JSON.stringify(r)}`)
}

console.log("\n" + "=".repeat(70))
console.log("Done.")
