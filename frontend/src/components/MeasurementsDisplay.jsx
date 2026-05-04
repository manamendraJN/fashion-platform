import React from 'react';
import { Ruler } from 'lucide-react';

const MeasurementsDisplay = ({ measurements }) => {
  if (!measurements) return null;

  const measurementEntries = Object.entries(measurements);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-[#8B5A5A] p-2.5 rounded-lg">
          <Ruler className="w-5 h-5 text-white" />
        </div>
        <h2 className="font-serif text-2xl text-[#2C2C2C]">
          Body Measurements
        </h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {measurementEntries.map(([key, data]) => (
          <div 
            key={key} 
            className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E5E5E5] hover:border-[#8B5A5A] hover:shadow-sm transition-all"
          >
            <p className="text-xs text-[#8B5A5A] uppercase tracking-wide font-medium mb-1.5">
              {key.replace(/-/g, ' ')}
            </p>
            <p className="text-2xl font-bold text-[#2C2C2C]">
              {data.display || `${data.value?.toFixed(1)} cm`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeasurementsDisplay;