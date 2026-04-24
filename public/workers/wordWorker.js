self.onmessage = function(e) {
  const { verbatims, customStopwords, minFreq } = e.data;
  
  const stops = new Set(customStopwords.toLowerCase().split(',').map(w => w.trim()).filter(Boolean));
  const freq = new Map();
  
  verbatims.forEach(v => {
    // Regex simple para palabras
    const words = v.text.toLowerCase().split(/\W+/);
    words.forEach(w => {
      if (w.length > 2 && !stops.has(w)) {
        freq.set(w, (freq.get(w) ?? 0) + 1);
      }
    });
  });
  
  const result = Array.from(freq.entries())
    .filter(([, c]) => c >= minFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 120)
    .map(([text, value]) => ({ text, value }));
    
  self.postMessage(result);
};
