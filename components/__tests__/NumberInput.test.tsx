import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import NumberInput from "@/components/NumberInput";


describe("NumberInput", () => {
    it("renders correctly", () => {
        const { getByPlaceholderText } = render(
            <NumberInput
                value={0}
                onChange={() => { }}
                placeholder="Enter number"
            />
        );
        expect(getByPlaceholderText("Enter number")).toBeTruthy();
    });

    it("calls onChange when text is changed", () => {
        const mockOnChange = jest.fn();
        const { getByPlaceholderText } = render(
            <NumberInput
                value={0}
                onChange={mockOnChange}
                placeholder="Enter number"
            />
        );
        fireEvent.changeText(getByPlaceholderText("Enter number"), "123");
        expect(mockOnChange).toHaveBeenCalledWith("123");
    });

    it("disables input when disabled prop is true", () => {
        const { getByPlaceholderText } = render(
            <NumberInput
                value={0}
                onChange={() => { }}
                placeholder="Enter number"
                disabled={true}
            />
        );
        const input = getByPlaceholderText("Enter number");
        expect(input.props.editable).toBe(false);
    });

    it("hides zero when hideZero prop is true", () => {
        const { getByPlaceholderText } = render(
            <NumberInput
                value={0}
                onChange={() => { }}
                placeholder="Enter number"
                hideZero={true}
            />
        );
        expect(getByPlaceholderText("Enter number").props.value).toBe("");
    }
    );
    it("shows zero when hideZero prop is false", () => {
        const { getByPlaceholderText } = render(
            <NumberInput
                value={0}
                onChange={() => { }}
                placeholder="Enter number"
                hideZero={false}
            />
        );
        expect(getByPlaceholderText("Enter number").props.value).toBe("0");
    }
    );
    it("shows the correct value when not hiding zero", () => {
        const { getByPlaceholderText } = render(
            <NumberInput
                value={123}
                onChange={() => { }}
                placeholder="Enter number"
                hideZero={false}
            />
        );
        expect(getByPlaceholderText("Enter number").props.value).toBe("123");
    }
    );
    it("shows the correct value when hiding zero", () => {
        const { getByPlaceholderText } = render(
            <NumberInput
                value={123}
                onChange={() => { }}
                placeholder="Enter number"
                hideZero={true}
            />
        );
        expect(getByPlaceholderText("Enter number").props.value).toBe("123");
    }
    );

    it("shows the correct value when value is NaN", () => {
        const { getByPlaceholderText } = render(
            <NumberInput
                value={NaN}
                onChange={() => { }}
                placeholder="Enter number"
                hideZero={true}
            />
        );
        expect(getByPlaceholderText("Enter number").props.value).toBe("");
    }
    );

});
