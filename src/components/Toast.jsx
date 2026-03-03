import React from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';
import Icon from './Icon';

const Toast = () => {
    const { toastMessage, undoDelete, hideToast } = useTimeTracker();

    if (!toastMessage) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 'env(safe-area-inset-top, 20px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            padding: '12px 20px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 10000,
            animation: 'slideDown 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)',
            minWidth: '280px',
            justifyContent: 'space-between'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="Info" size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toastMessage}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={undoDelete}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        padding: '4px 8px'
                    }}
                >
                    UNDO
                </button>
                <div style={{ width: '1px', height: '16px', background: 'var(--border-color)' }} />
                <button
                    onClick={hideToast}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                >
                    <Icon name="X" size={16} />
                </button>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Toast;
