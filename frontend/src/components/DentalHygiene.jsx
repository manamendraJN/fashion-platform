import { useState } from 'react';
import { predictDental } from '../services/gapi';
import { Layout } from './Layout';

const DENTAL_CONDITION_INFO = {
  Calculus: {
    label: 'Calculus (Tartar)',
    icon: '🦴',
    severity: 'Medium',
    severityLevel: 'medium',
    desc: 'Hardened dental plaque (tartar) that has mineralised on tooth surfaces. Cannot be removed by brushing alone — requires professional scaling.',
    tips: [
      'Schedule a professional dental cleaning (scaling) every 6 months.',
      'Brush twice daily with a tartar-control toothpaste.',
      'Floss daily to remove plaque between teeth before it hardens.',
      'Reduce sugary and starchy foods that feed plaque bacteria.',
    ],
    routine: {
      morning: ['Brush teeth 2–3 minutes with tartar-control toothpaste', 'Rinse with fluoride mouthwash'],
      afternoon: ['Floss gently to remove food stuck between teeth', 'Drink water to rinse mouth after meals'],
      night: ['Brush teeth again before bed', 'Avoid sugary snacks late at night'],
    },
  },

  Gingivitis: {
    label: 'Gingivitis',
    icon: '🩸',
    severity: 'Medium',
    severityLevel: 'medium',
    desc: 'Early-stage gum disease causing inflammation, redness, and bleeding of the gums. Reversible with proper oral hygiene.',
    tips: [
      'Brush gently along the gumline twice a day.',
      'Use an antiseptic mouthwash to reduce bacteria.',
      'Floss daily — bleeding will reduce as gums heal.',
      'See a dentist; left untreated it can progress to periodontitis.',
    ],
    routine: {
      morning: ['Brush along gumline gently', 'Rinse with antiseptic mouthwash'],
      afternoon: ['Floss carefully between teeth', 'Drink water frequently'],
      night: ['Brush with soft toothbrush before bed', 'Avoid sugary snacks after dinner'],
    },
  },

  'Mouth Ulcer': {
    label: 'Mouth Ulcer',
    icon: '🔴',
    severity: 'Low-Medium',
    severityLevel: 'medium',
    desc: 'Painful sores (aphthous ulcers) on the soft tissues inside the mouth. Usually heal on their own in 1–2 weeks.',
    tips: [
      'Rinse with warm salt water 3× daily to ease discomfort.',
      'Avoid spicy, acidic, or hard foods that irritate the sore.',
      'Apply over-the-counter gel (e.g., benzocaine) for pain relief.',
      'See a doctor if ulcers persist beyond 3 weeks or recur frequently.',
    ],
    routine: {
      morning: ['Rinse mouth with warm salt water', 'Brush teeth carefully avoiding the ulcer'],
      afternoon: ['Eat soft, non-irritating foods', 'Stay hydrated'],
      night: ['Apply protective gel if recommended', 'Rinse mouth before bed'],
    },
  },

  'Tooth Discoloration': {
    label: 'Tooth Discoloration',
    icon: '☕',
    severity: 'Low',
    severityLevel: 'low',
    desc: 'Staining or color change of tooth enamel, caused by coffee, tea, tobacco, certain medications, or enamel defects.',
    tips: [
      'Brush with a whitening toothpaste to remove surface stains.',
      'Limit coffee, tea, red wine, and smoking.',
      'Use a straw for staining beverages.',
      'Ask your dentist about professional whitening treatments.',
    ],
    routine: {
      morning: ['Brush with whitening toothpaste', 'Rinse with water after breakfast'],
      afternoon: ['Drink water after coffee or tea', 'Avoid staining foods if possible'],
      night: ['Brush gently before bed', 'Consider whitening gel or strips if advised'],
    },
  },

  'Yellow Teeth': {
    label: 'Yellow Teeth',
    icon: '💛',
    severity: 'Low',
    severityLevel: 'low',
    desc: 'Yellowish discolouration of teeth, often from surface staining, poor hygiene, aging, or thinning enamel.',
    tips: [
      'Brush twice daily and floss regularly.',
      'Try oil pulling with coconut oil for natural whitening.',
      'Use baking-soda-based toothpaste occasionally for surface stains.',
      'Consult a dentist to distinguish staining from structural enamel issues.',
    ],
    routine: {
      morning: ['Brush teeth thoroughly', 'Use oil pulling with coconut oil if desired'],
      afternoon: ['Floss gently', 'Rinse with water after meals'],
      night: ['Brush teeth before bed', 'Use baking-soda toothpaste once or twice weekly'],
    },
  },

  caries: {
    label: 'Dental Caries (Cavities)',
    icon: '🦷',
    severity: 'Medium-High',
    severityLevel: 'high',
    desc: 'Tooth decay caused by bacterial acid dissolving enamel. Can progress from a small lesion to nerve damage if untreated.',
    tips: [
      '⚠️ See a dentist as soon as possible to prevent further decay.',
      'Brush with fluoride toothpaste to strengthen remaining enamel.',
      'Avoid sugary snacks and drinks that feed decay bacteria.',
      'Ask about a fluoride varnish or dental sealants for protection.',
    ],
    routine: {
      morning: ['Brush thoroughly with fluoride toothpaste', 'Rinse with fluoride mouthwash'],
      afternoon: ['Avoid sugary snacks', 'Floss gently to remove trapped food'],
      night: ['Brush again before bed', 'Limit late-night snacking'],
    },
  },

  healthy: {
    label: 'Healthy Teeth & Gums',
    icon: '✅',
    severity: 'None',
    severityLevel: 'none',
    desc: 'Teeth and gums appear normal with no visible signs of decay, gum disease, or discolouration. Keep up the good work!',
    tips: [
      'Continue brushing twice daily with fluoride toothpaste.',
      'Floss at least once a day.',
      'Visit your dentist every 6 months for check-ups.',
      'Maintain a calcium-rich diet for strong teeth.',
    ],
    routine: {
      morning: ['Brush teeth with fluoride toothpaste', 'Rinse with mouthwash'],
      afternoon: ['Floss and rinse after meals', 'Drink plenty of water'],
      night: ['Brush before bed', 'Avoid sugary snacks'],
    },
  },

  hypodontia: {
    label: 'Hypodontia',
    icon: '🔢',
    severity: 'Medium',
    severityLevel: 'medium',
    desc: 'A congenital condition where one or more teeth fail to develop. Most commonly affects wisdom teeth, lateral incisors, or premolars.',
    tips: [
      'Consult an orthodontist or prosthodontist for a treatment plan.',
      'Options include implants, bridges, or orthodontic space closure.',
      'Maintain careful hygiene around any adjacent teeth.',
      'Regular X-rays help monitor spacing and jaw development.',
    ],
    routine: {
      morning: ['Brush carefully around existing teeth', 'Rinse with fluoride mouthwash'],
      afternoon: ['Floss carefully in areas with missing teeth', 'Stay hydrated'],
      night: ['Brush gently before bed', 'Clean any prosthetic or orthodontic appliance if used'],
    },
  },
};

