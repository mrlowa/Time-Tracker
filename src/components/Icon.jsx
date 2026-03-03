import React from 'react';
import * as LucideIcons from 'lucide-react';

const Icon = ({ name, size = 20, className = '' }) => {
    const LucideIcon = LucideIcons[name];

    if (!LucideIcon) {
        return <LucideIcons.HelpCircle size={size} className={className} />;
    }

    return <LucideIcon size={size} className={className} />;
};

export default Icon;
