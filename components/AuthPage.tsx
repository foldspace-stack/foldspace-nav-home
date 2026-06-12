import React, { useState } from 'react';
import { ArrowRight, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react';

interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onBootstrap: (username: string, password: string) => Promise<boolean>;
  hasBootstrap: boolean;
  errorMessage?: string | null;
}

function FeaturePill({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-slate-100">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
      {label}
    </div>
  );
}

export default function AuthPage({ onLogin, onBootstrap, hasBootstrap, errorMessage }: AuthPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username || !password || isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      const success = hasBootstrap
        ? await onBootstrap(username, password)
        : await onLogin(username, password);

      if (!success) {
        setError(errorMessage || '密码错误或无法连接服务器');
      }
    } catch {
      setError(errorMessage || '登录请求失败，请检查网络');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_26%),linear-gradient(180deg,#0f172a_0%,#111827_42%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-35 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex items-center gap-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/20 backdrop-blur">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Foldspace</p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">组织导航首页</h1>
              </div>
            </div>

            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              登录后才能查看你的链接、分类和常用站点。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <FeaturePill label="站内链接过滤" />
              <FeaturePill label="紧凑卡片布局" />
              <FeaturePill label="受限访问" />
            </div>

            <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <ShieldCheck size={16} className="text-cyan-300" />
                  首页受限
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  认证后才会加载导航内容和管理操作。
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <Lock size={16} className="text-cyan-300" />
                  安全入口
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  使用现有会话登录，不开放匿名浏览。
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
              <div className="mb-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/20">
                  <Lock size={22} />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {hasBootstrap ? '创建第一个管理员' : '登录进入首页'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {hasBootstrap ? '先创建管理员账号。' : '输入账号和密码继续。'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">用户名</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="输入用户名"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="输入密码"
                  />
                </div>

                {(error || errorMessage) && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error || errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || !username || !password}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                  {hasBootstrap ? '创建并进入' : '登录进入'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
