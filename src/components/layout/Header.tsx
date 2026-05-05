import React from 'react';
import { Search, Plus, Moon, Sun, Menu, Settings, Upload, CheckSquare, LogOut, Lock, GripVertical, Edit3 } from 'lucide-react';
import { useConfigContext } from '../../contexts/ConfigContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useLinksContext } from '../../contexts/LinksContext';
import MastodonTicker from '../../../components/MastodonTicker';
import WeatherDisplay from '../../../components/WeatherDisplay';
import { useState, useRef, useEffect } from 'react';

// Search Engine Icons
const ENGINE_ICONS: Record<string, string> = {
  google: 'https://www.google.com/favicon.ico',
  bing: 'https://www.bing.com/favicon.ico',
  baidu: 'https://www.baidu.com/favicon.ico',
  duckduckgo: 'https://duckduckgo.com/favicon.ico',
  yandex: 'https://yandex.com/favicon.ico',
  so: 'https://www.so.com/favicon.ico',
  custom: '', // Default to a globe or similar
};

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isInternal: boolean;
  onInternalChange: (val: boolean) => void;
  onSearch: (q: string) => void;
  onAddLink: () => void;
  onOpenSettings: () => void;
  onOpenImport: () => void;
  onOpenAuth: () => void;
  onToggleSidebar: () => void;
  isBatchEditMode: boolean;
  onToggleBatchEditMode: () => void;
  isMobileSearchOpen: boolean;
  onToggleMobileSearch: () => void;
  isDragSortMode: boolean;
  onToggleDragSortMode: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

