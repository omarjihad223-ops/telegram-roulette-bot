import React from 'react';
import { haptic } from '../hooks/useTelegramWebApp';

export type TabKey = 'home' | 'tasks' | 'wheel' | 'inventory' | 'history' | 'store';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'الرئيسية', icon: '🏠' },
  { key: 'tasks', label: 'المهام', icon: '🎯' },
  { key: 'wheel', label: 'الدوران', icon: '🎡' },
  { key: 'inventory', label: 'المخزون', icon: '🎒' },
  { key: 'history', label: 'السجل', icon: '📜' },
];

export function BottomNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`nav-item ${active === tab.key ? 'active' : ''}`}
          onClick={() => {
            haptic('light');
            onChange(tab.key);
          }}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