const SEVERITY_COLORS = {
  none: '#16a34a',
  low: '#0891b2',
  medium: '#d97706',
  high: '#dc2626',
  critical: '#7c3aed',
};

const getConfidenceBadge = (p) =>
  p >= 0.65
    ? { label: 'HIGH', cls: 'bg-emerald-100 text-emerald-700' }
    : p >= 0.35
      ? { label: 'MEDIUM', cls: 'bg-amber-100 text-amber-700' }
      : { label: 'LOW', cls: 'bg-rose-100 text-rose-700' };

const DentalResult = ({ result }) => {
  const topConf = result.probs[result.top_class];
  const info = DENTAL_CONDITION_INFO[result.top_class] ?? {
    label: result.top_class,
    icon: '🔍',
    severity: 'Unknown',
    severityLevel: 'medium',
    desc: '',
    tips: [],
  };
  const badge = getConfidenceBadge(topConf);
  const sorted = Object.entries(result.probs)
    .map(([cls, prob]) => ({ cls, prob }))
    .sort((a, b) => b.prob - a.prob);
  const top5 = sorted.slice(0, 5);
  const sevColor = SEVERITY_COLORS[info.severityLevel];

  return (
    <div className="space-y-6 rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-sm">
      <div className="rounded-2xl border-2 p-4" style={{ borderColor: sevColor }}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl">{info.icon}</span>
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8B5A5A]">Primary Diagnosis</div>
            <div className="text-lg font-semibold text-[#2C2C2C]">{info.label}</div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#6B6B6B]">
          <span>
            Confidence: <strong className="text-[#2C2C2C]">{(topConf * 100).toFixed(1)}%</strong>
          </span>
          <span className="rounded-full px-3 py-1 text-white" style={{ background: sevColor }}>
            Severity: {info.severity}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-[#2C2C2C]">📋 Description</div>
        <p className="text-sm text-[#6B6B6B]">{info.desc}</p>
      </div>

      {info.routine && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[#2C2C2C]">🗓️ Daily Care Routine</div>
          <div className="grid gap-3 md:grid-cols-3">
            {['morning', 'afternoon', 'night'].map((period) => (
              <div key={period} className="rounded-2xl border border-[#E5E0D8] bg-[#FAF8F5] p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#6B6B6B]">
                  {info.routine[period].map((task, i) => (
                    <li key={i}>{task}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-semibold text-[#2C2C2C]">💡 Health Tips &amp; Recommendations</div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[#6B6B6B]">
          {info.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#2C2C2C]">📊 All Predictions (Top {top5.length})</div>
        <div className="space-y-3">
          {top5.map(({ cls, prob }) => {
            const ci = DENTAL_CONDITION_INFO[cls] ?? { label: cls, icon: '🔍' };
            const isTop = cls === result.top_class;
            return (
              <div key={cls} className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-base">{ci.icon}</span>
                  <span className={isTop ? 'font-semibold text-[#2C2C2C]' : 'text-[#6B6B6B]'}>{ci.label}</span>
                  <span className="ml-auto text-[#2C2C2C]">{(prob * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#F1EAE2]">
                  <div className="h-2 rounded-full bg-[#8B5A5A]" style={{ width: `${Math.max(prob * 100, 1)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        ⚠️ This is an AI prediction tool, not a substitute for professional medical advice. Always consult a
        healthcare provider for accurate diagnosis and treatment.
      </div>
    </div>
  );
};

export const DentalHygiene = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const onChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setImage(f);
      setPreview(URL.createObjectURL(f));
      setError(null);
      setResult(null);
    }
  };

  const onAnalyze = async () => {
    if (!image) {
      setError('Please upload a teeth photo');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await predictDental(image);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-10">
        <header className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E8E4DE] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">
            🦷 Dental Condition Analysis
          </span>
          <h1 className="text-3xl md:text-5xl font-serif text-[#2C2C2C]">Smarter dental checkups</h1>
          <p className="text-base md:text-lg text-[#6B6B6B]">
            Upload a clear teeth photo — our MobileNetV2 classifier detects 8 dental conditions.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6 rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">Upload Teeth Photo</span>
              <input type="file" accept="image/*" id="dental-upload" className="sr-only" onChange={onChange} />
              <label
                htmlFor="dental-upload"
                className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E5E0D8] bg-[#FAF8F5] px-4 text-center hover:border-[#8B5A5A]"
              >
                {preview ? (
                  <img src={preview} alt="Dental preview" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <>
                    <div className="text-3xl">📷</div>
                    <div className="text-sm font-semibold text-[#2C2C2C]">Click to upload teeth photo</div>
                    <div className="text-xs text-[#6B6B6B]">JPG, PNG, or WEBP • 224 × 224 or larger</div>
                  </>
                )}
              </label>
            </div>

            <div className="rounded-2xl border border-[#E5E0D8] bg-[#FAF8F5] p-4">
              <h3 className="text-sm font-semibold text-[#2C2C2C]">📋 Photo Guidelines</h3>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-[#6B6B6B]">
                <li>😁 Show teeth clearly, mouth open</li>
                <li>💡 Good lighting, no shadows</li>
                <li>📸 Sharp focus, close-up</li>
                <li>🎨 Neutral background</li>
              </ul>
            </div>

            <button
              className="w-full rounded-full bg-gradient-to-r from-[#8B5A5A] to-[#A67676] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
              onClick={onAnalyze}
              disabled={!image || loading}
            >
              {loading ? '⏳ Analyzing…' : '🔎 Analyze Teeth'}
            </button>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                ❌ {error}
              </div>
            )}
          </section>

          <section className="space-y-4">
            {result ? (
              <DentalResult result={result} />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[#E5E0D8] bg-white p-6 text-center">
                <div className="text-4xl">🦷</div>
                <p className="text-sm text-[#6B6B6B]">
                  Upload a photo and click <strong>Analyze Teeth</strong> to see the classification results.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};
