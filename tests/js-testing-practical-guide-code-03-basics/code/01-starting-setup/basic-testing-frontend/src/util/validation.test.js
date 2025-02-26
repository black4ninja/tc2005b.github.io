import { it, expect, describe } from 'vitest';
import { validateNumber, validateStringNotEmpty } from './validation';

describe('validateStringNotEmpty()', () => {
    it ('should throw an error if string empty', () => {
        //Arrange
        const input = "";
        
        //Act
        const result = () => validateStringNotEmpty(input);
        
        //Assert
        expect(result).toThrow();
    });

    it ('should not throw an error if string is not empty', () => {
        //Arrange
        const input = "not an empty string";
        
        //Act
        const result = () => validateStringNotEmpty(input);
        
        //Assert
        expect(result).not.throw();
    });
    
});

describe('validateNumber()', () => {
    it ('should throw an error if input is not a number', () => {
        //Arrange
        const input = "asdf";
        const input2 = '1';
    
        //Act
        const result = () => validateNumber(input);
        const result2 = () => validateNumber(input2);
        
        //Assert
        expect(result).toThrow();
        expect(result2).toThrow();
    });
});