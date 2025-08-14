import React, { createContext, useContext, useState, useMemo } from 'react';
import { RecordType } from './RecordContext';

export interface StatsType {
    total: number;
    pregnant: number;
    empty: number;
    single: number;
    twins: number;
    triplets: number;
    quads: number;
    quins: number;
    dates?: Date[];
}

interface StatsContextType {
    stats: StatsType;
    calculateStats: (records: RecordType[]) => void;
    resetStats: () => void;
}

const initialStats: StatsType = {
    total: 0,
    pregnant: 0,
    empty: 0,
    single: 0,
    twins: 0,
    triplets: 0,
    quads: 0,
    quins: 0,
    dates: [],
};

const defaultContext: StatsContextType = {
    stats: initialStats,
    calculateStats: () => { },
    resetStats: () => { }
};

const StatsContext = createContext<StatsContextType>(defaultContext);

export const useStats = () => useContext(StatsContext);

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stats, setStats] = useState<StatsType>(initialStats);

    // Calculate statistics from a list of records
    const calculateStats = (records: RecordType[]) => {
        // Start with fresh stats
        let newStats = { ...initialStats };

        const dates = [];

        // Loop through each record and update counters
        for (const record of records) {

            if (!record.pregnancy_status) {
                // Skip records without pregnancy status
                newStats.empty += 1;
                newStats.total += 1;
                continue;
            }

            // Calculate the due date
            const today = new Date();
            const daysPregnant = record.days_pregnant || 0;
            const gestationPeriod = record.gestation_days || 0;
            const inseminationDate = today.getTime() - (daysPregnant * 24 * 60 * 60 * 1000);
            const dueDate = new Date(inseminationDate + (gestationPeriod * 24 * 60 * 60 * 1000));
            dates.push(dueDate);

            newStats.total += 1;

            // Update pregnancy counters
            newStats.pregnant += 1;

            // Update calf count counters
            switch (record.calf_count) {
                case 1:
                    newStats.single += 1;
                    break;
                case 2:
                    newStats.twins += 1;
                    break;
                case 3:
                    newStats.triplets += 1;
                    break;
                case 4:
                    newStats.quads += 1;
                    break;
                case 5:
                    newStats.quins += 1;
                    break;
                default:
                    break;
            }
        }
        // Sort the dates in ascending order
        newStats.dates = dates.sort((a, b) => a.getTime() - b.getTime());

        setStats(newStats);
        return newStats;
    };

    // Reset statistics to initial values
    const resetStats = () => {
        setStats({ ...initialStats });
    };

    // Memoized stats values to prevent unnecessary renders
    const value = useMemo(() => ({
        stats,
        calculateStats,
        resetStats
    }), [stats]);

    return (
        <StatsContext.Provider value={value}>
            {children}
        </StatsContext.Provider>
    );
};
