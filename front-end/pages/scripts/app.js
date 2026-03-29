/**
 * app.js — Main POS Application Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // Initialize mock database
    DataStore.init();

    // Hook UI to Data actions
    UI.setCallbacks({
        onCheckout: (dataPayload) => {
            // Once user triggers "Proceed to Payment",
            // We finalize the cart into the background DB.
            const newOrder = DataStore.createOrder(
                dataPayload.customer, 
                dataPayload.cart, 
                dataPayload.discount
            );
            
            // In a real scenario, this is where we redirect to Stripe/Razorpay gateway.
            // On completion, their webhook handles Status = Paid.
            console.log("Simulating Gateway redirect for Order:", newOrder);
        }
    });

    // Boot UI wizard
    UI.init();
});
