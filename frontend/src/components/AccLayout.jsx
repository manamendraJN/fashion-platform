import React from 'react';
import { Navigation } from './AccNavigation';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C2C2C]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}