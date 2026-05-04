import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export function WardrobeUpload({ onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles.length) return;

      setIsUploading(true);
      setProgress(0);
      setTotal(acceptedFiles.length);
      setCount(0);

      let done = 0;
      const results = [];

      for (const file of acceptedFiles) {
        const fd = new FormData();
        fd.append('image', file);

        try {
          const res = await fetch('http://localhost:5000/api/predict/clothing-type', {
            method: 'POST',
            body: fd,
          });
          const data = await res.json();
          results.push(data);
        } catch (e) {
          results.push({ success: false, error: e.message });
        }

        done++;
        setCount(done);
        setProgress(Math.round((done / acceptedFiles.length) * 100));
      }

      setIsUploading(false);
      setIsComplete(true);

      setTimeout(() => {
        onUploadComplete(results);
        setIsComplete(false);
        setProgress(0);
        setCount(0);
        setTotal(0);
      }, 1800);
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: true,
    disabled: isUploading,
    noClick: true,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-10 md:p-12 text-center transition-all duration-300 cursor-pointer overflow-hidden shadow-sm',
          isDragActive
            ? 'border-[#8B5A5A] bg-[#8B5A5A]/5 ring-2 ring-[#8B5A5A]/30'
            : 'border-[#E5E0D8] hover:border-[#8B5A5A]/50 hover:bg-white/50',
          isUploading && 'pointer-events-none bg-white/80'
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-6"
            >
              <div className="relative w-20 h-20 mb-5">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="36" stroke="#E5E0D8" strokeWidth="5" fill="none" />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#8B5A5A"
                    strokeWidth="5"
                    fill="none"
                    strokeDasharray="226.19"
                    strokeDashoffset={226.19 - (226.19 * progress) / 100}
                    className="transition-all duration-150 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {progress < 100 ? (
                    <Loader2 className="w-8 h-8 text-[#8B5A5A] animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  )}
                </div>
              </div>
              <h3 className="font-serif text-xl text-[#2C2C2C] mb-2">
                Processing {count}/{total}
              </h3>
              <p className="text-sm text-gray-600 max-w-md">
                Analyzing clothing features & generating style profile...
              </p>
              <p className="text-xs text-[#8B5A5A] mt-3 font-medium">{progress}% complete</p>
            </motion.div>
          ) : isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-6"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="font-serif text-2xl text-[#2C2C2C] mb-2">Success!</h3>
              <p className="text-base text-gray-600">
                {total} item{total !== 1 ? 's' : ''} added and analyzed
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-6"
            >
              <div className="w-20 h-20 bg-[#FAF8F5] rounded-full flex items-center justify-center mb-6 text-[#8B5A5A]">
                <Upload className="w-10 h-10" />
              </div>
              <h3 className="font-serif text-2xl text-[#2C2C2C] mb-3">
                {isDragActive ? 'Drop your clothes here' : 'Upload to Wardrobe'}
              </h3>
              <p className="text-base text-gray-600 max-w-lg mx-auto mb-8">
                Drag & drop clothing photos (or click below). Our AI will automatically detect type, color, style and suggest outfits.
              </p>
              <button
                onClick={open}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2C2C2C] hover:bg-black text-white font-medium rounded-full transition-all shadow-lg shadow-gray-200/50 active:scale-95"
              >
                <Plus className="w-5 h-5" /> Select Images
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Supports JPG, PNG, WEBP • Multiple files OK
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phase indicators */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        {['Visual Feature Extraction', 'Event Suitability Scoring', 'Personal Style Profile'].map((phase, i) => (
          <div
            key={phase}
            className="p-5 rounded-xl bg-white border border-[#E5E0D8] shadow-sm hover:shadow transition-shadow"
          >
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#8B5A5A]/10 flex items-center justify-center text-[#8B5A5A] font-bold">
              {i + 1}
            </div>
            <p className="text-sm font-medium text-[#2C2C2C]">{phase}</p>
          </div>
        ))}
      </div>
    </div>
  );
}