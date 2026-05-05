export const ImagePreview = ({ preview, alt = 'Uploaded image' }) => {
  if (!preview) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E0D8] bg-[#FAF8F5] p-6 text-center">
        <span className="text-5xl">🖼️</span>
        <span className="text-sm font-semibold text-[#2C2C2C]">No image selected</span>
        <span className="text-xs text-[#6B6B6B]">Upload an image to get started</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E0D8] bg-white">
      <img src={preview} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
};
