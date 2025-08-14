import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import NoteModal from '../NoteModal';

// Mock Button to simplify interaction testing
jest.mock('@/components/Button', () => {
    const { TouchableOpacity, Text } = require('react-native');
    return ({ onPress, title, style }: any) => (
        <TouchableOpacity onPress={onPress} style={style} testID={`button-${title.toLowerCase()}`}>
            <Text>{title}</Text>
        </TouchableOpacity>
    );
});

// Mock useTheme
jest.mock('@/hooks/useTheme', () => ({
    useTheme: () => ({
        baseStyle: {
            modal_overlay: { padding: 10 },
            modal_content: { backgroundColor: 'white' },
            heading_3: { fontSize: 20 },
        },
    }),
}));

describe('NoteModal Component', () => {
    const mockConfirm = jest.fn();
    const mockCancel = jest.fn();
    const mockNoteChange = jest.fn();

    const defaultProps = {
        title: 'Add Note',
        note: 'Initial note',
        onConfirm: mockConfirm,
        onCancel: mockCancel,
        handleNoteChange: mockNoteChange,
        modalVisible: true,
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders modal with title and note input', () => {
        const { getByText, getByPlaceholderText } = render(<NoteModal {...defaultProps} />);

        expect(getByText('Add Note')).toBeTruthy();
        expect(getByPlaceholderText('Enter your note here')).toBeTruthy();
    });

    it('displays the passed note value', () => {
        const { getByDisplayValue } = render(<NoteModal {...defaultProps} />);
        expect(getByDisplayValue('Initial note')).toBeTruthy();
    });

    it('calls handleNoteChange when input changes', () => {
        const { getByPlaceholderText } = render(<NoteModal {...defaultProps} />);
        const input = getByPlaceholderText('Enter your note here');

        fireEvent.changeText(input, 'Updated note');
        expect(mockNoteChange).toHaveBeenCalledWith('Updated note');
    });

    it('calls onConfirm when Save button is pressed', () => {
        const { getByText } = render(<NoteModal {...defaultProps} />);
        const saveButton = getByText('Save');

        fireEvent.press(saveButton);
        expect(mockConfirm).toHaveBeenCalled();
    });

    it('calls onCancel when Cancel button is pressed', () => {
        const { getByText } = render(<NoteModal {...defaultProps} />);
        const cancelButton = getByText('Cancel');

        fireEvent.press(cancelButton);
        expect(mockCancel).toHaveBeenCalled();
    });

    it('does not render modal when modalVisible is false', () => {
        const { queryByText } = render(
            <NoteModal {...defaultProps} modalVisible={false} />
        );
        expect(queryByText('Add Note')).toBeNull();
    });
});
