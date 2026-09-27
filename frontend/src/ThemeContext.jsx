// ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    name: 'light',
    background: 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50',
    cardBg: 'bg-white/80',
    text: 'text-gray-800',
    subtext: 'text-gray-600',
    primary: 'from-blue-500 to-purple-500',
    secondary: 'from-purple-500 to-pink-500',
    border: 'border-gray-200'
  },
  dark: {
    name: 'dark',
    background: 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900',
    cardBg: 'bg-gray-800/80',
    text: 'text-gray-100',
    subtext: 'text-gray-300',
    primary: 'from-blue-400 to-purple-400',
    secondary: 'from-purple-400 to-pink-400',
    border: 'border-gray-700'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved && themes[saved] ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// ThemeSwitcher.jsx
export const ThemeSwitcher = () => {
  const { currentTheme, setCurrentTheme, themes } = useTheme();
  
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
        <div className="flex gap-2">
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => setCurrentTheme(key)}
              className={`w-8 h-8 rounded-full transition-transform ${
                currentTheme === key ? 'scale-110 ring-2 ring-blue-500' : ''
              } ${theme.background}`}
              title={`${key.charAt(0).toUpperCase() + key.slice(1)} theme`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};