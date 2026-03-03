import React, { useState, useEffect, useRef, useMemo } from 'react';
// removed createPortal
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parse, isValid } from 'date-fns';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { useGesture } from '@use-gesture/react';
import { Drawer } from 'vaul';
import Icon from './Icon';
import { deriveEventsFromLogs } from '../utils/timeUtils';
import useLongPress from '../hooks/useLongPress';

const EventBlockWrapper = ({ event, scrollRef, viewMode, onLongPress, onClick, style, isMenuOpen, children }) => {
    const handlers = useLongPress(
        (e) => {
            if (scrollRef.current && viewMode === 'standard') {
                const rect = scrollRef.current.getBoundingClientRect();
                if (e.clientX > rect.left + rect.width / 2) return;
            }
            onLongPress(e);
        },
        (e) => {
            if (scrollRef.current && viewMode === 'standard') {
                const rect = scrollRef.current.getBoundingClientRect();
                if (e.clientX > rect.left + rect.width / 2) return;
            }
            onClick(e);
        },
        { delay: 400 }
    );

    const mergedStyle = {
        ...style,
        transform: isMenuOpen ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1), box-shadow 0.2s',
        zIndex: isMenuOpen ? 20 : style.zIndex,
        boxShadow: isMenuOpen ? `0 10px 20px ${event.activity.color}66` : style.boxShadow,
    };

    return (
        <div className="event-block" style={mergedStyle} {...handlers}>
            {children}
        </div>
    );
};

