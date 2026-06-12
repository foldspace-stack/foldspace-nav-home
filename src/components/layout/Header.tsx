import React from 'react';
import { Search, Plus, Moon, Sun, Menu, Settings, Upload, CheckSquare, LogOut, UserRound, ChevronDown, GripVertical, Edit3, ChevronLeft, Layers, ShieldCheck } from 'lucide-react';
import { useConfigContext } from '../../contexts/ConfigContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useLinksContext } from '../../contexts/LinksContext';
import MastodonTicker from '../../../components/MastodonTicker';
import WeatherDisplay from '../../../components/WeatherDisplay';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearch: (q: string) => void;
  onAddLink: () => void;
  onOpenSettings: () => void;
  onOpenCatManager: () => void;
  onOpenBackup: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
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
  searchQuery, onSearchChange, onSearch, onAddLink, onOpenSettings,
  onOpenCatManager, onOpenBackup,
  onOpenAuth, onOpenProfile, onToggleSidebar, isBatchEditMode, onToggleBatchEditMode,
  isMobileSearchOpen, onToggleMobileSearch,
  isDragSortMode, onToggleDragSortMode,
  isEditMode, onToggleEditMode,
}: HeaderProps) {
  const { ai, darkMode, setDarkMode, viewMode, setViewMode, ticker, weather } = useConfigContext();
  const { authToken, user, logout } = useAuthContext();
  const { syncStatus } = useLinksContext();
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // 每次登录状态改变（登录或退出）时，重置工具栏为折叠状态
  useEffect(() => {
    setIsToolsExpanded(false);
  }, [authToken]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-800/95 md:bg-white/80 md:dark:bg-slate-800/50 md:backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
      <div className="relative flex items-center justify-between px-4 lg:px-8 h-16">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
          <h1 className={`${isMobileSearchOpen ? 'hidden' : 'hidden sm:block'} text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent shrink-0`}>
            {ai?.navigationName || 'foldspace 组织导航'}
          </h1>
        </div>

        {/* Mobile Search Bar - Expands to fill space */}
        {isMobileSearchOpen && (
          <div className="flex-1 flex items-center gap-2 md:hidden ml-2">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center h-full text-slate-400 pointer-events-none">
                <Search size={16} />
              </div>
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                autoFocus
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch(searchQuery)}
                placeholder="搜索当前所有链接"
                className="w-full pl-9 pr-4 py-2 h-[36px] rounded-full bg-slate-200 dark:bg-slate-700 border-none text-xs focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-slate-400 outline-none transition-all leading-none"
                style={{ fontSize: '16px' }}
                inputMode="search"
                enterKeyHint="search"
              />
            </div>
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
              onSearch={onSearch}
              isExpanded={isSearchExpanded}
              setIsExpanded={setIsSearchExpanded}
            />
          </div>

          {/* Mastodon ticker - Back to original position */}
          <div className={`hidden md:flex items-center shrink-0 transition-all duration-300 ${isSearchExpanded ? 'max-w-[40px]' : 'max-w-[440px] lg:max-w-[560px] flex-1'}`}>
            <MastodonTicker config={ticker} isCollapsed={isSearchExpanded} />
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

          {/* GitHub link */}
          <a
            href="https://github.com/cloudflare/vinext"
            target="_blank"
            rel="noopener noreferrer"
            className={`${isMobileSearchOpen ? 'hidden' : 'flex'} items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 h-[36px] min-w-[36px] transition-colors`}
            title="Favorite on GitHub"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          </a>

          {/* Sync status indicator */}
          {authToken && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-full border border-slate-200 dark:border-slate-600/50">
              <div className="flex items-center gap-1">
                {syncStatus === 'saving' ? (
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                ) : syncStatus === 'error' ? (
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                )}
                <span className={`text-[10px] font-medium ${
                  syncStatus === 'saving' ? 'text-blue-500' :
                  syncStatus === 'error' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {syncStatus === 'saving' ? '同步中' :
                   syncStatus === 'error' ? '同步失败' : '已同步'}
                </span>
              </div>
            </div>
          )}

          {authToken ? (
            <div className={`${isMobileSearchOpen ? 'hidden' : 'flex'} items-center gap-1`}>
              {/* Add link - Always visible as primary action */}
              <button onClick={onAddLink} className="flex items-center justify-center p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-[36px] min-w-[36px] cursor-pointer" title="添加链接">
                <Plus size={20} />
              </button>

              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1" />

              {/* Collapsible Tools Area */}
              <div 
                className={`flex items-center gap-1 transition-all duration-500 ease-in-out overflow-hidden ${
                  isToolsExpanded ? 'max-w-[400px] opacity-100' : 'max-w-0 opacity-0'
                }`}
              >
                <div className="flex items-center gap-1 pr-1">
                  {/* Settings */}
                  <button
                    onClick={onOpenSettings}
                    className="flex items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 h-[36px] min-w-[36px] cursor-pointer"
                    title="系统设置"
                  >
                    <Settings size={18} />
                  </button>

                  {/* Manage Categories */}
                  <button
                    onClick={onOpenCatManager}
                    className="flex items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 h-[36px] min-w-[36px] cursor-pointer"
                    title="分类管理"
                  >
                    <Layers size={18} />
                  </button>

                  {/* Backup/Restore */}
                  <button
                    onClick={onOpenBackup}
                    className="flex items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 h-[36px] min-w-[36px] cursor-pointer"
                    title="备份恢复"
                  >
                    <Upload size={18} />
                  </button>

                  {/* Drag sort toggle */}
                  <button
                    onClick={onToggleDragSortMode}
                    className={`flex items-center justify-center p-2 rounded-full h-[36px] min-w-[36px] cursor-pointer transition-colors ${
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
                    className={`flex items-center justify-center p-2 rounded-full h-[36px] min-w-[36px] cursor-pointer transition-colors ${
                      isEditMode
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    title={isEditMode ? '退出编辑卡片' : '编辑卡片'}
                  >
                    <Edit3 size={18} />
                  </button>

                  {/* Batch edit */}
                  <button onClick={onToggleBatchEditMode} className={`flex items-center justify-center p-2 rounded-full h-[36px] min-w-[36px] cursor-pointer ${isBatchEditMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`} title="批量编辑">
                    <CheckSquare size={18} />
                  </button>
                </div>
              </div>

              {/* Profile */}
              <button
                onClick={onOpenProfile}
                className={`${isMobileSearchOpen ? 'hidden' : 'flex'} items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700`}
                title="个人设置"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm">
                  <UserRound size={16} />
                </div>
                <div className="hidden sm:flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {user?.displayName || user?.username || '个人'}
                  </span>
                  <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {user?.username ? `@${user.username}` : '账户菜单'}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Logout */}
              <button onClick={logout} className="flex items-center justify-center p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 h-[36px] min-w-[36px] cursor-pointer" title="退出登录">
                <LogOut size={18} />
              </button>

              {/* Toggle Button */}
              <button 
                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                className={`flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ${isToolsExpanded ? 'rotate-180' : 'rotate-0'}`}
                title={isToolsExpanded ? "折叠工具栏" : "展开工具栏"}
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className={`${isMobileSearchOpen ? 'hidden' : 'flex'} lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer`}
              title="登录"
            >
              <ShieldCheck size={14} />
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
  searchQuery, onSearchChange, onSearch,
  isExpanded, setIsExpanded
}: { 
  searchQuery: string; 
  onSearchChange: (q: string) => void; 
  onSearch: (q: string) => void;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        <div className="flex items-center bg-slate-200 dark:bg-slate-700 rounded-full h-9 px-3 animate-in fade-in zoom-in duration-200 w-48 sm:w-64 lg:w-72 xl:w-80 shadow-sm border border-slate-200 dark:border-slate-600">
          <Search size={16} className="text-slate-400 shrink-0 mr-2" />

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch(searchQuery)}
            placeholder="搜索当前所有链接"
            className="flex-1 bg-transparent border-none text-xs focus:ring-0 dark:text-white placeholder-slate-400 outline-none h-full"
          />
        </div>
      )}
    </div>
  );
}
