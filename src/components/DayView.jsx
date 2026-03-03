import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parse, isValid } from 'date-fns';
import { useTimeTracker } from '../context/TimeTrackerContext';
import Icon from './Icon';
import { deriveEventsFromLogs } from '../utils/timeUtils';

const DayView = ({ activeActivityId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(new Date());
    const { logs, logSlots, getActivity, activities } = useTimeTracker();

    const [zoomLevel, setZoomLevel] = useState(1);
    const scrollRef = useRef(null);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState(null);
    const [editingEventId, setEditingEventId] = useState(null);
    const [dragPreview, setDragPreview] = useState(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null);
    const [changeActivityMenu, setChangeActivityMenu] = useState(false);

    // View Mode: 'standard' | 'overview'
    const [viewMode, setViewMode] = useState('standard');

    // Container Dimensions for Overview Mode
    const [containerHeight, setContainerHeight] = useState(800);

    const pendingZoomCenterRef = useRef(null);

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

    const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
    const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));

    const handleZoomChange = (e) => setZoomLevel(parseFloat(e.target.value));

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

        setIsDragging(false);
        setDragMode(null);
        setDragPreview(null);
    };

    const handleContextMenu = (e, event) => {
        e.preventDefault();
        e.stopPropagation();
        // Calculate position - keep away from edges if possible
        let x = e.clientX;
        let y = e.clientY;

        // Basic bounds check (simplified)
        if (window.innerWidth - x < 250) x -= 220;
        if (window.innerHeight - y < 200) y -= 160;

        setContextMenu({
            x,
            y,
            event
        });
        setChangeActivityMenu(false); // reset submenu
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
            // Delete slots (pass null as activityId)
            logSlots(getEventSlotIds(), null);
        } else if (action === 'change') {
            const newActivityId = payload;
            logSlots(getEventSlotIds(), newActivityId);
        } else if (action === 'duration') {
            setEditingEventId(event.id);
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
                        <div
                            key={`${event.id}-${colIndex}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onContextMenu={(e) => handleContextMenu(e, event)}
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

                            {/* Resize Handle (Only if not split or at actual end) */}
                            {/* Simplified: Always show handle, might be confusing at split boundary but valid for now */}
                            <div
                                onMouseDown={(e) => handleResizeStart(e, event)}
                                style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '10px',
                                    cursor: 'ns-resize', zIndex: 20
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        );
    }

    // Mouse Listeners Wrapper for split columns? 
    // Complexity: dragging across columns. 
    // Implementation: For now, drag only works within relative coordinate of the target column.
    // To support drag across columns, we need to map mouse X/Y to global minute 0-1440.

    const handleGlobalMouseMove = (e) => {
        if (!isDragging || !dragPreview || !scrollRef.current) return;
        const rect = scrollRef.current.getBoundingClientRect();

        let currentMin = 0;

        if (viewMode === 'standard') {
            const relativeY = e.clientY - rect.top + scrollRef.current.scrollTop;
            currentMin = relativeY / activePxPerMin;
        } else {
            // Overview Mode
            const relativeX = e.clientX - rect.left;
            const relativeY = e.clientY - rect.top;
            const colWidth = rect.width / 2;

            if (relativeX < colWidth) {
                // AM Column
                currentMin = relativeY / activePxPerMin;
            } else {
                // PM Column
                currentMin = 720 + (relativeY / activePxPerMin);
            }
        }

        if (currentMin < 0) currentMin = 0;
        if (currentMin > 1440) currentMin = 1440;
        setDragPreview(prev => ({ ...prev, currentEndMin: currentMin }));
    };

    const handleGlobalMouseDown = (e) => {
        if (!scrollRef.current || !activeActivityId) return;
        const rect = scrollRef.current.getBoundingClientRect();

        let clickedMin = 0;
        if (viewMode === 'standard') {
            const relativeY = e.clientY - rect.top + scrollRef.current.scrollTop;
            clickedMin = relativeY / activePxPerMin;
        } else {
            const relativeX = e.clientX - rect.left;
            const relativeY = e.clientY - rect.top;
            const colWidth = rect.width / 2;
            if (relativeX < colWidth) {
                clickedMin = relativeY / activePxPerMin;
            } else {
                clickedMin = 720 + (relativeY / activePxPerMin);
            }
        }

        const snappedStart = Math.floor(clickedMin / 5) * 5;
        const activity = getActivity(activeActivityId);

        setIsDragging(true);
        setDragMode('create');
        setDragPreview({
            mode: 'create',
            activityId: activeActivityId,
            startMin: snappedStart,
            currentEndMin: snappedStart + 5,
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
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={zoomLevel}
                                onChange={handleZoomChange}
                                style={{ width: '80px' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div
                ref={scrollRef}
                onMouseDown={handleGlobalMouseDown}
                onMouseMove={handleGlobalMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    overflowY: viewMode === 'standard' ? 'auto' : 'hidden', // No scroll in overview
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    position: 'relative',
                }}
            >
                {viewMode === 'standard' ? (
                    <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                        {renderColumn(0, 1440, 0)}
                        {/* Drag Preview (Standard) */}
                        {dragPreview && (
                            <div style={{
                                position: 'absolute',
                                top: `${Math.min(dragPreview.startMin, dragPreview.currentEndMin) * activePxPerMin}px`,
                                height: `${Math.abs(dragPreview.currentEndMin - dragPreview.startMin) * activePxPerMin}px`,
                                left: '60px', right: '10px',
                                background: dragPreview.color,
                                borderRadius: '6px',
                                boxShadow: `0 5px 20px ${dragPreview.color}66`,
                                border: '1px solid rgba(255,255,255,0.3)',
                                zIndex: 20,
                                opacity: 0.9, pointerEvents: 'none'
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

                        {/* Drag Preview (Overview) */}
                        {dragPreview && (
                            // Logic to render preview across columns?
                            // Simplification: Render absolute on top of everything? 
                            // No, easier to render logic similar to events: Split if needed
                            (() => {
                                const start = Math.min(dragPreview.startMin, dragPreview.currentEndMin);
                                const end = Math.max(dragPreview.startMin, dragPreview.currentEndMin);

                                const renderPreviewPart = (s, e, offset, leftPos) => (
                                    <div style={{
                                        position: 'absolute',
                                        top: `${(s - offset) * activePxPerMin}px`,
                                        height: `${(e - s) * activePxPerMin}px`,
                                        left: typeof leftPos === 'string' ? leftPos : `${leftPos}%`,
                                        width: 'calc(50% - 35px)', // Rough calc
                                        marginLeft: leftPos > 0 ? '30px' : '60px', // adjust for grid
                                        background: dragPreview.color,
                                        borderRadius: '6px',
                                        zIndex: 20, opacity: 0.9, pointerEvents: 'none'
                                    }} />
                                );

                                return (
                                    <>
                                        {/* AM Part */}
                                        {start < 720 && renderPreviewPart(Math.max(start, 0), Math.min(end, 720), 0, 0)}
                                        {/* PM Part */}
                                        {end > 720 && renderPreviewPart(Math.max(start, 720), Math.min(end, 1440), 720, 50)}
                                    </>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>


            {/* Context Menu Overlay - PORTAL TO BODY */}
            {contextMenu && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 9999,
                        background: 'rgba(30, 30, 30, 0.6)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        padding: '0.6rem',
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: '220px',
                        color: '#FFF',
                        fontSize: '0.9rem'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem', fontWeight: 'bold', color: contextMenu.event.activity.color, fontSize: '0.95rem' }}>
                        {contextMenu.event.activity.name}
                    </div>

                    <div
                        className="menu-item"
                        onClick={() => handleMenuAction('duration')}
                        style={{ padding: '0.6rem 0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Icon name="Clock" size={16} color="#DDD" /> <span style={{ color: '#EEE' }}>Duration (Edit)</span>
                    </div>

                    <div
                        className="menu-item"
                        onClick={() => setChangeActivityMenu(!changeActivityMenu)}
                        style={{ padding: '0.6rem 0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Icon name="RefreshCw" size={16} color="#DDD" /> <span style={{ color: '#EEE' }}>Change Activity</span>
                        </div>
                        <Icon name="ChevronRight" size={14} color="#AAA" />
                    </div>

                    {changeActivityMenu && (
                        <div style={{
                            maxHeight: '200px', overflowY: 'auto',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            margin: '0.5rem 0',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {activities.map(act => (
                                <div
                                    key={act.id}
                                    onClick={() => handleMenuAction('change', act.id)}
                                    style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: act.color, flexShrink: 0 }} />
                                    <span style={{ color: '#EEE' }}>{act.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div
                        className="menu-item"
                        onClick={() => handleMenuAction('delete')}
                        style={{ padding: '0.6rem 0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#EF4444', marginTop: '0.5rem', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Icon name="Trash2" size={16} /> Delete
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DayView;
