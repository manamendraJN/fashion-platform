import React from 'react';
import { Navigation } from './Navigation';
import { motion } from 'framer-motion';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C2C2C]">
      <Navigation />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
