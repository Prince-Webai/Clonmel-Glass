import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    label?: string;
    value: string;
    onChange: (date: string) => void;
    min?: string;
    max?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, min, max }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date()); // For navigation
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize navigation date based on value
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setCurrentDate(date);
            }
        }
    }, [showPicker]); // Reset when opening

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const firstDayOfMonth = (date: Date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon, 6=Sun) or standard (0=Sun)?? 
        // Variable InvoiceBuilder used 'en-US' locale usually, let's stick to standard Sunday start (0) for simplicity in grid, 
        // or typically business apps prefer Monday. Let's start with Sunday for standard JS getDay().
        // Actually, let's use standard Sunday start for the grid.
        // Sunday = 0
    };

    const getFirstDayIndex = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    }

    const navigateMonth = (direction: 1 | -1) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    };

    const handleDateClick = (day: number) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        // Adjust for timezone offset to get YYYY-MM-DD correctly
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${d}`;

        onChange(dateString);
        setShowPicker(false);
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();
    };

    const isSelected = (day: number) => {
        if (!value) return false;
        const selected = new Date(value);
        return day === selected.getDate() &&
            currentDate.getMonth() === selected.getMonth() &&
            currentDate.getFullYear() === selected.getFullYear();
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Generate days array
    const totalDays = daysInMonth(currentDate);
    const startPadding = getFirstDayIndex(currentDate);

    const days = [];
    for (let i = 0; i < startPadding; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                    {label}
                </label>
            )}
            <div
                className="relative cursor-pointer group"
                onClick={() => setShowPicker(!showPicker)}
            >
                <CalendarIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-500 transition-colors" />
                <div className={`w-full text-slate-900 bg-white border-2 rounded-xl px-4 py-3 text-sm transition-all flex items-center h-[46px] ${showPicker ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-slate-200 hover:border-slate-300'}`}>
                    {value ? new Date(value).toLocaleDateString('en-GB') : <span className="text-slate-400">Select Date...</span>}
                </div>
            </div>

            {showPicker && (
                <div className="absolute z-50 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-[300px] left-0 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-slate-800">{formatMonthYear(currentDate)}</span>
                        <button
                            onClick={() => navigateMonth(1)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                        {days.map((day, index) => (
                            <div key={index}>
                                {day ? (
                                    <button
                                        onClick={() => handleDateClick(day)}
                                        className={`w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center transition-all
                      ${isSelected(day)
                                                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                                                : isToday(day)
                                                    ? 'bg-brand-50 text-brand-600 border border-brand-200'
                                                    : 'text-slate-700 hover:bg-slate-100'
                                            }
                    `}
                                    >
                                        {day}
                                    </button>
                                ) : (
                                    <div className="w-8 h-8" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
