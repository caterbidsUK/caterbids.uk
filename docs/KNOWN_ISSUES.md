# Known Issues

## pallet-footprint-positional-parse

**Affected paths:** `applyValidatedManualSource` (page.tsx ~line 1832) and `suggestionDeliveryDimensions` (page.tsx ~line 1509)

**Issue:** The pallet footprint check at call sites 4 and 5 relies on positional dimension parsing (index 0 = width, index 1 = depth) when the source dimension string has no axis labels. If a string like "90 x 110 x 85 cm" arrives with width and depth swapped relative to parser expectations, a borderline item with one dimension near the 120cm base limit may be incorrectly classified as fits/oversized.

**Mitigations in place:**
- A `console.warn` fires whenever the footprint check triggers on a positionally-parsed string (unlabeled). Look for `CaterBot pallet footprint check fired on positionally-parsed dims` in dev logs.
- The check is correct for any item with a dimension > 120cm regardless of which horizontal axis is which (both orientations fail). Only borderline items (e.g. 90cm × 110cm, where 90×110 fits but 110×90 does not) are at risk.
- The authoritative spec-lookup path (specLookup.ts `palletSize()`) uses labeled parsing from manufacturer spec text and is not affected.

**Resolution:** Add a `wasLabeled: boolean` return flag to `parseDeliveryDimensionsToCm` so call sites can surface a seller-facing "confirm dimensions" prompt instead of silently relying on positional order. Not yet prioritised.
