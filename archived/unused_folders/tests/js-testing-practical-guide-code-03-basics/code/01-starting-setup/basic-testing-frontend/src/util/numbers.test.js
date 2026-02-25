import { it, expect } from 'vitest';
import { transformToNumber } from './numbers';

it ('should transfrom string to number', () => {
    //Arrange
    const input = "12";
    
    //Act
    const result = transformToNumber(input);
    
    //Assert
    expect(result).toBeTypeOf('number');
});

it ('Should yield NaN for non transformable values', () => {
    //Arrange
    const input = "invalid";
    const input2 = {};
    
    //Act
    const result = transformToNumber(input);
    const result2 = transformToNumber(input2);
    
    //Assert
    expect(result).toBeNaN();
    expect(result2).toBeNaN();
});