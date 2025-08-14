// __tests__/StringInput.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StringInput from '@/components/StringInput';
import { flattenStyle } from '@/utilities/test_utils/flattenStyle';

// Mock the hooks
jest.mock('@/hooks/useTheme', () => ({
    useTheme: () => ({
        baseStyle: {
            numberInput: {
                fontSize: 20,
                color: '#333333',
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                padding: 8,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: '#cccccc',
                width: '100%'
            }
        },
        colors: {
            bgColor: '#F5F5F5',
            fgColor: '#333333',
        }
    })
}));

describe('StringInput component', () => {
    it('should be not editable when disabled is true', () => {
        const { getByPlaceholderText } = render(
            <StringInput
                placeholder="Test input"
                value="Test"
                onChange={() => { }}
                disabled={true}
            />
        );

        const input = getByPlaceholderText('Test input');
        expect(input.props.editable).toBe(false);
        expect(input.props.selectTextOnFocus).toBe(false);
    });

    it('should be editable when disabled is false or undefined', () => {
        const { getByPlaceholderText } = render(
            <StringInput
                placeholder="Editable input"
                value="Test"
                onChange={() => { }}
            />
        );

        const input = getByPlaceholderText('Editable input');
        expect(input.props.editable).toBe(true);
        expect(input.props.selectTextOnFocus).toBe(true);
    });
    
    it('should call onChange when text changes', () => {
        const mockOnChange = jest.fn();
        const { getByDisplayValue } = render(
            <StringInput
                value="Initial text"
                onChange={mockOnChange}
            />
        );
        
        const input = getByDisplayValue('Initial text');
        fireEvent.changeText(input, 'New text');
        
        expect(mockOnChange).toHaveBeenCalledWith('New text');
        expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
    
    it('should merge custom styles with baseStyle', () => {
        const customStyle = { 
            color: 'red', 
            fontSize: 24,
        };
        
        const { getByDisplayValue } = render(
            <StringInput
                value="Styled text"
                onChange={() => {}}
                style={customStyle}
            />
        );
        
        const input = getByDisplayValue('Styled text');
        const flattenedStyle = flattenStyle(input.props.style);
        
        // Custom styles should override base styles
        expect(flattenedStyle.color).toBe('red');
        expect(flattenedStyle.fontSize).toBe(24);
        
        // Base styles should still be present if not overridden
        expect(flattenedStyle.textAlign).toBe('center');
        expect(flattenedStyle.borderRadius).toBe(5);
    });
    
    it('should set numeric keyboard when numericOnly is true', () => {
        const { getByDisplayValue } = render(
            <StringInput
                value="123"
                onChange={() => {}}
                numericOnly={true}
            />
        );
        
        const input = getByDisplayValue('123');
        expect(input.props.keyboardType).toBe('numeric');
    });
    
    it('should hide zero value when hideZero is true', () => {
        const { getByTestId, rerender } = render(
            <StringInput
                value="0"
                onChange={() => {}}
                hideZero={true}
                testID="input"
            />
        );
        
        const input = getByTestId('input');
        expect(input.props.value).toBe('');
        
        // When value is not zero, it should show normally
        rerender(
            <StringInput
                value="10"
                onChange={() => {}}
                hideZero={true}
                testID="input"
            />
        );
        
        const updatedInput = getByTestId('input');
        expect(updatedInput.props.value).toBe('10');
    });
    
    it('should not hide zero value when hideZero is false or undefined', () => {
        const { getByDisplayValue } = render(
            <StringInput
                value="0"
                onChange={() => {}}
                hideZero={false}
            />
        );
        
        const input = getByDisplayValue('0');
        expect(input.props.value).toBe('0');
    });
});
