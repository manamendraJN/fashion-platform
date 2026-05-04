const getCategoryIcon = (category) => {
  const icons = {
    Tone: '💧',
    Color: '🎨',
    Blackhead: '🔍',
  };
  return icons[category] || '📊';
};

const getConfidenceClass = (confidence) => {
  if (confidence >= 80) return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
  if (confidence >= 60) return { text: 'text-amber-600', bar: 'bg-amber-500' };
  return { text: 'text-rose-600', bar: 'bg-rose-500' };
};

export const PredictionTable = ({ result }) => {
  if (!result) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E0D8] bg-[#FAF8F5] p-6 text-center">
        <span className="text-5xl">📊</span>
        <span className="text-sm font-semibold text-[#2C2C2C]">No predictions yet</span>
        <span className="text-xs text-[#6B6B6B]">Results will appear here</span>
      </div>
    );
  }

  const rows = [
    { category: 'Tone', data: result.tone },
    { category: 'Color', data: result.color },
    { category: 'Blackhead', data: result.blackhead },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-serif text-[#2C2C2C]">Analysis Results</h3>
        <span className="text-xs uppercase tracking-wider text-[#8B5A5A]">AI Insights</span>
      </div>
      {rows.map(({ category, data }) => {
        const sortedProbs = Object.entries(data.probs)
          .map(([label, prob]) => ({ label, prob: prob * 100 }))
          .sort((a, b) => b.prob - a.prob);

        return (
          <div key={category} className="rounded-2xl border border-[#E5E0D8] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-xl">{getCategoryIcon(category)}</span>
              <span className="font-semibold text-[#2C2C2C]">{category}</span>
              <span className="rounded-full bg-[#F0EBE4] px-3 py-1 text-xs font-semibold text-[#8B5A5A]">
                {data.top_class}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {sortedProbs.map(({ label, prob }) => {
                const confClass = getConfidenceClass(prob);
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={label === data.top_class ? 'font-semibold text-[#2C2C2C]' : 'text-[#6B6B6B]'}>
                        {label}
                      </span>
                      <span className={`font-semibold ${confClass.text}`}>{prob.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F1EAE2]">
                      <div
                        className={`h-2 rounded-full ${confClass.bar}`}
                        style={{ width: `${prob}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