export function Header({
  searchQuery, onSearchChange, isInternal, onInternalChange, onSearch, onAddLink, onOpenSettings,
  onOpenImport, onOpenAuth, onToggleSidebar, isBatchEditMode, onToggleBatchEditMode,
  isMobileSearchOpen, onToggleMobileSearch,
  isDragSortMode, onToggleDragSortMode,
  isEditMode, onToggleEditMode,
}: HeaderProps) {
  const { ai, darkMode, setDarkMode, viewMode, setViewMode, ticker, weather } = useConfigContext();
  const { authToken, logout } = useAuthContext();
  const { syncStatus } = useLinksContext();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-800/95 md:bg-white/80 md:dark:bg-slate-800/50 md:backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
      <div className="relative flex items-center justify-between px-4 lg:px-8 h-16">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
          <h1 className={`${isMobileSearchOpen ? 'hidden' : 'hidden sm:block'} text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent shrink-0`}>
            {ai?.navigationName || '蜗牛个人导航'}
          </h1>
        </div>

        {/* Mobile Search Bar - Expands to fill space */}
        {isMobileSearchOpen && (
          <div className="flex-1 flex items-center gap-2 md:hidden ml-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                autoFocus
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch(searchQuery)}
                placeholder={isInternal ? "搜索站内链接，点击图标（彩色时）搜索互联网" : "搜索互联网，点击图标（灰色时）站内搜索"}
                className="w-full pl-9 pr-4 py-2 h-[36px] rounded-full bg-slate-200 dark:bg-slate-700 border-none text-xs focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-slate-400 outline-none transition-all leading-none"
                style={{ fontSize: '16px' }}
                inputMode="search"
                enterKeyHint="search"
              />
            </div>
            <label className="flex items-center gap-1 cursor-pointer select-none shrink-0">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => onInternalChange(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-7 h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform peer-checked:translate-x-3.5"></div>
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">站内</span>
            </label>
            <button onClick={onToggleMobileSearch} className="p-1 text-slate-500 text-xs whitespace-nowrap">
              取消
            </button>
          </div>
        )}

        {/* Middle: Spacer */}
        <div className={`${isMobileSearchOpen ? 'hidden md:flex' : 'flex-1'}`} />

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Desktop Search Bar - Expandable */}
          <div className="hidden md:flex items-center gap-2 relative">
            <HeaderSearch
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              isInternal={isInternal}
              onInternalChange={onInternalChange}
              onSearch={onSearch}
            />
          </div>

          {/* Mastodon ticker - Back to original position */}
          <div className="hidden md:flex items-center shrink-0 max-w-[440px] lg:max-w-[560px]">
            <MastodonTicker config={ticker} />
          </div>

          {/* Mobile search toggle */}
          {!isMobileSearchOpen && (
            <button onClick={onToggleMobileSearch} className="md:hidden p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
              <Search size={18} />
            </button>
          )}

          {/* Weather display */}
          <div className="shrink-0">
            <WeatherDisplay config={weather} />
          </div>

          {/* Sync status indicator */}
          {syncStatus === 'saving' && <span className="text-xs text-blue-500 hidden sm:inline">同步中...</span>}
          {syncStatus === 'saved' && <span className="text-xs text-green-500 hidden sm:inline">已保存</span>}
          {syncStatus === 'error' && <span className="text-xs text-red-500 hidden sm:inline">同步失败</span>}

          {/* View mode toggle */}
          <div 
            className={`${isMobileSearchOpen ? 'hidden' : 'flex'} items-center bg-slate-200 dark:bg-slate-700 rounded-full h-[36px] shrink-0 border border-slate-300/50 p-0.5`}
            style={darkMode ? { border: 'none' } : {}}
          >
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-2 text-xs font-medium rounded-full transition-all flex items-center justify-center h-full min-w-[40px] leading-none cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
              style={darkMode && viewMode === 'compact' ? { border: 'none' } : {}}
              title="简约版视图"
            >简约</button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-2 text-xs font-medium rounded-full transition-all flex items-center justify-center h-full min-w-[40px] leading-none cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
              style={darkMode && viewMode === 'detailed' ? { border: 'none' } : {}}
              title="详情版视图"
            >详情</button>
          </div>

          {/* Theme toggle */}
          <button onClick={() => setDarkMode(!darkMode)} className={`${isMobileSearchOpen ? 'hidden' : 'flex'} items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 h-[36px] min-w-[36px] cursor-pointer`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {authToken ? (
            <>
              {/* Settings */}
              <button
                onClick={onOpenSettings}
                className={`${isMobileSearchOpen ? 'hidden' : 'flex'} lg:flex items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 h-[36px] min-w-[36px] cursor-pointer`}
                title="设置"
              >
                <Settings size={18} />
              </button>

              {/* Add link */}
              <button onClick={onAddLink} className={`${isMobileSearchOpen ? 'hidden' : 'flex'} lg:flex items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 h-[36px] min-w-[36px] cursor-pointer`} title="添加链接">
                <Plus size={18} />
              </button>

              {/* Drag sort toggle */}
              <button
                onClick={onToggleDragSortMode}
                className={`${isMobileSearchOpen ? 'hidden' : 'flex'} lg:flex items-center justify-center p-2 rounded-full h-[36px] min-w-[36px] cursor-pointer transition-colors ${
                  isDragSortMode
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={isDragSortMode ? '退出拖动排序' : '拖动排序'}
              >
                <GripVertical size={18} />
              </button>

              {/* Edit mode toggle */}
              <button
                onClick={onToggleEditMode}
                className={`${isMobileSearchOpen ? 'hidden' : 'flex'} lg:flex items-center justify-center p-2 rounded-full h-[36px] min-w-[36px] cursor-pointer transition-colors ${
                  isEditMode
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={isEditMode ? '退出编辑卡片' : '编辑卡片'}
              >
                <Edit3 size={18} />
              </button>

              {/* Batch edit */}
              <button onClick={onToggleBatchEditMode} className={`${isMobileSearchOpen ? 'hidden' : 'flex'} lg:flex items-center justify-center p-2 rounded-full h-[36px] min-w-[36px] cursor-pointer ${isBatchEditMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`} title="批量编辑">
                <CheckSquare size={18} />
              </button>

              {/* Logout */}
              <button onClick={logout} className={`${isMobileSearchOpen ? 'hidden' : 'flex'} lg:flex items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 h-[36px] min-w-[36px] cursor-pointer`} title="退出登录">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className={`${isMobileSearchOpen ? 'hidden' : 'flex'} lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer`}
              title="登录"
            >
              <Lock size={14} />
              <span>登录</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// Sub-component for the expandable desktop search
function HeaderSearch({ 
  searchQuery, onSearchChange, isInternal, onInternalChange, onSearch 
}: { 
  searchQuery: string; 
  onSearchChange: (q: string) => void; 
  isInternal: boolean; 
  onInternalChange: (val: boolean) => void;
  onSearch: (q: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { search } = useConfigContext();

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setIsExpanded(false);
    onSearchChange('');
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const engine = search?.defaultEngine || 'google';
  const engineIcon = ENGINE_ICONS[engine] || '🌐';

  return (
    <div ref={containerRef} className="flex items-center justify-end">
      {!isExpanded ? (
        <button
          onClick={handleExpand}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all cursor-pointer"
        >
          <Search size={18} />
        </button>
      ) : (
        <div className="flex items-center bg-slate-200 dark:bg-slate-700 rounded-full h-9 px-3 animate-in fade-in zoom-in duration-200 md:w-64 lg:w-80 xl:w-96 shadow-sm border border-slate-200 dark:border-slate-600">
          {/* Engine Icon - Click to toggle mode */}
          <button
            onClick={() => onInternalChange(!isInternal)}
            className="shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform mr-2"
            title={isInternal ? "切换到互联网搜索" : "切换到站内搜索"}
          >
            {engineIcon ? (
              <img 
                src={engineIcon} 
                alt={engine} 
                className={`w-4 h-4 transition-all ${isInternal ? 'grayscale opacity-50' : 'grayscale-0 opacity-100'}`} 
              />
            ) : (
              <span className={`text-xs ${isInternal ? 'grayscale opacity-50' : ''}`}>🌐</span>
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch(searchQuery)}
            placeholder={isInternal ? "搜索站内链接，点击图标（彩色时）搜索互联网" : "搜索互联网，点击图标（灰色时）站内搜索"}
            className="flex-1 bg-transparent border-none text-xs focus:ring-0 dark:text-white placeholder-slate-400 outline-none h-full"
          />

          <Search size={16} className="text-slate-400 shrink-0 ml-2" />
        </div>
      )}
    </div>
  );
}
