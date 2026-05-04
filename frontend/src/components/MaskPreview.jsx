import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const MaskPreview = ({ original, preview, mask, onAccept, onRetry }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          🎭 Body Mask Preview
        </h3>
        
        <p className="text-gray-600 mb-6">
          We've automatically removed the background and created a body silhouette. 
          Please review the mask before analysis.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Original</p>
            <img src={original} alt="Original" className="w-full rounded-lg border-2 border-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Preview (Overlay)</p>
            <img src={preview} alt="Preview" className="w-full rounded-lg border-2 border-green-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Final Mask</p>
            <img src={mask} alt="Mask" className="w-full rounded-lg border-2 border-blue-300" />
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Tips for best results:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Stand straight with arms slightly away from body</li>
                <li>Wear fitted clothing for accurate measurements</li>
                <li>Ensure good lighting and plain background</li>
                <li>Body should be clearly visible in the mask</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onRetry}
            className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition"
          >
            Try Different Image
          </button>
          <button
            onClick={onAccept}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Looks Good - Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaskPreview;