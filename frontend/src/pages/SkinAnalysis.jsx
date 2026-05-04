import { useState } from 'react';
import { UploadCard } from '../components/UploadCard';
import { ImagePreview } from '../components/ImagePreview';
import { PredictionTable } from '../components/PredictionTable';
import { Layout } from '../components/Layout';
import { predictImage } from '../services/gapi';

export function SkinAnalysis() {
  const [state, setState] = useState({
    image: null, preview: null, loading: false, error: null, result: null,
  });

  const handleImageSelect = async (file) => {
    setState((prev) => ({ ...prev, image: file, preview: URL.createObjectURL(file), loading: true, error: null }));
    try {
      const result = await predictImage(file);
      setState((prev) => ({ ...prev, result, loading: false }));
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to get predictions', loading: false }));
    }
  };

  return (
    <Layout>
      <div className="space-y-10">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#E8E4DE] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B5A5A]">
              ✨ AI-Powered Analysis
            </span>
            <h1 className="text-3xl md:text-5xl font-serif text-[#2C2C2C] leading-tight">
              Analyze your skin.
              <br />
              <span className="text-[#8B5A5A] italic">Reveal your glow.</span>
            </h1>
            <p className="text-base md:text-lg text-[#6B6B6B] max-w-xl">
              Upload a clear face photo and let our dual-model AI instantly detect skin tone, color profile, and
              blackhead presence.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[#6B6B6B]">
              <span className="rounded-full border border-[#E5E0D8] bg-white px-3 py-1">Tone + Color + Blackhead</span>
              <span className="rounded-full border border-[#E5E0D8] bg-white px-3 py-1">Private by default</span>
              <span className="rounded-full border border-[#E5E0D8] bg-white px-3 py-1">Fast inference</span>
            </div>
          </div>
          <div className="rounded-3xl border border-[#E5E0D8] bg-white p-4 md:p-6 shadow-sm">
            <UploadCard onImageSelect={handleImageSelect} loading={state.loading} />
          </div>
        </section>

        {(state.preview || state.result) && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5 shadow-sm">
              <ImagePreview preview={state.preview} />
            </div>
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5 shadow-sm">
              <PredictionTable result={state.result} />
            </div>
          </section>
        )}

        {state.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            ❌ {state.error}
          </div>
        )}
      </div>
    </Layout>
  );
}