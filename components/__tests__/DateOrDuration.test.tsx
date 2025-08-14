import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import DateOrDuration, { DateOrDurationProps } from '@/components/DateOrDuration';
import { Platform, TextInput } from 'react-native';

// ---------------------------------------------------------------------------
// Jest mocks
// ---------------------------------------------------------------------------

// Force Android branch so the text date is visible
jest.mock('react-native/Libraries/Utilities/Platform', () => {
    const Actual = jest.requireActual('react-native/Libraries/Utilities/Platform');
    Actual.OS = 'android';
    return Actual;
});

// mock theme hook
jest.mock('@/hooks/useTheme', () => ({
    useTheme: () => ({
        baseStyle: { label: { fontSize: 16 } },
        colors: {
            fgColor: '#111',
            bgColor: '#fff',
            bgLightColor: '#eee',
            thrdColor: '#999',
            warnColor: '#f00',
            success: '#0f0',
            error: '#f00',
        },
    }),
}));

// --- NumberInput mock ----------------------------------
jest.mock('@/components/NumberInput', () => {
    // pull in React + RN *inside* the factory
    const React = require('react');
    const { TextInput } = require('react-native');

    // return a functional component
    return function MockNumberInput({
        value,
        onChange,
    }: {
        value: string | number;
        onChange: (text: string) => void;
    }) {
        return (
            <TextInput
                accessibilityLabel="number-input"
                value={String(value)}
                onChangeText={onChange}
            />
        );
    };
});

// --- DateTimePicker mock -------------------------------
jest.mock('@react-native-community/datetimepicker', () => {
    const React = require('react');
    const { TextInput } = require('react-native');

    return function MockPicker({
        onChange,
        value,
    }: {
        onChange: (event: any, date: Date) => void;
        value: Date;
    }) {
        return (
            <TextInput
                accessibilityLabel="date-picker"
                // trigger an onChange when the field receives focus in the test
                onFocus={() => {
                    const newDate = new Date(value.getTime() - 24 * 60 * 60 * 1000);
                    onChange({}, newDate);
                }}
            />
        );
    };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeProps = (partial: Partial<DateOrDurationProps> = {}): DateOrDurationProps => ({
    duration: 14,
    durationUnit: 'days',
    onDurationChange: jest.fn(),
    ...partial,
});

const advanceTo = (iso: string) => {
    jest.useFakeTimers().setSystemTime(new Date(iso));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DateOrDuration component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('calls onDurationChange with raw days when user types', () => {
        const spy = jest.fn();
        const { getByLabelText } = render(<DateOrDuration {...makeProps({ onDurationChange: spy })} />);
        fireEvent.changeText(getByLabelText('number-input'), '21');
        expect(spy).toHaveBeenCalledWith(21);
    });

    it('converts weeks to days before invoking callback', () => {
        const spy = jest.fn();
        const { getByLabelText } = render(
            <DateOrDuration {...makeProps({ durationUnit: 'weeks', onDurationChange: spy })} />,
        );
        fireEvent.changeText(getByLabelText('number-input'), '3');
        expect(spy).toHaveBeenCalledWith(21);
    });

    it('shows max warning text when durationTooHigh', () => {
        const { getByText } = render(
            <DateOrDuration {...makeProps({ durationTooHigh: true, maxDuration: 40 })} />,
        );
        expect(getByText('40 max!')).toBeTruthy();
    });

    
});
