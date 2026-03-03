import React, { useMemo, useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { differenceInMinutes, addMinutes, format } from 'date-fns';
import Icon from './Icon';

const CatchUpSheet = ({ isOpen, onClose }) => {
    const { activities, logs, logSlots } = useTimeTracker();

    const [gapInfo, setGapInfo] = useState(null);

    // Determine the missing time gap
    // eslint-disable-next-line react-compiler/react-compiler
    useEffect(() => {
        if (!logs) {
            setGapInfo(null);
            return;
        }

        const sortedSlots = Object.keys(logs).sort();
        if (sortedSlots.length === 0) {
            setGapInfo(null);
            return;
        }

        const latestSlotIso = sortedSlots[sortedSlots.length - 1];
        const latestSlotDate = new Date(latestSlotIso);

        // Let's cap the unlogged time to "now" rounded down to the nearest 5-minute slot
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const currentSlotMin = Math.floor(nowMin / 5) * 5;

        // We need to keep dates in the same day if we haven't crossed midnight for simplicity
        // But for robust gap generation, we parse dates completely:
        const currentSlotDate = new Date(now);
        currentSlotDate.setHours(Math.floor(currentSlotMin / 60), currentSlotMin % 60, 0, 0);

        const diffMins = differenceInMinutes(currentSlotDate, latestSlotDate);

        // Only show if there's at least a 10 min gap (2 slots)
        if (diffMins >= 10) {
            // function inside effect to avoid hoisting issues
            const generateMissingSlots = (start, end) => {
                const slots = [];
                let cursor = new Date(start);
                cursor = addMinutes(cursor, 5); // Start on the first missing slot

                while (cursor <= end) {
                    slots.push(cursor.toISOString());
                    cursor = addMinutes(cursor, 5);
                }
                return slots;
            };

            setGapInfo({
                start: latestSlotDate,
                end: currentSlotDate,
                diffMins,
                slotIds: generateMissingSlots(latestSlotDate, currentSlotDate)
            });
        } else {
            setGapInfo(null);
        }
    }, [logs]); // Recalculate when logs change

    // Find top 4 activities based on frequency in last X days
    const topActivities = useMemo(() => {
        if (!logs) return activities.slice(0, 4);

        const counts = {};
        Object.values(logs).forEach(actId => {
            counts[actId] = (counts[actId] || 0) + 1;
        });

        const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

        const top = [];
        for (const id of sortedIds) {
            const act = activities.find(a => a.id === id);
            if (act) top.push(act);
            if (top.length === 4) break;
        }

        // Fill up to 4 if we don't have enough history
        for (const act of activities) {
            if (top.length === 4) break;
            if (!top.find(t => t.id === act.id)) {
                top.push(act);
            }
        }

        return top;
    }, [logs, activities]);


    const handleFillGap = (activityId) => {
        if (gapInfo && gapInfo.slotIds.length > 0) {
            logSlots(gapInfo.slotIds, activityId);
            onClose();
        }
    };

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999
                }} />
                <Drawer.Content style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#1F1F2E',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    padding: '1.5rem',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '80vh',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
                }}>
                    <div style={{
                        width: '40px',
                        height: '4px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '2px',
                        margin: '0 auto 1.5rem auto'
                    }} />

                    <Drawer.Title style={{ margin: '0 0 0.5rem 0', color: '#FFF', fontSize: '1.5rem', fontWeight: 600 }}>
                        Catch Up
                    </Drawer.Title>
                    <Drawer.Description style={{ margin: '0 0 1.5rem 0', color: '#A0A0B0' }}>
                        {gapInfo ? (
                            <>
                                You haven't logged anything between <strong style={{ color: '#FFF' }}>{format(gapInfo.start, 'h:mm a')}</strong> and <strong style={{ color: '#FFF' }}>{format(gapInfo.end, 'h:mm a')}</strong>. What were you up to?
                            </>
                        ) : (
                            "You are all caught up!"
                        )}
                    </Drawer.Description>

                    {gapInfo && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1rem',
                            paddingBottom: '2rem'
                        }}>
                            {topActivities.map((activity) => (
                                <button
                                    key={activity.id}
                                    onClick={() => handleFillGap(activity.id)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${activity.color}40`,
                                        borderRadius: '16px',
                                        padding: '1.5rem',
                                        color: '#FFF',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        ':hover': {
                                            background: `${activity.color}20`
                                        }
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: `${activity.color}33`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: activity.color
                                    }}>
                                        <Icon name={activity.icon} size={24} />
                                    </div>
                                    <span style={{ fontWeight: 500 }}>{activity.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {!gapInfo && (
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                color: '#FFF',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '1rem',
                                borderRadius: '8px',
                                fontWeight: '500',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                marginTop: '1rem',
                                marginBottom: '2rem'
                            }}
                        >
                            Close
                        </button>
                    )}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};

export default CatchUpSheet;
