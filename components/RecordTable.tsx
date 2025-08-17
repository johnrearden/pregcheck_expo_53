import { RecordType } from '@/contexts/RecordContext';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
});

const formatDate = (rawDate?: string | number | Date) => {
    if (!rawDate) return 'Invalid date';
    try {
        return formatter.format(new Date(rawDate));
    } catch {
        return 'Invalid date';
    }
};

const getDueDate = (record: RecordType) => {
    if (!record.pregnancy_status || !record.date) return 'Empty';

    const gestation = record.gestation_days || 0;
    const daysPregnant = record.days_pregnant || 0;
    const date = new Date(record.date);

    const dueDate = new Date(date);
    dueDate.setDate(date.getDate() - daysPregnant + gestation);

    return formatter.format(dueDate);
};

const columnWidths = {
    tag: 80,
    date: 80,
    dueDate: 80,
    calfCount: 60,
    note: 200,
};

const Table = ({ records }: { records: RecordType[] }) => {
    return (
        <ScrollView horizontal>
            <View style={styles.table}>
                {/* Header */}
                <View style={[styles.row, styles.headerRow]}>
                    <Text style={[styles.cell, { width: columnWidths.tag }]}>Tag</Text>
                    <Text style={[styles.cell, { width: columnWidths.date }]}>Date</Text>
                    <Text style={[styles.cell, { width: columnWidths.dueDate }]}>Due</Text>
                    <Text style={[styles.cell, { width: columnWidths.calfCount }]}>Count</Text>
                    <Text style={[styles.cell, { width: columnWidths.note }]}>Note</Text>
                </View>

                {/* Body */}
                {records.map((record, index) => (
                    <View style={styles.row} key={`${record.tag}-${index}`}>
                        <Text style={[styles.cell, { width: columnWidths.tag }]}>{record.tag}</Text>
                        <Text style={[styles.cell, { width: columnWidths.date }]}>{formatDate(record.date)}</Text>
                        <Text style={[styles.cell, { width: columnWidths.dueDate }]}>{getDueDate(record)}</Text>
                        <Text style={[styles.cell, { width: columnWidths.calfCount }]}>{record.calf_count ?? '-'}</Text>
                        <Text style={[styles.cell, { width: columnWidths.note }]}>{record.note ?? '-'}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    table: {
        padding: 10,
        minWidth: 600,
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
        paddingVertical: 6,
    },
    headerRow: {
        backgroundColor: '#f0f0f0',
    },
    cell: {
        paddingHorizontal: 6,
        fontSize: 14,
        color: '#333',
    },
});

export default Table;
