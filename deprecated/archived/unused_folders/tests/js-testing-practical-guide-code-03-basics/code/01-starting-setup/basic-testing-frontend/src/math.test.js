import { it, expect } from 'vitest';
import { add } from './math';

it ('should summarize all the numbers in the array', () => {
    //Arrange
    const numbers = [1, 2, 3];
    
    //Act
    const result  = add(numbers);
    
    //Assert
    expect(result).toBe(6);
});

it('should tield NaN if at least one invalid number is provided', () => {
    const inputs = ['invalid', 1];

    const result = add(inputs);

    expect(result).toBeNaN();
});

it('should yield a correct sum if an array of numeric string values is provided', () => {
    const inputs = ['1', '2'];

    const result = add(inputs);

    expect(result).toBe(3);
});

it('should yield 0 if an empty array is provided', () => {
    const inputs  = [];

    const result = add(inputs);

    expect(result).toBe(0);
});

it('should throw an error if no value is passed into the function', () => {
    const resultFn = () => {
        add();
    };

    expect(resultFn).toThrow();
});

it('should throw an error if provided with multiple arguments instead of an array', () => {
    const num1 = 1;
    const num2 = 5
    
    const resultFn = () => {
        add(num1, num2);
    };
    
    expect(resultFn).toThrow(/is not iterable/);
})