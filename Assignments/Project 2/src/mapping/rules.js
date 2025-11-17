// Mapping rules for stitch selection, call overrides, keyword picots


//----------- Stitch selection rules ------------------
export function buildMappingRules(maxTotal = 100, resolution = 'day') {
  const m = Math.max(1, Number.isFinite(maxTotal) ? Math.floor(maxTotal) : 100);
  const q1 = Math.floor(m / 5);
  const q2 = Math.floor((m * 2) / 5);
  const q3 = Math.floor((m * 3) / 5);
  const q4 = Math.floor((m * 4) / 5);

  return {

    // chainSkip(0), sc(1..20%), hdc(20..40%), dc(40..60%), tr(60..80%), dtr(80..100%)
    stitchThresholds: [
      { name: 'chainSkip', range: [0, 0] },
      { name: 'sc',        range: [1, Math.max(1, q1)] },
      { name: 'hdc',       range: [q1 + 1, Math.max(q1 + 1, q2)] },
      { name: 'dc',        range: [q2 + 1, Math.max(q2 + 1, q3)] },
      { name: 'tr',        range: [q3 + 1, Math.max(q3 + 1, q4)] },
      { name: 'dtr',       range: [q4 + 1, m] },
    ],

//TODO: hitCount (keyword-based picots, not yet implemented)
    picotForKeyword(hitCount) {
      const n = Number.isFinite(hitCount) ? hitCount : 0;
      if (n <= 0) return null;
      if (n <= 2) return 'picot3';
      if (n <= 5) return 'picot4';
      return 'picot5';
    },
  };
}


// decide stitch type by total message count in a bin
// output: 'chainSkip', 'sc', 'hdc', 'dc', 'tr', 'dtr'
export function decideStitchName(counts, rulesObj, bin) {
  const c = Number.isFinite(counts) ? counts : 0;

  // Use thresholds based on message count
  const thresholds = rulesObj?.stitchThresholds || [];
  for (const item of thresholds) {
    const [lo, hi] = item.range;
    if (c >= lo && c <= hi) return item.name;
  }

  return thresholds.length ? thresholds[thresholds.length - 1].name : 'sc';
}

// Provide a default rules object using a conservative maxTotal.
export const mappingRules = buildMappingRules(100);