// Standard UK pallet base: 1200mm × 1000mm (120cm × 100cm).
// All Interparcel tiers share this footprint — tiers differ by height and weight only.
// An item whose footprint (WIDTH × DEPTH) does not fit on a 1200×1000 base
// cannot be palletised regardless of weight or height.
export function isPalletFootprintOversized(widthCm: number, depthCm: number): boolean {
  if (!(widthCm > 0) || !(depthCm > 0)) return false
  // Try both orientations: item can be rotated 90° on the pallet base.
  const fitsOrientationA = widthCm <= 120 && depthCm <= 100
  const fitsOrientationB = widthCm <= 100 && depthCm <= 120
  return !fitsOrientationA && !fitsOrientationB
}
