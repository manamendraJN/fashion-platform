import { useRef, useState } from 'react';

export const UploadCard = ({ onImageSelect, loading }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const processFile = (file) => {
    if (!file) return;
    setProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 8;
      setProgress(Math.min(current, 100));
      if (current >= 100) clearInterval(interval);
    }, 80);
    onImageSelect(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const rootClassName = [
    'group relative w-full rounded-3xl border border-dashed bg-white p-6 text-center transition-all',
    'border-[#D8CEC4] hover:border-[#8B5A5A] hover:shadow-md',
    isDragging ? 'border-[#8B5A5A] bg-[#F7F1EB]' : '',
    loading ? 'cursor-wait opacity-95' : 'cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClassName}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !loading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={loading}
        style={{ display: 'none' }}
      />

      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" stroke="#E5E0D8" strokeWidth="4" fill="none" />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="#8B5A5A"
                strokeWidth="4"
                fill="none"
                strokeDasharray="163.36"
                strokeDashoffset={163.36 - (163.36 * progress) / 100}
                strokeLinecap="round"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                  transition: 'stroke-dashoffset 0.1s linear',
                }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#8B5A5A]">
              {progress}%
            </span>
          </div>
          <div>
            <h3 className="text-lg font-serif text-[#2C2C2C]">Analyzing Image</h3>
            <p className="text-sm text-[#6B6B6B]">Extracting skin features…</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0EBE4] text-2xl">
            🔬
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-serif text-[#2C2C2C]">
              {isDragging ? 'Drop your image here' : 'Upload your skin photo'}
            </h3>
            <p className="text-sm text-[#6B6B6B]">
              Drag &amp; drop a face photo here, or click to browse.
              <br />
              JPG, PNG, or WEBP — the AI will do the rest.
            </p>
          </div>
          <button
            className="rounded-full bg-[#2C2C2C] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-black"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            type="button"
          >
            📁 Choose Image
          </button>

          <div className="flex flex-wrap justify-center gap-2 text-[11px] text-[#6B6B6B]">
            {[
              { label: 'Phase 1', desc: 'Skin Tone Detection' },
              { label: 'Phase 2', desc: 'Color Analysis' },
              { label: 'Phase 3', desc: 'Blackhead Scan' },
            ].map((phase) => (
              <div key={phase.label} className="rounded-full border border-[#E5E0D8] bg-white px-3 py-1">
                <span className="font-semibold text-[#2C2C2C]">{phase.label}:</span> {phase.desc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
