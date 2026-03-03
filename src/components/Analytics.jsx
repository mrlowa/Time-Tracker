import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
    format, startOfDay, startOfWeek, startOfMonth, startOfYear,
    endOfDay, endOfWeek, endOfMonth, endOfYear,
    isWithinInterval, parseISO
} from 'date-fns';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { getLogicalDate } from '../utils/timeUtils';
import Icon from './Icon';

const RANGES = ['Day', 'Week', 'Month', 'Year'];

const formatDuration = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}min`;
};

const Analytics = () => {
    const [range, setRange] = useState('Week');
    const { logs, activities, getActivity } = useTimeTracker();
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [filterOpen, setFilterOpen] = useState(false);
    const [hiddenActivityIds, setHiddenActivityIds] = useState(new Set());

    // Reset reference date when switching ranges to avoid confusion
    // e.g. switching from specific day in 2023 to "Week" might be confusing if it stays in 2023 without context
    // But usually keeping the date focus is better. Let's keep it.

    const dateRangeLabel = useMemo(() => {
        const start = startOfRange(referenceDate, range);
        const end = endOfRange(referenceDate, range);

        switch (range) {
            case 'Day':
                return format(start, 'EEEE, MMM d, yyyy');
            case 'Week':
                // e.g. Jan 12 - Jan 18, 2025
                if (start.getFullYear() !== end.getFullYear()) {
                    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
                }
                return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
            case 'Month':
                return format(start, 'MMMM yyyy');
            case 'Year':
                return format(start, 'yyyy');
            default:
                return '';
        }
    }, [referenceDate, range]);

    const handlePrev = () => {
        setReferenceDate(prev => {
            switch (range) {
                case 'Day': return new Date(prev.setDate(prev.getDate() - 1));
                case 'Week': return new Date(prev.setDate(prev.getDate() - 7));
                case 'Month': return new Date(prev.setMonth(prev.getMonth() - 1));
                case 'Year': return new Date(prev.setFullYear(prev.getFullYear() - 1));
                default: return prev;
            }
        });
    };

    const handleNext = () => {
        setReferenceDate(prev => {
            switch (range) {
                case 'Day': return new Date(prev.setDate(prev.getDate() + 1));
                case 'Week': return new Date(prev.setDate(prev.getDate() + 7));
                case 'Month': return new Date(prev.setMonth(prev.getMonth() + 1));
                case 'Year': return new Date(prev.setFullYear(prev.getFullYear() + 1));
                default: return prev;
            }
        });
    };

    const handleToday = () => setReferenceDate(new Date());

    const sortedActivities = useMemo(() => {
        return Object.values(activities).sort((a, b) => a.name.localeCompare(b.name));
    }, [activities]);

    const toggleActivityVisibility = (id) => {
        setHiddenActivityIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllActivities = (show) => {
        if (show) {
            setHiddenActivityIds(new Set());
        } else {
            const allIds = Object.keys(activities);
            setHiddenActivityIds(new Set(allIds));
        }
    };

    const stats = useMemo(() => {
        let start, end;

        // Define the TARGET range based on referenceDate
        switch (range) {
            case 'Day':
                start = startOfDay(referenceDate);
                end = endOfDay(referenceDate);
                break;
            case 'Week':
                start = startOfWeek(referenceDate, { weekStartsOn: 1 });
                end = endOfWeek(referenceDate, { weekStartsOn: 1 });
                break;
            case 'Month':
                start = startOfMonth(referenceDate);
                end = endOfMonth(referenceDate);
                break;
            case 'Year':
                start = startOfYear(referenceDate);
                end = endOfYear(referenceDate);
                break;
            default:
                start = startOfDay(referenceDate);
                end = endOfDay(referenceDate);
        }

        const activityStats = {};
        let totalMinutes = 0;

        // Iterate ALL logs
        Object.entries(logs).forEach(([slotId, activityId]) => {
            // Skip if activity is hidden
            if (hiddenActivityIds.has(activityId)) return;

            const slotTime = parseISO(slotId);
            const activity = getActivity(activityId);
            const activityName = activity ? activity.name : '';
            const logicalDate = getLogicalDate(slotTime, activityName);

            // Check if logical date falls into our range
            if (activityId && isWithinInterval(logicalDate, { start, end })) {
                if (!activityStats[activityId]) {
                    activityStats[activityId] = 0;
                }
                activityStats[activityId] += 5;
                totalMinutes += 5;
            }
        });

        const data = Object.entries(activityStats).map(([id, minutes]) => {
            const activity = getActivity(id);
            return {
                name: activity ? activity.name : 'Unknown',
                minutes,
                hours: (minutes / 60).toFixed(1),
                color: activity ? activity.color : '#666',
                id
            };
        }).sort((a, b) => b.minutes - a.minutes);

        return { data, totalMinutes };
    }, [logs, range, referenceDate, getActivity, hiddenActivityIds]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Header and Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Analytics</h2>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className="glass-panel"
                            style={{
                                padding: '0.4rem 0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                border: 'none',
                                color: filterOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            <Icon name="Filter" size={16} />
                            Filter
                        </button>

                        <div className="glass-panel" style={{ display: 'flex', padding: '0.3rem', gap: '0.3rem', borderRadius: '8px', overflowX: 'auto' }}>
                            {RANGES.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRange(r)}
                                    style={{
                                        background: range === r ? 'var(--accent-primary)' : 'transparent',
                                        color: range === r ? 'white' : 'var(--text-secondary)',
                                        border: 'none',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Date Navigation Bar */}
                <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={handlePrev} className="icon-btn">
                        <Icon name="ChevronLeft" size={20} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>{dateRangeLabel}</span>
                        {!isWithinInterval(new Date(), {
                            start: startOfRange(referenceDate, range),
                            end: endOfRange(referenceDate, range)
                        }) && (
                                <button
                                    onClick={handleToday}
                                    style={{
                                        background: 'var(--accent-primary)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '2px 8px',
                                        fontSize: '0.8rem',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Jump to Today
                                </button>
                            )}
                    </div>

                    <button onClick={handleNext} className="icon-btn">
                        <Icon name="ChevronRight" size={20} />
                    </button>
                </div>

                {/* Filter Popup */}
                {filterOpen && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--accent-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500 }}>Filter Activities</span>
                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                                <button onClick={() => toggleAllActivities(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}>Select All</button>
                                <button onClick={() => toggleAllActivities(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Clear All</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            {sortedActivities.map(activity => (
                                <label key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.2rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={!hiddenActivityIds.has(activity.id)}
                                        onChange={() => toggleActivityVisibility(activity.id)}
                                        style={{ accentColor: activity.color }}
                                    />
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: activity.color }} />
                                    <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Time Tracked</span>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatDuration(stats.totalMinutes)}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>in selected period</span>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Most Active</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: stats.data[0]?.color || 'var(--text-primary)' }}>
                        {stats.data[0]?.name || '-'}
                    </span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        {stats.data[0] ? formatDuration(stats.data[0].minutes) : ''}
                    </span>
                </div>
            </div>

            {/* Charts */}
            {stats.data.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', height: '300px' }}>
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Distribution</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="minutes"
                                >
                                    {stats.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#E0E0E0' }}
                                    formatter={(value) => formatDuration(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Breakdown (Hours)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.data} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#A0A0A0' }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#E0E0E0' }}
                                    formatter={(value) => formatDuration(value)}
                                />
                                <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                                    {stats.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No data for this period
                </div>
            )}
        </div>
    );
};

// Helpers for date ranges
const startOfRange = (date, range) => {
    switch (range) {
        case 'Day': return startOfDay(date);
        case 'Week': return startOfWeek(date, { weekStartsOn: 1 });
        case 'Month': return startOfMonth(date);
        case 'Year': return startOfYear(date);
        default: return startOfDay(date);
    }
};

const endOfRange = (date, range) => {
    switch (range) {
        case 'Day': return endOfDay(date);
        case 'Week': return endOfWeek(date, { weekStartsOn: 1 });
        case 'Month': return endOfMonth(date);
        case 'Year': return endOfYear(date);
        default: return endOfDay(date);
    }
};

export default Analytics;
