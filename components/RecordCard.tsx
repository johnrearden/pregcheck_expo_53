import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RecordType } from '@/contexts/RecordContext';
import { useTheme } from '@/hooks/useTheme';

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
    if (!record.pregnancy_status || !record.date) return 'Invalid date';

    const gestation = record.gestation_days || 0;
    const daysPregnant = record.days_pregnant || 0;
    const date = new Date(record.date);

    const dueDate = new Date(date);
    dueDate.setDate(date.getDate() - daysPregnant + gestation);

    return formatter.format(dueDate);
};

const RecordCard = ({ record }: { record: RecordType }) => {
    const date = formatDate(record.date);
    const dueDate = getDueDate(record);

    const { colors } = useTheme();

    const styles = StyleSheet.create({
        card: {
            borderWidth: 1,
            borderColor: colors.thrdColor,
            borderRadius: 10,
            padding: 12,
            marginVertical: 8,
            backgroundColor: colors.bgColor,
            shadowColor: colors.buttonColor,
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 2, // for Android
        },
        row: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
            marginBottom: 4,
        },
        label: {
            fontWeight: 'bold',
            color: '#444',
            marginRight: 4,
            width: "40%",
        },
        rightLabel: {
            marginLeft: 20,
        },
        value: {
            fontSize: 16,
            color: '#222',
        },
    });

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.label}>Tag:</Text>
                <Text style={styles.value}>{record.tag}</Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label]}>Scanned:</Text>
                <Text style={styles.value}>{date}</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>Due Date:</Text>
                <Text style={styles.value}>{dueDate}</Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label]}>Offspring:</Text>
                <Text style={styles.value}>{record.calf_count ?? '-'}</Text>
            </View>

            <View style={{ marginTop: 8 }}>
                <Text style={styles.label}>Note:</Text>
                <Text style={styles.value}>{record.note || '-'}</Text>
            </View>
        </View>
    );
};



export default RecordCard;
