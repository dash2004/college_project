import React from 'react';
import clsx from 'clsx';

const StatsCard = ({ title, value, icon: Icon, color = "blue", subtext }) => {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        violet: "bg-violet-50 text-violet-600",
    };

    return (
        <div className="card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
                </div>
                <div className={clsx("p-3 rounded-xl", colorStyles[color])}>
                    <Icon size={24} />
                </div>
            </div>
            {subtext && <p className="text-xs text-slate-400 mt-4">{subtext}</p>}
        </div>
    );
};

export default StatsCard;
