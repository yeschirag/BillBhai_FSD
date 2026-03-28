/**
 * validation.js — Client-side form validation for Step 1
 */

const Validator = (() => {
    'use strict';

    function validateCustomerStep(name, phone) {
        const errors = {};
        
        if (!name || name.trim() === '') {
            errors.name = 'Customer name is required.';
        } else if (name.trim().length < 3) {
            errors.name = 'Name must be at least 3 characters.';
        }

        if (!phone || phone.trim() === '') {
            errors.phone = 'Phone number is required.';
        } else if (!/^\d{10}$/.test(phone.trim())) {
            errors.phone = 'Phone must be exactly 10 digits.';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    return {
        validateCustomerStep
    };
})();
