'use client';

import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function LoadingSpinner({
  message = '載入中...',
  size = 'medium',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="relative">
        {/* 外圈旋轉動畫 */}
        <div
          className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
        />
        {/* 內圈脈動動畫 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" />
        </div>
      </div>

      {/* 載入訊息 */}
      <div className="mt-6 text-center">
        <p className="text-lg font-medium text-gray-800 mb-2">{message}</p>
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* 提示文字 */}
      <div className="mt-8 max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <p className="text-sm text-gray-600 text-center">
            正在獲取您的位置資訊...
          </p>
          <p className="text-xs text-gray-500 text-center mt-2">
            💡 請允許瀏覽器存取您的位置以獲得最佳體驗
          </p>
        </div>
      </div>
    </div>
  );
}
