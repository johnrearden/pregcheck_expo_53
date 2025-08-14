// __tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '@/components/Button';
import { flattenStyle } from '../../utilities/test_utils/flattenStyle';

describe('Button component', () => {

    it('renders outline style when outline prop is true', () => {
        const { getByText } = render(
            <Button title="Outline Btn" onPress={() => { }} outline />
        );

        const buttonText = getByText('Outline Btn');
        expect(buttonText).toBeTruthy();
    });

    it('renders gradient style when outline is false or undefined', () => {
        const { getByText } = render(
            <Button title="Gradient Btn" onPress={() => { }} />
        );

        const buttonText = getByText('Gradient Btn');
        expect(buttonText).toBeTruthy();
    });

    it('calls onPress when pressed (outline)', () => {
        const mockFn = jest.fn();
        const { getByText } = render(
            <Button title="Tap Me" onPress={mockFn} outline />
        );

        fireEvent.press(getByText('Tap Me'));
        expect(mockFn).toHaveBeenCalled();
    });

    it('calls onPress when pressed (gradient)', () => {
        const mockFn = jest.fn();
        const { getByText } = render(
            <Button title="Tap Me" onPress={mockFn} />
        );

        fireEvent.press(getByText('Tap Me'));
        expect(mockFn).toHaveBeenCalled();
    });

    it('does not call onPress when disabled (outline)', () => {
        const mockFn = jest.fn();
        const { getByText } = render(
            <Button title="Disabled" onPress={mockFn} outline disabled />
        );

        fireEvent.press(getByText('Disabled'));
        expect(mockFn).not.toHaveBeenCalled();
    });

    it('has opacity 0.5 when disabled', () => {
        const { getByTestId } = render(
            <Button title="Disabled" onPress={() => { }} disabled />
        );

        const wrapper = getByTestId('button-wrapper');
        const style = flattenStyle(wrapper.props.style); 

        expect(style.opacity).toBe(0.5);
    });

    it('has opacity 1 when enabled', () => {
        const { getByText } = render(
            <Button title="Enabled" onPress={() => { }} />
        );

        const text = getByText('Enabled');
        const parentView = text.parent?.parent;

        const flattenedStyle = Array.isArray(parentView?.props.style)
            ? Object.assign({}, ...parentView.props.style)
            : parentView?.props.style;

        expect(flattenedStyle.opacity).toBe(1);
    });

});
