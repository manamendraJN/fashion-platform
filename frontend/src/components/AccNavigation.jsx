import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Sparkles, Archive, Compass, Heart, BarChart2 } from 'lucide-react';

const NAV = [
  { path: '/discover',          label: 'Discover',  icon: Compass  },
  { path: '/wardrobe',  label: 'Wardrobe',  icon: Archive  },
  { path: '/accanalytics', label: 'Analytics', icon: BarChart2},
];

export function Navigation() {
  const { pathname } = useLocation();
  return (
    <nav className="sticky top-0 z-50 w-full bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-[#2C2C2C] p-2 rounded-full">
              <Sparkles className="h-4 w-4 text-[#FAF8F5]" />
            </div>
            <span className="font-serif text-xl font-semibold text-[#2C2C2C]">
              Aura<span className="text-[#8B5A5A]">Style</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-1">
            {NAV.map(({ path, label, icon: Icon }) => {
              const active = pathname === path || (path !== '/' && pathname.startsWith(path));
              return (
                <Link key={path} to={path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-[#2C2C2C] text-white shadow-sm'
                      : 'text-[#6B6B6B] hover:text-[#2C2C2C] hover:bg-[#E8E4DE]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}