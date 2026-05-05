import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { UploadPage } from './pages/Upload';
import { ChatPage } from './pages/Chat';
import { AnalyticsPage } from './pages/Analytics';
import { MeasurementsPage } from './pages/Measurements';
import SizeMatching from './pages/SizeMatching';
import { AdminPage } from './pages/AdminPage';
import { WardrobeProvider } from './context/WardrobeContext';
import { WardrobePage }  from './pages/AccWardrobe';
import { DiscoverPage }  from './pages/AccDiscover';
import { AccAnalyticsPage } from './pages/AccAnalytics';
import { SkinAnalysis }  from './pages/SkinAnalysis';
import { HairGeneration } from './components/HairGeneration';
import { NailCare }      from './components/NailCare';
import { DentalHygiene } from './components/DentalHygiene';

function App() {
  return (
    <WardrobeProvider>
    <Router>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        
        <Route path="/measurements" element={<MeasurementsPage />} />
        <Route path="/size-matching" element={<SizeMatching />} />
        <Route path="/admin" element={<AdminPage />} />

          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/wardrobe"  element={<WardrobePage />} />
          <Route path="/accanalytics" element={<AccAnalyticsPage />} />

          <Route path="/grooming"        element={<SkinAnalysis />} />
          <Route path="/hair-generation" element={<HairGeneration />} />
          <Route path="/nail-care"       element={<NailCare />} />
          <Route path="/dental-hygiene"  element={<DentalHygiene />} />
      </Routes>
    </Router>
    </WardrobeProvider>
  );
}

export default App;