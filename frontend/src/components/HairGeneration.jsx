import { useState, useEffect, useRef } from 'react';
import { getHairStyles, generateHairImage } from '../services/gapi';
import { Layout } from './Layout';

const FALLBACK_STYLES = [
  { key: 'slicked_back', display: '⭐ Slicked Back', available: true },
  { key: 'afro', display: '🌀 Afro', available: true },
  { key: 'bob_cut', display: '✂️ Bob Cut', available: true },
  { key: 'Curly', display: '🌊 Curly', available: true },
  { key: 'dreadlocks', display: '🔱 Dreadlocks', available: true },
  { key: 'long_straight', display: '📏 Long Straight', available: true },
  { key: 'man_bun', display: '🎀 Man Bun', available: true },
  { key: 'medium_straight', display: '↔️ Medium Straight', available: true },
  { key: 'medium_waves', display: '〰️ Medium Waves', available: true },
  { key: 'pixie_cut', display: '✨ Pixie Cut', available: true },
  { key: 'Short crop', display: '✂️ Short Crop', available: true },
  { key: 'short_buzz_cut', display: '⚡ Short Buzz Cut', available: true },
  { key: 'Straight', display: '📏 Straight', available: true },
  { key: 'Wavy', display: '🌊 Wavy', available: true },
];

export const HairGeneration = () => {
  const [styles, setStyles] = useState(FALLBACK_STYLES);
  const [selStyle, setSelStyle] = useState(FALLBACK_STYLES[0].key);
  const [selDisplay, setSelDisplay] = useState(FALLBACK_STYLES[0].display);
  const [faceFile, setFaceFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    getHairStyles()
      .then((data) => {
        const avail = (data.styles ?? []).filter((s) => s.available);
        if (avail.length > 0) {
          setStyles(avail);
          setSelStyle(avail[0].key);
          setSelDisplay(avail[0].display);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFaceFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setStatus(null);
  };

  const handleStyleChange = (key) => {
    setSelStyle(key);
    setSelDisplay(styles.find((s) => s.key === key)?.display ?? key);
  };

  const generate = async () => {
    if (!faceFile) {
      setStatus({ text: '❌ Upload your photo first!', ok: false });
      return;
    }
    setLoading(true);
    setStatus({ text: '✨ Generating... (~30 secs)', ok: true });
    setResult(null);
    try {
      const data = await generateHairImage(faceFile, selStyle);
      if (data.error) throw new Error(data.error);
      if (!data.result_image) throw new Error('No image returned from server');
      setResult(`data:image/png;base64,${data.result_image}`);
      setStatus({ text: `✅ Done!  Style: ${selDisplay}`, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setStatus({ text: `❌ Error: ${msg}`, ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-10">
        <header className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E8E4DE] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">
            ✨ AI Hairstyle Generator
          </span>
          <h1 className="text-3xl md:text-5xl font-serif text-[#2C2C2C]">Try a new look in seconds</h1>
          <p className="text-base md:text-lg text-[#6B6B6B]">
            Upload your selfie, pick a style, and see your transformed hairstyle instantly.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-sm space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">Step 1: Your Selfie</span>
                <span className="text-xs text-[#6B6B6B]">JPG · PNG · WEBP</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="sr-only" />
              <div
                className={`group flex min-h-[240px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed transition ${
                  preview
                    ? 'border-[#C8A8A8] bg-[#FAF8F5]'
                    : 'border-[#E5E0D8] bg-[#FAF8F5] hover:border-[#8B5A5A]'
                }`}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="text-3xl">📁</div>
                    <div className="text-sm font-semibold text-[#2C2C2C]">Click to upload photo</div>
                    <div className="text-xs text-[#6B6B6B]">Front-facing, good lighting</div>
                  </div>
                )}
              </div>
              {preview && (
                <button
                  className="w-full rounded-full border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#2C2C2C] hover:border-[#8B5A5A]"
                  onClick={() => fileRef.current?.click()}
                >
                  🔄 Change Photo
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">Step 2: Choose Hairstyle</span>
                <span className="text-xs text-[#6B6B6B]">{styles.length} styles available</span>
              </div>
              <select
                className="w-full rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]/30"
                value={selStyle}
                onChange={(e) => handleStyleChange(e.target.value)}
              >
                {styles.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.display}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="w-full rounded-full bg-gradient-to-r from-[#8B5A5A] to-[#A67676] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
              onClick={generate}
              disabled={loading || !faceFile}
            >
              {loading ? '⏳ Processing...' : '✨ Generate!'}
            </button>

            {status && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  status.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {status.text}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-sm space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">✨ Your New Look</span>
              <div
                className={`flex min-h-[240px] items-center justify-center overflow-hidden rounded-2xl border border-dashed ${
                  result ? 'border-[#C8A8A8] bg-[#FAF8F5]' : 'border-[#E5E0D8] bg-[#FAF8F5]'
                }`}
              >
                {result ? (
                  <img src={result} alt="Generated hairstyle" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="text-3xl">🤖</div>
                    <div className="text-sm font-semibold text-[#2C2C2C]">Result will appear here</div>
                    <div className="text-xs text-[#6B6B6B]">Generate a style to preview</div>
                  </div>
                )}
              </div>
            </div>

            {result && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#E5E0D8] bg-[#FAF8F5] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">Style Used</div>
                  <div className="mt-3 flex items-center gap-3">
                    {preview && <img src={preview} alt="original" className="h-12 w-12 rounded-xl object-cover" />}
                    <span className="text-sm font-semibold text-[#2C2C2C]">{selDisplay}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#E5E0D8] bg-[#FAF8F5] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">Status</div>
                  <p className="mt-2 text-sm text-[#6B6B6B]">{status?.text || 'Ready'}</p>
                  <a
                    href={result}
                    download="hairstyle.png"
                    className="mt-3 inline-flex items-center justify-center rounded-full bg-[#2C2C2C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    💾 Download
                  </a>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};
