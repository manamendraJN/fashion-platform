import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Sparkles, Upload, MessageSquare, BarChart2, Ruler, Shirt, Database } from 'lucide-react';

export function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Upload', icon: Upload },
    { path: '/chat', label: 'Assistant', icon: MessageSquare },
    { path: '/analytics', label: 'Analytics', icon: BarChart2 },
    { path: '/measurements', label: 'Measurements', icon: Ruler },
    { path: '/size-matching', label: 'Size Matching', icon: Shirt },
    { path: '/admin', label: 'Size Charts', icon: Database },
    { path: '/discover', label: 'Accessory', icon: Database },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#FAF8F5]/80 backdrop-blur-md border-b border-[#E5E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-[#2C2C2C] p-2 rounded-full">
              <Sparkles className="h-5 w-5 text-[#FAF8F5]" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight text-[#2C2C2C]">
              AURA <span className="text-[#8B5A5A]">Style</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative flex items-center space-x-2 text-sm font-medium transition-colors duration-200',
                    isActive ? 'text-[#8B5A5A]' : 'text-[#6B6B6B] hover:text-[#2C2C2C]'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive && 'stroke-[2.5px]')} />
                  <span>{item.label}</span>

                  {isActive && (
                    <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-[#8B5A5A] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}