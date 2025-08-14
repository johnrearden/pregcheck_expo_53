import React from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import { WeightRecordType } from '@/contexts/WeightRecordContext';

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

const columnWidths = {
    tag: 80,
    date: 80,
    weight: 60,
    sex: 40,
    age: 60,
    note: 200,
};

const Table = ({ records }: { records: WeightRecordType[] }) => {
    return (
        <ScrollView horizontal>
            <View style={styles.table}>
                {/* Header */}
                <View style={[styles.row, styles.headerRow]}>
                    <Text style={[styles.cell, { width: columnWidths.tag }]}>Tag</Text>
                    <Text style={[styles.cell, { width: columnWidths.date }]}>Date</Text>
                    <Text style={[styles.cell, { width: columnWidths.weight }]}>Weight</Text>
                    <Text style={[styles.cell, { width: columnWidths.sex }]}>Sex</Text>
                    <Text style={[styles.cell, { width: columnWidths.age }]}>Age</Text>
                    <Text style={[styles.cell, { width: columnWidths.note }]}>Note</Text>
                </View>

                {/* Body */}
                {records.map((record, index) => (
                    <View style={styles.row} key={`${record.tag}-${index}`}>
                        <Text style={[styles.cell, { width: columnWidths.tag }]}>{record.tag}</Text>
                        <Text style={[styles.cell, { width: columnWidths.date }]}>{formatDate(record.date)}</Text>
                        <Text style={[styles.cell, { width: columnWidths.weight }]}>{record.weight} {record.weight_unit}s</Text>
                        <Text style={[styles.cell, { width: columnWidths.sex }]}>{record.sex === 'female' ? 'F' : 'M'}</Text>
                        <Text style={[styles.cell, { width: columnWidths.age }]}>{record.age_in_days ?? '-'}d</Text>
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
    },
});

export default Table;
