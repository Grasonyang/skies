'use client';

import React, { useEffect, useMemo, useState } from 'react';

type FeedbackEntry = {
  id: string;
  createdAt: string;
  activity: string;
  message: string;
  riskLevel: string;
};

interface FeedbackConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'aerosense-feedback';

const FeedbackConsole: React.FC<FeedbackConsoleProps> = ({ isOpen, onClose }) => {
  const [activity, setActivity] = useState('');
  const [message, setMessage] = useState('');
  const [riskLevel, setRiskLevel] = useState('caution');
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cache = window.localStorage.getItem(STORAGE_KEY);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        setEntries(parsed);
      } catch (error) {
        console.warn('無法解析 Feedback 快取', error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          count: entries.length,
          items: entries,
        },
        null,
        2
      ),
    [entries]
  );

  const submitFeedback = () => {
    if (!message.trim()) return;
    const payload: FeedbackEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      activity: activity || '未指定',
      message: message.trim(),
      riskLevel,
    };

    setEntries((prev) => [payload, ...prev]);
    setMessage('');
    setActivity('');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">💡 使用者回饋控制台</h3>
            <p className="text-sm text-slate-500">
              收集對指紋、HUD 與地圖的感受，資料保存於瀏覽器，可匯出 JSON。
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-full bg-slate-100 text-slate-500 text-sm"
          >
            關閉
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500">活動類型 / 組件</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="例如：晨跑 HUD 建議"
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">風險體感</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={riskLevel}
                onChange={(event) => setRiskLevel(event.target.value)}
              >
                <option value="safe">安全</option>
                <option value="caution">注意</option>
                <option value="unhealthy">不適</option>
                <option value="dangerous">嚴重</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">想法 / 建議</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm h-28 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="請分享此畫面最想優化的地方"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
            <button
              onClick={submitFeedback}
              className="w-full rounded-full bg-emerald-500 text-white font-semibold py-2 text-sm"
              disabled={!message.trim()}
            >
              儲存回饋
            </button>
          </div>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-2xl p-4 bg-white/70 h-48 overflow-auto text-xs text-slate-600">
              <pre className="whitespace-pre-wrap break-words">{exportPayload}</pre>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500">最近回饋</p>
              <div className="space-y-2 max-h-56 overflow-auto pr-2">
                {entries.length === 0 && (
                  <p className="text-xs text-slate-400">尚無紀錄，歡迎留下第一則想法！</p>
                )}
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50"
                  >
                    <p className="font-semibold text-slate-700">{entry.activity}</p>
                    <p className="text-slate-500">{entry.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(entry.createdAt).toLocaleString('zh-TW')} · {entry.riskLevel}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackConsole;
