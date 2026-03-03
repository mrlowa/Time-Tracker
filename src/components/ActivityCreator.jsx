import React, { useState } from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';
import Icon from './Icon';

const PRESET_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
    '#84CC16', '#14B8A6', '#0EA5E9', '#8B5CF6', '#D946EF',
    '#F472B6', '#FB7185', '#E11D48', '#BE123C', '#4338CA',
    '#78350F', '#111827', '#4B5563', '#9CA3AF', '#FCD34D'
];

const PRESET_ICONS = [
    'Briefcase', 'Code', 'Coffee', 'Utensils', 'Moon',
    'Dumbbell', 'Book', 'Music', 'Gamepad2', 'ShoppingCart',
    'Home', 'Car', 'Plane', 'Zap', 'Star',
    'Sun', 'Cloud', 'Umbrella', 'Watch', 'Camera',
    'Video', 'Mic', 'Headphones', 'Speaker', 'Wifi',
    'Battery', 'Cpu', 'Database', 'Server', 'Terminal',
    'CreditCard', 'DollarSign', 'Gift', 'Heart', 'Smile'
];

const ActivityCreator = ({ onClose, activityToEdit }) => {
    const { addActivity, updateActivity, deleteActivity } = useTimeTracker();
    const [name, setName] = useState(activityToEdit ? activityToEdit.name : '');
    const [color, setColor] = useState(activityToEdit ? activityToEdit.color : PRESET_COLORS[0]);
    const [icon, setIcon] = useState(activityToEdit ? activityToEdit.icon : PRESET_ICONS[0]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            if (activityToEdit) {
                updateActivity(activityToEdit.id, { name, color, icon });
            } else {
                addActivity(name, color, icon);
            }
            onClose();
        }
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this activity?')) {
            deleteActivity(activityToEdit.id);
            onClose();
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0 }}>{activityToEdit ? 'Edit Activity' : 'Create Activity'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Name</label>
                    <input
                        className="input-dark"
                        style={{ width: '100%' }}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g., Deep Work"
                        autoFocus
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Color</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: c,
                                    border: color === c ? '2px solid white' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'all 0.2s'
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Icon</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto' }}>
                        {PRESET_ICONS.map(i => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setIcon(i)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: icon === i ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Icon name={i} size={16} />
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    {activityToEdit && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{
                                padding: '0.8rem',
                                background: 'transparent',
                                border: '1px solid #EF4444',
                                color: '#EF4444',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Delete Activity"
                        >
                            <Icon name="Trash2" size={18} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ flex: 1 }}
                    >
                        {activityToEdit ? 'Save Changes' : 'Create'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default ActivityCreator;
