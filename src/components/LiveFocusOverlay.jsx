import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { useTimeTracker } from '../context/TimeTrackerContext';

const LiveFocusOverlay = ({ isOpen, activity, onClose, onFinish, onMinimize }) => {
    const { activities, startLiveFocus } = useTimeTracker();
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef(null);
    const slideFinishRef = useRef(null);

    // Timer logic
    useEffect(() => {
        let interval = null;
        if (isOpen && !isPaused) {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else if (!isOpen) {
            // When closed, gracefully reset without an effect dependency that triggers re-render while open
            setElapsedSeconds(0);
            setIsPaused(false);
            setIsPickerOpen(false); // Close menu if open
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOpen, isPaused]);

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleFinish = () => {
        setIsPaused(true);
        if (timerRef.current) clearInterval(timerRef.current);
        onFinish(elapsedSeconds, activity);
        // Reset local state after finishing
        setTimeout(() => {
            setElapsedSeconds(0);
            setIsPickerOpen(false);
        }, 500);
    };

    if (!activity) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: `radial-gradient(circle at center, ${activity.color}33 0%, #0F0F0F 100%)`,
                        backgroundColor: '#0F0F0F',
                        zIndex: 9999, // Above almost everything
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3rem 1.5rem',
                        color: '#FFF'
                    }}
                >
                    {/* Top actions */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                        <button
                            onClick={onMinimize}
                            style={{ background: 'transparent', border: 'none', color: '#FFF', padding: '0.5rem', cursor: 'pointer', opacity: 0.7 }}
                        >
                            <Icon name="ChevronDown" size={28} />
                        </button>

                        <button
                            onClick={() => setIsPickerOpen(!isPickerOpen)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)',
                                borderRadius: '20px', border: 'none', color: '#FFF', cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            <Icon name={activity.icon} size={18} style={{ color: activity.color }} />
                            <span style={{ fontWeight: 600 }}>{activity.name}</span>
                            <Icon name="ChevronDown" size={14} style={{ opacity: 0.5, marginLeft: '4px' }} />
                        </button>

                        <button
                            onClick={onClose}
                            style={{ background: 'transparent', border: 'none', color: '#FFF', padding: '0.5rem', cursor: 'pointer', opacity: 0.7 }}
                        >
                            <Icon name="X" size={28} />
                        </button>

                        {/* Activity Picker Menu */}
                        <AnimatePresence>
                            {isPickerOpen && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                                        onClick={() => setIsPickerOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            marginTop: '1rem',
                                            background: '#1F1F2E',
                                            borderRadius: '16px',
                                            padding: '0.5rem',
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                            zIndex: 11,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minWidth: '220px',
                                            maxHeight: '50vh',
                                            overflowY: 'auto'
                                        }}
                                    >
                                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#A0A0B0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                            Change Activity
                                        </div>
                                        {activities.map(act => (
                                            <button
                                                key={act.id}
                                                onClick={() => {
                                                    startLiveFocus(act.id);
                                                    setIsPickerOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.75rem',
                                                    background: act.id === activity.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    color: '#FFF',
                                                    cursor: 'pointer',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: '8px',
                                                    background: `${act.color}33`, color: act.color,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Icon name={act.icon} size={16} />
                                                </div>
                                                <span style={{ fontWeight: 500 }}>{act.name}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Clock */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <motion.div
                            animate={{ scale: isPaused ? 0.95 : 1, opacity: isPaused ? 0.7 : 1 }}
                            style={{
                                fontSize: '5rem',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '-0.02em',
                                filter: `drop-shadow(0 0 20px ${activity.color}40)`
                            }}
                        >
                            {formatTime(elapsedSeconds)}
                        </motion.div>
                        <div style={{ fontSize: '1.2rem', color: '#A0A0B0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {isPaused ? 'Paused' : 'Focusing'}
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>

                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#FFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none'
                            }}
                        >
                            {isPaused ? <Icon name="Play" size={32} /> : <Icon name="Pause" size={32} />}
                        </button>

                        {/* Slide to Finish */}
                        <div style={{
                            width: '100%',
                            height: '64px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '32px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', width: '100%', textAlign: 'center', color: '#A0A0B0', fontWeight: 500, pointerEvents: 'none' }}>
                                Slide to Finish
                            </div>

                            <motion.div
                                ref={slideFinishRef}
                                drag="x"
                                dragConstraints={{ left: 0, right: 280 }} // Approximate width minus knob
                                dragElastic={0.05}
                                dragMomentum={false}
                                onDragEnd={(e, info) => {
                                    if (info.offset.x > 200) {
                                        handleFinish();
                                    }
                                }}
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '28px',
                                    background: activity.color,
                                    position: 'absolute',
                                    left: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'grab',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                }}
                                whileTap={{ cursor: 'grabbing', scale: 0.95 }}
                            >
                                <Icon name="Check" size={24} style={{ color: '#000' }} />
                            </motion.div>
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LiveFocusOverlay;
