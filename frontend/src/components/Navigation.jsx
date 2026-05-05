import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Sparkles, Upload, MessageSquare, BarChart2, Ruler, Shirt, Database, Scissors, Gem } from 'lucide-react';

export function Navigation() {
  const location = useLocation();

  const groomingItems = [
    { path: '/grooming', label: 'Skin Analysis' },
    { path: '/hair-generation', label: 'Hair Generator' },
    { path: '/nail-care', label: 'Nail Care' },
    { path: '/dental-hygiene', label: 'Dental Hygiene' },
  ];

  const accessoryItems = [
    { path: '/discover', label: 'Discover' },
    { path: '/wardrobe', label: 'Wardrobe' },
    { path: '/accanalytics', label: 'Analytics' },
  ];

  const navItems = [
    { path: '/', label: 'Upload', icon: Upload },
    { path: '/chat', label: 'Assistant', icon: MessageSquare },
    { path: '/analytics', label: 'Analytics', icon: BarChart2 },
    { path: '/measurements', label: 'Measurements', icon: Ruler },
    { path: '/size-matching', label: 'Size Matching', icon: Shirt },
    { path: '/admin', label: 'Size Charts', icon: Database },
    { path: '/discover', label: 'Accessory', icon: Gem, children: accessoryItems },
    { path: '/grooming', label: 'Grooming', icon: Scissors, children: groomingItems },
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
              const isGroupActive = item.children?.some((child) => child.path === location.pathname);
              const Icon = item.icon;

              if (item.children) {
                return (
                  <div key={item.path} className="relative group">
                    <Link
                      to={item.path}
                      className={cn(
                        'relative flex items-center space-x-2 text-sm font-medium transition-colors duration-200',
                        isGroupActive ? 'text-[#8B5A5A]' : 'text-[#6B6B6B] hover:text-[#2C2C2C]'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isGroupActive && 'stroke-[2.5px]')} />
                      <span>{item.label}</span>

                      {isGroupActive && (
                        <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-[#8B5A5A] rounded-full" />
                      )}
                    </Link>

                    <div className="absolute left-0 top-full pt-4 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                      <div className="w-56 rounded-2xl border border-[#E5E0D8] bg-white p-3 shadow-lg">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0998F] px-2 pb-2">
                          {item.label} Tools
                        </div>
                        <div className="space-y-1">
                          {item.children.map((child) => {
                            const isChildActive = location.pathname === child.path;
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                className={cn(
                                  'flex items-center rounded-xl px-3 py-2 text-sm transition',
                                  isChildActive
                                    ? 'bg-[#F0EBE4] text-[#8B5A5A] font-medium'
                                    : 'text-[#6B6B6B] hover:bg-[#FAF8F5] hover:text-[#2C2C2C]'
                                )}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

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