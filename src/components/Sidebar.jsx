import React, { useRef, useState } from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';
import Icon from './Icon';
import { startOfDay, addMinutes } from 'date-fns';

const Sidebar = ({ currentView, onViewChange, activeActivityId, onActivitySelect, onOpenCreator, onEditActivity }) => {
    const { activities, logSlots } = useTimeTracker();

    const longPressTimerRef = useRef(null);
    const hasLongPressedRef = useRef(false);
    const [quickLogFlashId, setQuickLogFlashId] = useState(null);

    const handleLongPress = (activityId) => {
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const startMin = Math.floor(currentMin / 5) * 5;
        const ids = [addMinutes(startOfDay(now), startMin).toISOString()];

        logSlots(ids, activityId);
        onActivitySelect(activityId);

        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([20, 50, 20]); // Distinct double buzz
        }
    };

    return (
        <aside className="glass-panel sidebar-container" style={{
            width: '300px',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            margin: '1rem 0 1rem 1rem',
            gap: '2rem'
        }}>
            {/* Header */}
            <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center' }}>
                <h1 style={{
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(to right, #8B5CF6, #EC4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Icon name="Clock" size={28} style={{ stroke: '#8B5CF6' }} /> TimeTracker
                </h1>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav" style={{ display: 'flex', gap: '1rem' }}>
                <button
                    className={`btn-nav ${currentView === 'day' ? 'active' : ''}`}
                    onClick={() => onViewChange('day')}
                    style={{
                        flex: 1,
                        padding: '0.8rem',
                        borderRadius: '8px',
                        background: currentView === 'day' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: '1px solid transparent',
                        borderColor: currentView === 'day' ? 'var(--accent-primary)' : 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Day View
                </button>
                <button
                    className={`btn-nav ${currentView === 'analytics' ? 'active' : ''}`}
                    onClick={() => onViewChange('analytics')}
                    style={{
                        flex: 1,
                        padding: '0.8rem',
                        borderRadius: '8px',
                        background: currentView === 'analytics' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: '1px solid transparent',
                        borderColor: currentView === 'analytics' ? 'var(--accent-primary)' : 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Analytics
                </button>
            </nav>

            {/* Activity List */}
            <div className="activity-list-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activities</h3>

                {activities.map(activity => (
                    <div
                        className={`activity-item ${activeActivityId === activity.id ? 'active-pill' : ''} ${quickLogFlashId === activity.id ? 'flash-success' : ''}`}
                        key={activity.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '12px',
                            background: activeActivityId === activity.id || quickLogFlashId === activity.id
                                ? `linear-gradient(90deg, ${activity.color}33, transparent)`
                                : 'transparent',
                            border: '1px solid',
                            borderColor: activeActivityId === activity.id || quickLogFlashId === activity.id ? activity.color : 'transparent',
                            transition: 'all 0.2s',
                        }}
                    >
                        <button
                            onPointerDown={() => {
                                hasLongPressedRef.current = false;
                                longPressTimerRef.current = setTimeout(() => {
                                    hasLongPressedRef.current = true;
                                    handleLongPress(activity.id);
                                    setQuickLogFlashId(activity.id);
                                    setTimeout(() => setQuickLogFlashId(null), 500);
                                }, 500);
                            }}
                            onPointerUp={() => clearTimeout(longPressTimerRef.current)}
                            onPointerLeave={() => clearTimeout(longPressTimerRef.current)}
                            onPointerCancel={() => clearTimeout(longPressTimerRef.current)}
                            onClick={() => {
                                if (!hasLongPressedRef.current) {
                                    onActivitySelect(activity.id);
                                }
                            }}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                textAlign: 'left',
                                userSelect: 'none',
                                touchAction: 'pan-x' // permit horizontal scroll but handle press
                            }}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: `${activity.color}33`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: activity.color
                            }}>
                                <Icon name={activity.icon} size={20} />
                            </div>
                            <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{activity.name}</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditActivity(activity);
                            }}
                            className="btn-icon"
                            style={{
                                padding: '0.5rem',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                opacity: 0.7
                            }}
                            title="Edit Activity"
                        >
                            <Icon name="Edit2" size={16} />
                        </button>
                    </div>
                ))}

                <button
                    className="activity-item"
                    style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px dashed var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                    onClick={onOpenCreator}
                >
                    <Icon name="Plus" size={18} /> Add Activity
                </button>
            </div>

        </aside>
    );
};

export default Sidebar;
