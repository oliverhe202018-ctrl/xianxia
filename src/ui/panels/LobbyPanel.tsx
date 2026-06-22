import React from 'react';
import { UIManager } from '../UIManager';

interface LobbyPanelProps {
  onStart: () => void;
}

export const LobbyPanel: React.FC<LobbyPanelProps> = ({ onStart }) => {
  const handleStart = () => {
    UIManager.getInstance().pop();
    onStart();
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.88)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        zIndex: 9999,
      }}
    >
      {/* 标题 */}
      <div
        style={{
          fontSize: 42,
          fontWeight: 'bold',
          color: '#d4af37',
          textShadow: '0 0 20px rgba(212,175,55,0.8)',
          marginBottom: 12,
          letterSpacing: 6,
        }}
      >
        ⚔️ 仙侠塔防
      </div>
      <div
        style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 60,
          letterSpacing: 2,
        }}
      >
        天道轮回，修仙9万年
      </div>

      {/* 开始按鈕 */}
      <button
        onClick={handleStart}
        style={{
          padding: '16px 64px',
          fontSize: 22,
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #d4af37 100%)',
          border: '2px solid #a07820',
          borderRadius: 8,
          cursor: 'pointer',
          color: '#1a1a1a',
          letterSpacing: 4,
          boxShadow: '0 4px 24px rgba(212,175,55,0.5)',
          transition: 'transform 0.1s',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        开始修炼
      </button>

      {/* 底部装饰文字 */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: 1,
        }}
      >
        v1.0.0 — 修仙世界
      </div>
    </div>
  );
};
