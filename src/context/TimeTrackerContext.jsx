/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TimeTrackerContext = createContext();

const STORAGE_KEYS = {
    ACTIVITIES: 'time_tracker_activities',
    LOGS: 'time_tracker_logs',
};

const DEFAULT_ACTIVITIES = [
    { id: '1', name: 'Sleep', color: '#60A5FA', icon: 'Moon' },
    { id: '2', name: 'Work', color: '#34D399', icon: 'Briefcase' },
    { id: '3', name: 'Eating', color: '#FBBF24', icon: 'Utensils' },
    { id: '4', name: 'Leisure', color: '#A78BFA', icon: 'Coffee' },
    { id: '5', name: 'Exercise', color: '#F87171', icon: 'Dumbbell' },
];

export const TimeTrackerProvider = ({ children }) => {
    const [activities, setActivities] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
        return saved ? JSON.parse(saved) : DEFAULT_ACTIVITIES;
    });

    const [logs, setLogs] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    }, [activities]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    }, [logs]);

    const addActivity = (name, color, icon) => {
        const newActivity = {
            id: uuidv4(),
            name,
            color,
            icon,
        };
        setActivities([...activities, newActivity]);
    };

    const updateActivity = (id, updates) => {
        setActivities(activities.map(act => act.id === id ? { ...act, ...updates } : act));
    };

    const deleteActivity = (id) => {
        setActivities(activities.filter(act => act.id !== id));
        // Optional: Only allow deleting if no logs exist? Or keep logs but show "Deleted"?
        // For simplicity, we keep logs but they might map to undefined activity. 
        // Handled in UI by falling back to a default placeholder.
    };

    // Log a specific time slot (timestamp should be ISO string or consistent ID for the 5-min slot)
    const logSlot = (slotId, activityId) => {
        setLogs(prev => {
            if (!activityId) {
                const newLogs = { ...prev };
                delete newLogs[slotId];
                return newLogs;
            }
            return {
                ...prev,
                [slotId]: activityId,
            };
        });
    };

    // Bulk log for range interaction (e.g. drag)
    const logSlots = (slotIds, activityId) => {
        setLogs(prev => {
            const newLogs = { ...prev };
            slotIds.forEach(id => {
                if (!activityId) {
                    delete newLogs[id];
                } else {
                    newLogs[id] = activityId;
                }
            });
            return newLogs;
        });
    };

    const getActivity = (id) => activities.find(a => a.id === id);

    return (
        <TimeTrackerContext.Provider value={{
            activities,
            logs,
            addActivity,
            updateActivity,
            deleteActivity,
            logSlot,
            logSlots,
            getActivity
        }}>
            {children}
        </TimeTrackerContext.Provider>
    );
};

export const useTimeTracker = () => useContext(TimeTrackerContext);
