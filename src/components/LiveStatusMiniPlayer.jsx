import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';

const LiveStatusMiniPlayer = ({ isOpen, activity, elapsedSeconds, onMaximize }) => {
    if (!activity) return null;

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100,
                        background: activity.color,
                        borderRadius: '24px',
                        padding: '0.5rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        boxShadow: `0 8px 24px ${activity.color}40`,
                        cursor: 'pointer',
                        color: '#000',
                        fontWeight: 600,
                        minWidth: '180px',
                        justifyContent: 'space-between'
                    }}
                    onClick={onMaximize}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Icon name={activity.icon} size={18} />
                        <span style={{ fontSize: '0.9rem' }}>{activity.name}</span>
                    </div>

                    <div style={{
                        fontVariantNumeric: 'tabular-nums',
                        background: 'rgba(0,0,0,0.1)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.9rem'
                    }}>
                        {formatTime(elapsedSeconds)}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LiveStatusMiniPlayer;
