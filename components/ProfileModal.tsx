import React, { useEffect, useState } from 'react';
import { Loader2, X, UserRound, KeyRound, ShieldCheck, BadgeInfo } from 'lucide-react';
import { toast } from './Toast';
import { API_ENDPOINTS } from '../src/constants';
import { readJsonResponse } from '../src/utils/http';

interface ProfileModalProps {
  isOpen: boolean;
  currentUsername: string;
  currentDisplayName?: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export default function ProfileModal({ isOpen, currentUsername, currentDisplayName, onClose, onSaved }: ProfileModalProps) {
  const [username, setUsername] = useState(currentUsername);
  const [displayName, setDisplayName] = useState(currentDisplayName || currentUsername);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setUsername(currentUsername);
    setDisplayName(currentDisplayName || currentUsername);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  }, [isOpen, currentUsername, currentDisplayName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const nextUsername = username.trim();
    const nextDisplayName = displayName.trim();
    const nextPassword = newPassword.trim();

    if (!nextUsername) {
      setError('用户名不能为空');
      return;
    }
    if (!nextDisplayName) {
      setError('显示名不能为空');
      return;
    }
    if (!currentPassword.trim()) {
      setError('请输入当前密码以确认修改');
      return;
    }
    if (nextPassword && nextPassword.length < 8) {
      setError('新密码至少 8 位');
      return;
    }
    if (nextPassword && nextPassword !== confirmPassword.trim()) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (nextUsername === currentUsername && nextDisplayName === (currentDisplayName || currentUsername) && !nextPassword) {
      setError('请至少修改用户名、显示名或密码中的一项');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_ENDPOINTS.USERS}/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: nextUsername,
          displayName: nextDisplayName,
          currentPassword: currentPassword.trim(),
          newPassword: nextPassword || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await readJsonResponse<Record<string, unknown>>(res);
        const message = [
          'PATCH /api/users/me',
          `HTTP ${res.status}`,
          typeof errData?.error === 'string' ? errData.error : null,
          typeof errData?.details === 'string' ? errData.details : null,
          typeof errData?.requestId === 'string' ? `requestId=${errData.requestId}` : null,
        ].filter(Boolean).join(' | ');
        setError(message || '保存失败');
        toast.error(message || '保存失败');
        return;
      }

      toast.success('个人信息已更新');
      onSaved();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      toast.error('保存失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <UserRound size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">个人设置</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">修改用户名和登录密码</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/15 dark:text-blue-200">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck size={16} />
              <span>当前账号</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-blue-600/90 dark:text-blue-100/90">
              <div>用户名: {currentUsername}</div>
              <div>显示名: {currentDisplayName || currentUsername}</div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">新用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="输入新的用户名"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">显示名</label>
            <div className="relative">
              <BadgeInfo size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="输入显示名"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">当前密码</label>
            <div className="relative">
              <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="输入当前密码确认"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="留空表示不修改"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="再次输入新密码"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/15 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              保存修改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
