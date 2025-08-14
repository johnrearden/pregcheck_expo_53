import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TagInput, { TagInputProps } from '@/components/TagInput';
import { useTheme } from '@/hooks/useTheme';

// Mock the theme hook to return predictable colors
jest.mock('@/hooks/useTheme', () => ({
  useTheme: jest.fn(),
}));

const MOCK_COLORS = {
  fgColor: '#111111',
  bgLightColor: '#ffffff',
  warnColor: '#ff0000',
  success: '#00ff00',
  thrdColor: '#888888',
};

describe('TagInput component', () => {
  const defaultProps: TagInputProps = {
    tag: '',
    tagSupplied: false,
    tagIsDuplicate: false,
    handleTagChange: jest.fn(),
    testID: 'tag-input',
  };

  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
    jest.clearAllMocks();
  });

  it('renders the placeholder when tag is empty', () => {
    const { getByPlaceholderText } = render(<TagInput {...defaultProps} />);
    const input = getByPlaceholderText('Enter tag');
    expect(input).toBeTruthy();
  });

  it('calls handleTagChange when text is entered', () => {
    const handleTagChange = jest.fn();
    const props = { ...defaultProps, handleTagChange };
    const { getByPlaceholderText } = render(<TagInput {...props} />);
    const input = getByPlaceholderText('Enter tag');
    fireEvent.changeText(input, 'ABC123');
    expect(handleTagChange).toHaveBeenCalledWith('ABC123');
  });

  it('shows "Valid" message when tag is supplied and not duplicate', () => {
    const props = { ...defaultProps, tag: 'ABC', tagSupplied: true, tagIsDuplicate: false };
    const { getByText } = render(<TagInput {...props} />);
    expect(getByText('Valid')).toBeTruthy();
  });

  it('shows "Duplicate" message when tag is duplicate', () => {
    const props = { ...defaultProps, tag: 'XYZ', tagSupplied: true, tagIsDuplicate: true };
    const { getByText } = render(<TagInput {...props} />);
    expect(getByText('Duplicate')).toBeTruthy();
  });

  it('applies warning border color when tag is empty', () => {
    const { getByPlaceholderText } = render(<TagInput {...defaultProps} />);
    const input = getByPlaceholderText('Enter tag');
    const style = input.props.style;
    // style array: find borderColor entry
    const borderColorStyle = Array.isArray(style)
      ? style.find((s: any) => s.borderColor === MOCK_COLORS.warnColor)
      : style;
    expect(borderColorStyle).toBeDefined();
  });

  it('applies success border color when tag is supplied and not duplicate', () => {
    const props = { ...defaultProps, tag: 'A1', tagSupplied: true, tagIsDuplicate: false };
    const { getByPlaceholderText } = render(<TagInput {...props} />);
    const input = getByPlaceholderText('Enter tag');
    const style = input.props.style;
    const borderColorStyle = Array.isArray(style)
      ? style.find((s: any) => s.borderColor === MOCK_COLORS.success)
      : style;
    expect(borderColorStyle).toBeDefined();
  });

  it('applies warn border color when tag is duplicate', () => {
    const props = { ...defaultProps, tag: '123', tagSupplied: true, tagIsDuplicate: true };
    const { getByPlaceholderText } = render(<TagInput {...props} />);
    const input = getByPlaceholderText('Enter tag');
    const style = input.props.style;
    const borderColorStyle = Array.isArray(style)
      ? style.find((s: any) => s.borderColor === MOCK_COLORS.warnColor)
      : style;
    expect(borderColorStyle).toBeDefined();
  });

  it('renders testID on TextInput when provided', () => {
    const props = { ...defaultProps, testID: 'custom-test-id' };
    const { getByTestId } = render(<TagInput {...props} />);
    expect(getByTestId('custom-test-id')).toBeTruthy();
  });
});