import React, { useState, useEffect } from 'react';

export default function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'default');

  useEffect(() => {
    // Apply theme to the <html> tag so index.css can pick it up
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  // Updated Theme List
  const themes = [
    { id: 'default', name: 'Default', color: '#27ae60' },
    { id: 'coffee', name: 'Coffee Roast', color: '#6F4E37' },
    { id: 'nintendo', name: 'Family Computer', color: '#e4000f' },
  ];

  return (
    <>
      {/* 1. Floating Paint Icon */}
      <button className="theme-fab" onClick={() => setIsOpen(true)} title="Change Theme">
        🎨
      </button>

      {/* 2. Glassmorphism Popup */}
      {isOpen && (
        <div className="theme-overlay" onClick={() => setIsOpen(false)}>
          <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Select Theme</h3>
            <div className="theme-grid">
              {themes.map((t) => (
                <div 
                  key={t.id} 
                  className={`theme-option ${currentTheme === t.id ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentTheme(t.id);
                    // Optional: Close on select
                    // setIsOpen(false); 
                  }}
                >
                  <div className="color-preview" style={{ background: t.color }}></div>
                  <span style={{ color: 'var(--text-main)', fontSize: '14px' }}>{t.name}</span>
                </div>
              ))}
            </div>
            <button className="close-theme-btn" onClick={() => setIsOpen(false)}>DONE</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .theme-fab {
          position: fixed; bottom: 25px; right: 25px;
          width: 55px; height: 55px; border-radius: 50%;
          background: var(--primary-color); color: white;
          border: 2px solid white; cursor: pointer; font-size: 22px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.3); z-index: 9999;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex; align-items: center; justify-content: center;
        }
        .theme-fab:hover { transform: scale(1.1) rotate(15deg); }

        .theme-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.4); 
          backdrop-filter: blur(12px); /* Glassmorphism effect */
          -webkit-backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center; z-index: 10000;
          animation: fadeIn 0.3s ease;
        }

        .theme-modal {
          background: var(--card-bg); 
          padding: 30px; border-radius: 20px;
          width: 320px; text-align: center; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .theme-grid { display: grid; gap: 12px; margin-top: 20px; }
        
        .theme-option { 
          display: flex; align-items: center; gap: 15px; 
          padding: 12px; border-radius: 12px; cursor: pointer; 
          border: 1px solid rgba(128,128,128,0.2);
          transition: 0.2s;
          background: rgba(128,128,128,0.05);
        }
        
        .theme-option:hover { background: rgba(128,128,128,0.1); }
        
        .theme-option.active { 
          border-color: var(--primary-color); 
          background: rgba(39, 174, 96, 0.1); 
          box-shadow: 0 0 10px rgba(39, 174, 96, 0.2);
        }
        
        .color-preview { width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; }
        
        .close-theme-btn { 
          margin-top: 25px; 
          background: var(--primary-color); 
          color: white;
          border: none; 
          padding: 10px 30px; 
          border-radius: 8px; 
          cursor: pointer; 
          font-weight: bold;
          width: 100%;
          transition: 0.3s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </>
  );
}