const DayView = ({ activeActivityId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(new Date());
    const { logs, logSlots, getActivity, activities, removeSlotsWithUndo } = useTimeTracker();

    const [zoomLevel, setZoomLevel] = useState(1);
    const scrollRef = useRef(null);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState(null);
    const [editingEventId, setEditingEventId] = useState(null);
    const [selectedEventId, setSelectedEventId] = useState(null); // Tap to reveal handles
    const [dragPreview, setDragPreview] = useState(null);

    // Haptics ref to track last snapped min to prevent over-vibration
    const lastSnappedMinRef = useRef(-1);

    const triggerHaptic = () => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }
    };

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null);
    const [changeActivityMenu, setChangeActivityMenu] = useState(false);

    // View Mode: 'standard' | 'overview'
    const [viewMode, setViewMode] = useState('standard');

    // Container Dimensions for Overview Mode
    const [containerHeight, setContainerHeight] = useState(800);

    const pendingZoomCenterRef = useRef(null);
    const autoScrollRef = useRef(null);
    const lastPointerRef = useRef({ x: 0, y: 0 });
    const lastTapRef = useRef({ time: 0, min: -1 });

    const events = useMemo(() => {
        return deriveEventsFromLogs(logs, currentDate, getActivity);
    }, [logs, currentDate, getActivity]);

    // ... Standard Effects ...

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        // Initial scroll position
        if (scrollRef.current && pendingZoomCenterRef.current === null && viewMode === 'standard') {
            const now = new Date();
            const minutes = now.getHours() * 60 + now.getMinutes();
            const pxPerMin = (30 * zoomLevel) / 5;
            scrollRef.current.scrollTop = (minutes * pxPerMin) - 200;
        }

        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);

        return () => {
            clearInterval(timer);
            window.removeEventListener('click', closeMenu);
        }
    }, [viewMode, zoomLevel]); // Depend on viewMode and zoomLevel to reset scroll if needed

    // Resize Observer to keep containerHeight updated
    useEffect(() => {
        if (!scrollRef.current) return;

        const updateHeight = () => {
            if (scrollRef.current) {
                setContainerHeight(scrollRef.current.clientHeight);
            }
        };

        // Initial set
        updateHeight();

        const observer = new ResizeObserver(updateHeight);
        observer.observe(scrollRef.current);

        return () => observer.disconnect();
    }, []);

    // ... Zoom Logic ... (Only relevant for standard mode mostly, but overview might use a fixed scale?)
    // Actually, overview fits to screen. So we calculate pxPerMin dynamically.

    // Overview Mode Calculations
    // 12 hours (720 mins) must fit in containerHeight (minus padding).
    // Let's say we use 100% height.
    const overviewPxPerMin = (containerHeight || 800) / 720;

    const activePxPerMin = viewMode === 'overview' ? overviewPxPerMin : (30 * zoomLevel) / 5;
    const totalHeight = viewMode === 'overview' ? (containerHeight || 800) : 24 * 60 * activePxPerMin;

    // ... Event Handlers ...

    const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
    const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));

    // Gesture binds for Swipe & Pinch
    const bindGestures = useGesture({
        onPinch: ({ offset: [d], event }) => {
            // Map offset to a reasonable zoom between 0.5 and 3
            if (event) event.preventDefault();
            const newZoom = Math.max(0.5, Math.min(3, 1 + (d / 200)));
            setZoomLevel(newZoom);
        },
        onDrag: ({ swipe: [sx] }) => {
            // If it's a pronounced horizontal swipe
            if (sx === -1) handleNextDay();
            if (sx === 1) handlePrevDay();
        }
    }, {
        drag: { axis: 'x', swipe: { velocity: 0.5, distance: 40 } },
        pinch: { scaleBounds: { min: 0.5, max: 3 }, modifierKey: null }
    });

    const handleScroll = () => {
        // Only relevant if we wanted to sync scrolls or something, 
        // but for now we just let it be. 
        // Maybe hide context menu on scroll?
        if (contextMenu) setContextMenu(null);
    };

    const handleResizeStart = (e, event) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragMode('resize');
        setDragPreview({
            mode: 'resize',
            activityId: event.activity.id,
            eventId: event.id,
            startMin: event.startMin,
            currentEndMin: event.endMin,
            originalEndMin: event.endMin,
            color: event.activity.color
        });
    };

    const handleMouseUp = () => {
        if (!isDragging) return;

        if (dragPreview) {
            const start = Math.min(dragPreview.startMin, dragPreview.currentEndMin);
            const end = Math.max(dragPreview.startMin, dragPreview.currentEndMin);

            if (start !== end) {
                // Generate ISO IDs for each 5-min slot
                const slotIds = [];
                const dayStart = startOfDay(currentDate);
                for (let m = start; m < end; m += 5) {
                    slotIds.push(addMinutes(dayStart, m).toISOString());
                }

                if (dragMode === 'resize') {
                    // Clear the old range first
                    const oldIds = [];
                    // We assume startMin didn't change (only bottom handle resizing)
                    // But if we want to be robust, we use the original range.
                    // Since we only have bottom handle, startMin is constant.
                    for (let m = dragPreview.startMin; m < dragPreview.originalEndMin; m += 5) {
                        oldIds.push(addMinutes(dayStart, m).toISOString());
                    }
                    logSlots(oldIds, null);
                    // Then write new
                    logSlots(slotIds, dragPreview.activityId);
                } else if (dragMode === 'create') {
                    logSlots(slotIds, dragPreview.activityId);
                }
            }
        }

        if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
        setIsDragging(false);
        setDragMode(null);
        setDragPreview(null);
    };

    const handleContextMenu = (e, event) => {
        e.preventDefault();
        e.stopPropagation();
        triggerHaptic();
        setContextMenu({ event });
        setChangeActivityMenu(false);
    };

    const handleMenuAction = (action, payload) => {
        if (!contextMenu) return;
        const { event } = contextMenu;

        // Helper to get IDs for this event's range
        const getEventSlotIds = () => {
            const ids = [];
            const dayStart = startOfDay(currentDate);
            for (let m = event.startMin; m < event.endMin; m += 5) {
                ids.push(addMinutes(dayStart, m).toISOString());
            }
            return ids;
        };

        if (action === 'delete') {
            removeSlotsWithUndo(getEventSlotIds());
        } else if (action === 'change') {
            const newActivityId = payload;
            logSlots(getEventSlotIds(), newActivityId);
        } else if (action === 'duration') {
            setEditingEventId(event.id);
        } else if (action === 'duplicate') {
            const durationMins = event.endMin - event.startMin;
            const newStartMin = event.endMin; // Paste directly after
            const newEndMin = Math.min(1440, newStartMin + durationMins);
            const ids = [];
            const dayStart = startOfDay(currentDate);
            for (let m = newStartMin; m < newEndMin; m += 5) {
                ids.push(addMinutes(dayStart, m).toISOString());
            }
            logSlots(ids, event.activity.id);
        } else if (action === 'split') {
            const durationMins = event.endMin - event.startMin;
            const halfDuration = Math.max(5, Math.floor((durationMins / 2) / 5) * 5);
            // Delete the second half to visually split it
            const secondHalfStart = event.startMin + halfDuration;
            const ids = [];
            const dayStart = startOfDay(currentDate);
            for (let m = secondHalfStart; m < event.endMin; m += 5) {
                ids.push(addMinutes(dayStart, m).toISOString());
            }
            logSlots(ids, null);
        }

        setContextMenu(null);
    };


    // Abstracted Column Rendering for reusability
    const renderColumn = (startOffsetMin, endOffsetMin, colIndex = 0) => {
        const colDuration = endOffsetMin - startOffsetMin;

        // Filter events that visibly appear in this column
        const visibleEvents = events.filter(e => e.endMin > startOffsetMin && e.startMin < endOffsetMin);

        return (
            <div style={{ position: 'relative', height: '100%', flex: 1, borderRight: viewMode === 'overview' && colIndex === 0 ? '1px solid var(--border-color)' : 'none' }}>
                {/* Grid Time Labels */}
                {Array.from({ length: colDuration / 5 }).map((_, i) => {
                    const absMin = startOffsetMin + (i * 5);
                    const isHour = absMin % 60 === 0;
                    if (!isHour && viewMode === 'overview') return null; // Fewer labels in overview

                    return (
                        <div key={i} style={{
                            position: 'absolute', top: `${i * 5 * activePxPerMin}px`, left: 0, right: 0, pointerEvents: 'none'
                        }}>
                            <div style={{ position: 'absolute', left: '50px', right: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                            <span style={{
                                position: 'absolute', top: '-8px', left: '5px', fontSize: '0.65rem', color: 'var(--text-secondary)',
                                opacity: isHour ? 0.9 : 0.4, fontFamily: 'monospace'
                            }}>
                                {format(addMinutes(startOfDay(currentDate), absMin), 'HH:mm')}
                            </span>
                        </div>
                    );
                })}

                {/* Current Time Indicator */}
                {isSameDay(currentDate, new Date()) && (() => {
                    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
                    if (nowMin >= startOffsetMin && nowMin < endOffsetMin) {
                        return (
                            <div style={{
                                position: 'absolute', top: `${(nowMin - startOffsetMin) * activePxPerMin}px`,
                                left: 0, right: 0, height: '2px', background: '#EF4444', zIndex: 50, pointerEvents: 'none'
                            }} />
                        );
                    }
                    return null;
                })()}

                {/* Events */}
                {visibleEvents.map(event => {
                    // Calculate relative position/size for this column
                    const relativeStart = Math.max(event.startMin, startOffsetMin) - startOffsetMin;
                    const relativeEnd = Math.min(event.endMin, endOffsetMin) - startOffsetMin;

                    return (
                        <EventBlockWrapper
                            key={`${event.id}-${colIndex}`}
                            event={event}
                            scrollRef={scrollRef}
                            viewMode={viewMode}
                            isMenuOpen={contextMenu && contextMenu.event.id === event.id}
                            onLongPress={(e) => handleContextMenu(e, event)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEventId(event.id);
                            }}
                            style={{
                                position: 'absolute',
                                top: `${relativeStart * activePxPerMin}px`,
                                height: `${(relativeEnd - relativeStart) * activePxPerMin}px`,
                                left: '60px', right: '10px',
                                background: event.activity.color,
                                borderRadius: '6px',
                                boxShadow: `0 2px 10px ${event.activity.color}33`,
                                border: '1px solid rgba(255,255,255,0.1)',
                                zIndex: 10,
                                padding: '0 8px',
                                display: 'flex', flexDirection: 'column',
                            }}
                        >
                            {/* HIDE HEADER/HANDLES IF SPLIT weirdly? mostly fine. */}
                            <div style={{
                                position: 'sticky', top: 0,
                                display: 'flex', alignItems: 'center', gap: '10px',
                                paddingTop: '4px', paddingBottom: '4px', background: event.activity.color,
                                zIndex: 5, width: '100%', flexShrink: 0,
                                borderTopLeftRadius: '6px',
                                borderTopRightRadius: '6px',
                                overflow: 'hidden' // Clip header text if event is very small
                            }}>
                                <Icon name={event.activity.icon} size={18} color="#FFF" />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 'bold', color: '#FFF', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{event.activity.name}</span>
                                    {editingEventId === event.id ? (
                                        <input
                                            autoFocus
                                            defaultValue={`${format(event.startTime, 'HH:mm')} - ${format(event.endTime, 'HH:mm')}`}
                                            onBlur={() => setEditingEventId(null)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    // Parse time range "HH:mm - HH:mm"
                                                    const value = e.target.value;
                                                    const parts = value.split('-').map(s => s.trim());
                                                    if (parts.length === 2) {
                                                        const now = new Date(); // base
                                                        const p1 = parse(parts[0], 'HH:mm', now);
                                                        const p2 = parse(parts[1], 'HH:mm', now);

                                                        if (isValid(p1) && isValid(p2)) {
                                                            let sMin = p1.getHours() * 60 + p1.getMinutes();
                                                            let eMin = p2.getHours() * 60 + p2.getMinutes();

                                                            // Handle crossing midnight for end time? 
                                                            if (eMin < sMin) eMin += 1440; // Assume next day if end < start

                                                            // Calculate slot IDs
                                                            const ids = [];
                                                            const dayStart = startOfDay(currentDate);
                                                            for (let m = sMin; m < eMin; m += 5) {
                                                                ids.push(addMinutes(dayStart, m).toISOString());
                                                            }

                                                            // Need to clear old range?
                                                            // "change" overwrites. But if we shrink?
                                                            // To be safe: clear old range, then write new range.
                                                            // But simpler: just log new range for now. Shrinking manually via text is harder without "delete old" logic.
                                                            // Wait, we have access to "event" here.
                                                            // We can delete old events slots first!

                                                            const oldIds = [];
                                                            for (let m = event.startMin; m < event.endMin; m += 5) {
                                                                oldIds.push(addMinutes(dayStart, m).toISOString());
                                                            }
                                                            logSlots(oldIds, null); // Clear old

                                                            // Write new
                                                            logSlots(ids, event.activity.id);
                                                        }
                                                    }
                                                    setEditingEventId(null);
                                                }
                                                if (e.key === 'Escape') setEditingEventId(null);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                background: 'white', color: 'black', border: 'none', borderRadius: '4px',
                                                fontSize: '0.7rem', padding: '2px 4px', width: '100px', marginTop: '2px'
                                            }}
                                        />
                                    ) : (
                                        viewMode === 'standard' && (
                                            <span
                                                onDoubleClick={(e) => { e.stopPropagation(); setEditingEventId(event.id); }}
                                                style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', cursor: 'text' }}
                                            >
                                                {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Tap-to-Reveal Mobile Resize Handle */}
                            {selectedEventId === event.id && (
                                <div
                                    className="resize-handle-mobile"
                                    onPointerDown={(e) => handleResizeStart(e, event)}
                                />
                            )}
                        </EventBlockWrapper>
                    );
                })}
            </div>
        );
    }

    // Mouse Listeners Wrapper for split columns? 
    // Complexity: dragging across columns. 
    // Implementation: For now, drag only works within relative coordinate of the target column.
    // To support drag across columns, we need to map mouse X/Y to global minute 0-1440.

    // Abstract coordinate mapping
    const getMinFromPointer = (clientX, clientY) => {
        if (!scrollRef.current) return 0;
        const rect = scrollRef.current.getBoundingClientRect();
        if (viewMode === 'standard') {
            const relativeY = clientY - rect.top + scrollRef.current.scrollTop;
            return Math.max(0, Math.min(1440, relativeY / activePxPerMin));
        } else {
            const relativeX = clientX - rect.left;
            const relativeY = clientY - rect.top;
            const colWidth = rect.width / 2;
            let currentMin = relativeX < colWidth ? relativeY / activePxPerMin : 720 + (relativeY / activePxPerMin);
            return Math.max(0, Math.min(1440, currentMin));
        }
    };

    const handleGlobalPointerMove = (e) => {
        if (!isDragging || !dragPreview || !scrollRef.current) return;

        // Save pointer for auto-scroll updates
        lastPointerRef.current = { x: e.clientX, y: e.clientY };

        const currentMin = getMinFromPointer(e.clientX, e.clientY);

        // Haptic feedback snap logic
        const snappedCurrent = Math.floor(currentMin / 5) * 5;
        if (snappedCurrent !== lastSnappedMinRef.current) {
            triggerHaptic();
            lastSnappedMinRef.current = snappedCurrent;
        }

        // Edge Auto-scrolling Logic
        const rect = scrollRef.current.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const scrollZone = Math.min(100, rect.height * 0.1);

        let scrollDirection = 0;
        if (relativeY < scrollZone) scrollDirection = -1;
        else if (relativeY > rect.height - scrollZone) scrollDirection = 1;

        if (scrollDirection !== 0 && viewMode === 'standard') {
            if (!autoScrollRef.current) {
                const scrollStep = () => {
                    if (!scrollRef.current || !isDragging) return;
                    scrollRef.current.scrollBy({ top: scrollDirection * 15, behavior: 'auto' });

                    // Update drag preview to follow the scroll
                    const newMin = getMinFromPointer(lastPointerRef.current.x, lastPointerRef.current.y);
                    setDragPreview(prev => prev ? { ...prev, currentEndMin: newMin } : null);

                    autoScrollRef.current = requestAnimationFrame(scrollStep);
                };
                autoScrollRef.current = requestAnimationFrame(scrollStep);
            }
        } else {
            if (autoScrollRef.current) {
                cancelAnimationFrame(autoScrollRef.current);
                autoScrollRef.current = null;
            }
        }

        setDragPreview(prev => ({ ...prev, currentEndMin: currentMin }));
    };

    const handleGlobalPointerDown = (e) => {
        if (!scrollRef.current || !activeActivityId) return;

        // Ignore if clicking on existing events, buttons, or scrollbar (approx)
        if (e.target.closest('.event-block') || e.target.closest('button') || e.clientX > scrollRef.current.getBoundingClientRect().right - 15) return;

        // Split-Screen Interaction: Ignore clicks in the right half (Scroll Zone) for standard view
        if (viewMode === 'standard') {
            const rect = scrollRef.current.getBoundingClientRect();
            if (e.clientX > rect.left + rect.width / 2) {
                return; // Allow native scroll to pass through
            }
        }

        // Capture pointer is important for mobile touch-drag so it doesn't get lost
        e.target.setPointerCapture(e.pointerId);

        const clickedMin = getMinFromPointer(e.clientX, e.clientY);
        const snappedStart = Math.floor(clickedMin / 5) * 5;
        const activity = getActivity(activeActivityId);

        const nowTime = Date.now();
        if (nowTime - lastTapRef.current.time < 400 && lastTapRef.current.min === snappedStart) {
            // Double Tap Detected! Create 15-min block
            setIsDragging(false);
            setDragMode(null);
            setDragPreview(null);

            const slotIds = [];
            const dayStart = startOfDay(currentDate);
            for (let m = snappedStart; m < snappedStart + 15; m += 5) {
                if (m < 1440) {
                    slotIds.push(addMinutes(dayStart, m).toISOString());
                }
            }
            logSlots(slotIds, activeActivityId);

            // Extra haptic for confirm
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate([15, 30, 15]);
            lastTapRef.current = { time: 0, min: -1 };
            return;
        }

        lastTapRef.current = { time: nowTime, min: snappedStart };

        // Reset haptic ref
        lastSnappedMinRef.current = snappedStart;
        triggerHaptic();

        setIsDragging(true);
        setDragMode('create');
        setDragPreview({
            mode: 'create',
            activityId: activeActivityId,
            startMin: snappedStart,
            currentEndMin: snappedStart + 5, // minimum 5 mins
            color: activity.color,
            name: activity.name,
            icon: activity.icon
        });
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>
            <div className="flex-center" style={{ marginBottom: '1rem', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={handlePrevDay} className="btn-icon">
                        <Icon name="ChevronLeft" size={24} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>{format(currentDate, 'EEEE, MMM do')}</h2>
                    <button onClick={handleNextDay} className="btn-icon">
                        <Icon name="ChevronRight" size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px' }}>
                        <div
                            onClick={() => setViewMode('standard')}
                            style={{
                                padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                background: viewMode === 'standard' ? 'var(--accent-primary)' : 'transparent',
                                color: viewMode === 'standard' ? 'white' : 'var(--text-secondary)'
                            }}
                        >
                            <Icon name="LayoutList" size={16} />
                        </div>
                        <div
                            onClick={() => setViewMode('overview')}
                            style={{
                                padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                background: viewMode === 'overview' ? 'var(--accent-primary)' : 'transparent',
                                color: viewMode === 'overview' ? 'white' : 'var(--text-secondary)'
                            }}
                        >
                            <Icon name="Columns" size={16} />
                        </div>
                    </div>

                    {viewMode === 'standard' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Zoom</span>
                            {/* Replaced with pinch-to-zoom gestures */}
                        </div>
                    )}
                </div>
            </div>

            <div
                {...bindGestures()}
                ref={scrollRef}
                onPointerDown={handleGlobalPointerDown}
                onPointerMove={handleGlobalPointerMove}
                onPointerUp={handleMouseUp}
                onPointerLeave={handleMouseUp}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    overflowY: viewMode === 'standard' ? 'auto' : 'hidden', // No scroll in overview
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    position: 'relative',
                    touchAction: isDragging ? 'none' : 'pan-y' // Prevent vertical scroll while drawing
                }}
            >
                {viewMode === 'standard' ? (
                    <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                        {/* Scroll Zone Visual Cue */}
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%',
                            borderLeft: '1px dashed rgba(255,255,255,0.1)',
                            background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.05))',
                            pointerEvents: 'none',
                            zIndex: 1
                        }} />
                        {renderColumn(0, 1440, 0)}
                        {/* Tactile Ghost Dialog Preview (Standard) */}
                        {dragPreview && (
                            <div className="ghost-preview" style={{
                                top: `${Math.floor(Math.min(dragPreview.startMin, dragPreview.currentEndMin) / 5) * 5 * activePxPerMin}px`,
                                height: `${Math.max(5, Math.floor(Math.abs(dragPreview.currentEndMin - dragPreview.startMin) / 5) * 5) * activePxPerMin}px`,
                                left: '60px', right: '10px',
                            }} />
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', height: '100%' }}>
                        {/* AM Column */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            {renderColumn(0, 720, 0)}
                        </div>

                        {/* PM Column */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            {renderColumn(720, 1440, 1)}
                        </div>

                        {/* Tactile Ghost Preview (Overview) */}
                        {dragPreview && (
                            (() => {
                                const start = Math.floor(Math.min(dragPreview.startMin, dragPreview.currentEndMin) / 5) * 5;
                                const end = Math.floor(Math.max(dragPreview.startMin, dragPreview.currentEndMin) / 5) * 5;
                                const hDuration = Math.max(5, end - start);

                                const renderPreviewPart = (s, e, offset, leftPos) => (
                                    <div className="ghost-preview" style={{
                                        top: `${(s - offset) * activePxPerMin}px`,
                                        height: `${(e - s) * activePxPerMin}px`,
                                        left: typeof leftPos === 'string' ? leftPos : `${leftPos}%`,
                                        width: 'calc(50% - 35px)',
                                        marginLeft: leftPos > 0 ? '30px' : '60px',
                                    }} />
                                );

                                return (
                                    <>
                                        {/* AM Part */}
                                        {start < 720 && renderPreviewPart(Math.max(start, 0), Math.min(start + hDuration, 720), 0, 0)}
                                        {/* PM Part */}
                                        {start + hDuration > 720 && renderPreviewPart(Math.max(start, 720), Math.min(start + hDuration, 1440), 720, 50)}
                                    </>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>


            {/* Vaul Native Bottom Sheet for Context Menu */}
            <Drawer.Root open={!!contextMenu} onOpenChange={(open) => !open && setContextMenu(null)}>
                <Drawer.Portal>
                    <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }} />
                    <Drawer.Content style={{
                        background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column',
                        borderRadius: '24px 24px 0 0', height: 'auto', bottom: 0, left: 0, right: 0,
                        position: 'fixed', padding: '1.5rem', zIndex: 1000,
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ alignSelf: 'center', width: '40px', height: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', marginBottom: '1.5rem' }} />

                        {contextMenu && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                                    <div style={{ background: contextMenu.event.activity.color, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Icon name={contextMenu.event.activity.icon} size={18} color="#FFF" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: '#FFF', fontSize: '1.1rem' }}>{contextMenu.event.activity.name}</h3>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {format(contextMenu.event.startTime, 'HH:mm')} - {format(contextMenu.event.endTime, 'HH:mm')}
                                        </span>
                                    </div>
                                </div>

                                <button onClick={() => handleMenuAction('duration')} className="glass-panel" style={{ padding: '1rem', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: '#FFF', fontSize: '1rem', cursor: 'pointer', textAlign: 'left' }}>
                                    <Icon name="Clock" size={20} color="var(--text-secondary)" /> Edit Duration manually
                                </button>

                                <button onClick={() => handleMenuAction('split')} className="glass-panel" style={{ padding: '1rem', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: '#FFF', fontSize: '1rem', cursor: 'pointer', textAlign: 'left' }}>
                                    <Icon name="Scissors" size={20} color="var(--text-secondary)" /> Split Segment in half
                                </button>

                                <button onClick={() => handleMenuAction('duplicate')} className="glass-panel" style={{ padding: '1rem', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: '#FFF', fontSize: '1rem', cursor: 'pointer', textAlign: 'left' }}>
                                    <Icon name="Copy" size={20} color="var(--text-secondary)" /> Duplicate immediately after
                                </button>

                                <button onClick={() => setChangeActivityMenu(!changeActivityMenu)} className="glass-panel" style={{ padding: '1rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFF', fontSize: '1rem', cursor: 'pointer', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Icon name="RefreshCw" size={20} color="var(--text-secondary)" /> Change Activity
                                    </div>
                                    <Icon name={changeActivityMenu ? "ChevronUp" : "ChevronDown"} size={16} color="var(--text-secondary)" />
                                </button>

                                {changeActivityMenu && (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {activities.map(act => (
                                            <div key={act.id} onClick={() => handleMenuAction('change', act.id)} style={{ padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: act.color }} />
                                                <span style={{ color: '#FFF' }}>{act.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button onClick={() => handleMenuAction('delete')} className="glass-panel" style={{ padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '12px', color: '#EF4444', fontSize: '1rem', cursor: 'pointer', textAlign: 'left', marginTop: '0.5rem' }}>
                                    <Icon name="Trash2" size={20} /> Delete Event Block
                                </button>
                            </div>
                        )}
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    );
};

export default DayView;
