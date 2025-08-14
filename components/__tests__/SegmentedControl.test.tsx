import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SegmentedControl from '@/components/SegmentedControl';

describe('SegmentedControl', () => {
    const options = ['Option A', 'Option B', 'Option C'];
    const selectedOption = 'Option B';
    const onSelectMock = jest.fn();

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders all options', () => {
        const { getByText } = render(
            <SegmentedControl
                options={options}
                selectedOption={selectedOption}
                onSelect={onSelectMock}
            />
        );

        options.forEach(option => {
            expect(getByText(option)).toBeTruthy();
        });
    });

    it('applies selected and unselected styles correctly', () => {
        const { getByText } = render(
            <SegmentedControl
                options={options}
                selectedOption="Option B"
                onSelect={onSelectMock}
                fgColor="green"
                bgColor="black"
                buttonStyleSelected={{ fontWeight: 'bold' }}
                buttonStyleUnselected={{ fontWeight: 'normal' }}
            />
        );

        const selectedText = getByText('Option B');
        const unselectedText = getByText('Option A');

        expect(selectedText.props.style).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    backgroundColor: 'green',
                    color: 'black',
                    fontWeight: 'bold'
                })
            ])
        );

        expect(unselectedText.props.style).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    color: 'green',
                    fontWeight: 'normal'
                })
            ])
        );
    });

    it('triggers onSelect when tapping an unselected option', () => {
        const { getByText } = render(
            <SegmentedControl
                options={options}
                selectedOption="Option A"
                onSelect={onSelectMock}
            />
        );

        fireEvent.press(getByText('Option B'));
        expect(onSelectMock).toHaveBeenCalledWith('Option B');
    });

    it('does not trigger onSelect if disabled', () => {
        const { getByText } = render(
            <SegmentedControl
                options={options}
                selectedOption="Option A"
                onSelect={onSelectMock}
                disabled={true}
            />
        );

        fireEvent.press(getByText('Option B'));
        expect(onSelectMock).not.toHaveBeenCalled();
    });

    it('applies reduced opacity when disabled', () => {
        const { getByTestId } = render(
            <SegmentedControl
                options={options}
                selectedOption="One"
                onSelect={onSelectMock}
                disabled={true}
            />
        );

        const container = getByTestId('segmented-control-container');

        expect(container.props.style).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ opacity: 0.2 })
            ])
        );
    });

    it('restores full opacity when not disabled', () => {
        const { getByTestId } = render(
            <SegmentedControl
                options={options}
                selectedOption="One"
                onSelect={onSelectMock}
                disabled={false}
            />
        );

        const container = getByTestId('segmented-control-container');

        expect(container.props.style).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ opacity: 1 })
            ])
        );
    });

    it('respects custom container style', () => {
        const { getByTestId } = render(
            <SegmentedControl
                options={['One', 'Two']}
                selectedOption="One"
                onSelect={jest.fn()}
                containerStyle={{ marginTop: 20 }}
            />
        );

        const container = getByTestId('segmented-control-container');

        expect(container.props.style).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ marginTop: 20 })
            ])
        );
    });

    it('applies selected style to only one option', () => {

        const options = ['Alpha', 'Beta', 'Gamma'];
        
        const { getByText } = render(
            <SegmentedControl
                options={options}
                selectedOption="Beta"
                onSelect={jest.fn()}
                fgColor="blue"
                bgColor="white"
            />
        );

        // Get all text elements
        const selected = getByText('Beta');
        const unselected1 = getByText('Alpha');
        const unselected2 = getByText('Gamma');

        // Selected should have backgroundColor = fgColor (i.e. 'blue')
        expect(selected.props.style).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ backgroundColor: 'blue' })
            ])
        );

        // Unselected should NOT have backgroundColor = fgColor
        expect(unselected1.props.style).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({ backgroundColor: 'blue' })
            ])
        );

        expect(unselected2.props.style).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({ backgroundColor: 'blue' })
            ])
        );
    });
});


