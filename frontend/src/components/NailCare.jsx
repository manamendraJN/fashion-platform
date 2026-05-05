import { useState } from 'react';
import { predictNail } from '../services/gapi';
import { Layout } from './Layout';

const NAIL_CONDITION_INFO = {
  beau_s_line: {
    label: "Beau's Lines",
    icon: '〰️',
    severity: 'Low-Medium',
    severityLevel: 'medium',
    desc: 'Horizontal grooves across nails caused by temporary nail growth disruption.',
    tips: [
      'Usually resolves as the nail grows.',
      'Ensure adequate protein and zinc intake.',
      'Reduce stress and maintain proper nutrition.',
      'Consult a doctor if lines appear frequently.',
    ],
    routine: {
      morning: ['Clean nails gently', 'Apply moisturizer to nails'],
      afternoon: ['Avoid nail pressure or trauma', 'Eat protein rich foods'],
      night: ['Massage nails with vitamin oil', 'Keep nails dry before sleep'],
    },
  },

  black_line: {
    label: 'Black Line (Melanonychia)',
    icon: '🖤',
    severity: 'High — Seek Medical Advice',
    severityLevel: 'critical',
    desc: 'A dark vertical streak along the nail which may indicate melanoma.',
    tips: [
      '⚠️ Seek medical advice immediately.',
      'Monitor any change in size or color.',
      'Avoid ignoring new dark streaks.',
      'Early detection is critical.',
    ],
    routine: {
      morning: ['Inspect nail color changes', 'Keep nails clean'],
      afternoon: ['Avoid nail trauma', 'Protect nails during work'],
      night: ['Document any color changes', 'Schedule medical consultation if needed'],
    },
  },

  clubbing: {
    label: 'Nail Clubbing',
    icon: '🔵',
    severity: 'Medium-High',
    severityLevel: 'high',
    desc: 'Rounded nail shape associated with lung or heart diseases.',
    tips: [
      'Consult a physician for lung or heart evaluation.',
      'Avoid smoking.',
      'Monitor breathing issues.',
      'Maintain a healthy lifestyle.',
    ],
    routine: {
      morning: ['Check oxygen level if possible', 'Light breathing exercises'],
      afternoon: ['Avoid smoking environments', 'Stay physically active'],
      night: ['Relax with breathing exercises', 'Monitor fatigue or breathing issues'],
    },
  },

  healthy: {
    label: 'Healthy Nails',
    icon: '✅',
    severity: 'None',
    severityLevel: 'none',
    desc: 'Nails appear smooth, pink, and free from abnormalities.',
    tips: ['Maintain a balanced diet.', 'Trim nails regularly.', 'Moisturize nails daily.', 'Avoid biting nails.'],
    routine: {
      morning: ['Wash nails with mild soap', 'Apply hand moisturizer'],
      afternoon: ['Drink enough water', 'Avoid nail biting'],
      night: ['Apply cuticle oil', 'Keep nails dry'],
    },
  },

  mees_line: {
    label: "Mees' Lines",
    icon: '📏',
    severity: 'Medium',
    severityLevel: 'medium',
    desc: 'White horizontal bands that may indicate heavy metal poisoning or illness.',
    tips: ['Seek medical evaluation.', 'Check for possible toxin exposure.', 'Maintain proper nutrition.', 'Monitor kidney health.'],
    routine: {
      morning: ['Inspect nail changes', 'Maintain good hygiene'],
      afternoon: ['Avoid chemical exposure', 'Drink sufficient water'],
      night: ['Maintain balanced diet', 'Monitor health symptoms'],
    },
  },

  onycholysis: {
    label: 'Onycholysis',
    icon: '🩹',
    severity: 'Low-Medium',
    severityLevel: 'medium',
    desc: 'Nail separating from the nail bed.',
    tips: ['Keep nails short.', 'Wear gloves during wet work.', 'Avoid picking the nail.', 'Use antifungal treatment if needed.'],
    routine: {
      morning: ['Clean nail gently', 'Apply antifungal cream'],
      afternoon: ['Wear gloves while washing', 'Avoid nail trauma'],
      night: ['Dry nails thoroughly', 'Apply protective ointment'],
    },
  },

  terry_s_nail: {
    label: "Terry's Nails",
    icon: '🌫️',
    severity: 'Medium-High',
    severityLevel: 'high',
    desc: 'White nails with a pink band linked to liver or metabolic diseases.',
    tips: ['Consult a doctor for liver function test.', 'Monitor blood sugar levels.', 'Reduce alcohol intake.', 'Maintain healthy diet.'],
    routine: {
      morning: ['Check nail color changes', 'Eat a healthy breakfast'],
      afternoon: ['Avoid alcohol', 'Stay hydrated'],
      night: ['Monitor fatigue', 'Sleep well'],
    },
  },

  white_spot: {
    label: 'White Spots (Leukonychia)',
    icon: '⚪',
    severity: 'Low',
    severityLevel: 'low',
    desc: 'Small white spots usually caused by minor trauma.',
    tips: ['Usually harmless.', 'Avoid aggressive manicures.', 'Maintain calcium and zinc intake.', 'Protect nails from injury.'],
    routine: {
      morning: ['Keep nails clean', 'Apply nail moisturizer'],
      afternoon: ['Avoid nail trauma', 'Eat nutrient rich foods'],
      night: ['Massage nails with oil', 'Keep nails dry'],
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

const NailResult = ({ result }) => {
  const topConf = result.probs[result.top_class];
  const info = NAIL_CONDITION_INFO[result.top_class] ?? {
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

      <div className="space-y-2">
        <div className="text-sm font-semibold text-[#2C2C2C]">💡 Health Tips &amp; Recommendations</div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[#6B6B6B]">
          {info.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
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

      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#2C2C2C]">📊 All Predictions (Top {top5.length})</div>
        <div className="space-y-3">
          {top5.map(({ cls, prob }) => {
            const ci = NAIL_CONDITION_INFO[cls] ?? { label: cls, icon: '🔍' };
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

export const NailCare = () => {
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
      setError('Please upload a nail photo');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await predictNail(image);
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
            💅 Nail Condition Analysis
          </span>
          <h1 className="text-3xl md:text-5xl font-serif text-[#2C2C2C]">Nail health at a glance</h1>
          <p className="text-base md:text-lg text-[#6B6B6B]">
            Upload a clear nail photo — our MobileNetV2 classifier detects 8 nail conditions.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6 rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">Upload Nail Photo</span>
              <input type="file" accept="image/*" id="nail-upload" className="sr-only" onChange={onChange} />
              <label
                htmlFor="nail-upload"
                className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E5E0D8] bg-[#FAF8F5] px-4 text-center hover:border-[#8B5A5A]"
              >
                {preview ? (
                  <img src={preview} alt="Nail preview" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <>
                    <div className="text-3xl">📷</div>
                    <div className="text-sm font-semibold text-[#2C2C2C]">Click to upload nail photo</div>
                    <div className="text-xs text-[#6B6B6B]">JPG, PNG, or WEBP • 224 × 224 or larger</div>
                  </>
                )}
              </label>
            </div>

            <div className="rounded-2xl border border-[#E5E0D8] bg-[#FAF8F5] p-4">
              <h3 className="text-sm font-semibold text-[#2C2C2C]">📋 Photo Guidelines</h3>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-[#6B6B6B]">
                <li>💡 Natural, bright lighting</li>
                <li>🔍 Close-up, in-focus shot</li>
                <li>🖐️ Clean, flat hand position</li>
                <li>🎨 Plain background preferred</li>
              </ul>
            </div>

            <button
              className="w-full rounded-full bg-gradient-to-r from-[#8B5A5A] to-[#A67676] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
              onClick={onAnalyze}
              disabled={!image || loading}
            >
              {loading ? '⏳ Analyzing…' : '🔎 Analyze Nail'}
            </button>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                ❌ {error}
              </div>
            )}
          </section>

          <section className="space-y-4">
            {result ? (
              <NailResult result={result} />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[#E5E0D8] bg-white p-6 text-center">
                <div className="text-4xl">💅</div>
                <p className="text-sm text-[#6B6B6B]">
                  Upload a photo and click <strong>Analyze Nail</strong> to see the classification results.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};
