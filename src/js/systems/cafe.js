import { QueueingModel } from '../algorithms/queuing-theory.js';

// Customer types with different behaviors and preferences
const CUSTOMER_TYPES = {
    student: {
        name: 'Student',
        basePatience: 10, // minutes
        baseSpend: 8,
        tipMultiplier: 1.0,
        orderPreferences: ['coffee', 'croissant', 'muffin'],
        specialRequests: 0.1 // 10% chance of special request
    },
    business: {
        name: 'Business Person',
        basePatience: 8,
        baseSpend: 12,
        tipMultiplier: 1.5,
        orderPreferences: ['espresso', 'sandwich', 'salad'],
        specialRequests: 0.2
    },
    tourist: {
        name: 'Tourist',
        basePatience: 15,
        baseSpend: 15,
        tipMultiplier: 2.0,
        orderPreferences: ['cake', 'tea', 'special'],
        specialRequests: 0.3
    },
    regular: {
        name: 'Regular',
        basePatience: 12,
        baseSpend: 10,
        tipMultiplier: 1.8,
        orderPreferences: ['coffee', 'muffin', 'special'],
        specialRequests: 0.15
    }
};

// Menu items with base prices and preparation times (in minutes)
const MENU_ITEMS = {
    // Beverages
    coffee: { price: 3.5, prepTime: 2, type: 'beverage' },
    espresso: { price: 2.5, prepTime: 3, type: 'beverage' },
    tea: { price: 3.0, prepTime: 2, type: 'beverage' },
    latte: { price: 4.5, prepTime: 4, type: 'beverage' },
    cappuccino: { price: 4.0, prepTime: 4, type: 'beverage' },
    
    // Food items
    croissant: { price: 2.5, prepTime: 1, type: 'food', requiresBakery: true },
    muffin: { price: 3.0, prepTime: 1, type: 'food', requiresBakery: true },
    sandwich: { price: 7.0, prepTime: 5, type: 'food' },
    salad: { price: 8.0, prepTime: 4, type: 'food' },
    cake: { price: 5.0, prepTime: 1, type: 'food', requiresBakery: true },
    
    // Special items
    special: { price: 10.0, prepTime: 8, type: 'special', requiresBakery: true }
};

class Customer {
    constructor(type, gameTime) {
        const customerType = CUSTOMER_TYPES[type] || CUSTOMER_TYPES.student;
        this.type = type;
        this.name = customerType.name;
        this.patience = customerType.basePatience * (0.8 + Math.random() * 0.4); // Randomize patience ±20%
        this.spendingPower = customerType.baseSpend * (0.8 + Math.random() * 0.4);
        this.tipMultiplier = customerType.tipMultiplier * (0.9 + Math.random() * 0.2);
        this.orderPreferences = [...customerType.orderPreferences];
        this.hasSpecialRequest = Math.random() < customerType.specialRequests;
        this.arrivalTime = gameTime;
        this.order = null;
        this.table = null;
        this.state = 'entering'; // entering, waiting, ordering, waiting_for_order, eating, paying, leaving
        this.satisfaction = 100; // 0-100%
        this.visual = null; // DOM element representing the customer
        this.waitStartTime = 0;
    }

    // Generate an order based on preferences and available items
    generateOrder(availableItems) {
        // Filter available items by customer preferences and what's in stock
        const preferredItems = this.orderPreferences.filter(item => 
            availableItems.includes(item) && 
            (!MENU_ITEMS[item].requiresBakery || this.checkBakeryAvailability(item))
        );

        // If no preferred items are available, pick any available item
        const itemsToChooseFrom = preferredItems.length > 0 ? preferredItems : availableItems;
        
        if (itemsToChooseFrom.length === 0) {
            return null; // No items available
        }

        // Select a random item from available options
        const selectedItem = itemsToChooseFrom[Math.floor(Math.random() * itemsToChooseFrom.length)];
        
        // Determine quantity (1-3 items)
        const quantity = 1 + Math.floor(Math.random() * 3);
        
        // Calculate total price and prep time
        const itemPrice = MENU_ITEMS[selectedItem].price;
        const totalPrice = itemPrice * quantity;
        const prepTime = MENU_ITEMS[selectedItem].prepTime;
        
        // Create order
        this.order = {
            item: selectedItem,
            quantity,
            totalPrice,
            prepTime,
            specialRequest: this.hasSpecialRequest ? this.generateSpecialRequest() : null,
            status: 'pending',
            timePlaced: 0,
            timeCompleted: 0
        };
        
        return this.order;
    }
    
    checkBakeryAvailability(item) {
        // This would check with the bakery system if the item is available
        // For now, we'll assume it's available
        return true;
    }
    
    generateSpecialRequest() {
        const specialRequests = [
            'Extra hot',
            'No sugar',
            'Extra cream',
            'On the side',
            'Gluten-free',
            'Vegan option',
            'Extra spicy'
        ];
        return specialRequests[Math.floor(Math.random() * specialRequests.length)];
    }
    
    update(gameTime, timeDelta) {
        // Update customer state based on current situation
        switch (this.state) {
            case 'waiting':
            case 'waiting_for_order':
                // Decrease satisfaction while waiting
                const waitTime = (gameTime - this.waitStartTime) / 60; // Convert to minutes
                this.satisfaction = Math.max(0, 100 - (waitTime * 5)); // Lose 5% satisfaction per minute
                
                // Check if customer has waited too long
                if (waitTime > this.patience) {
                    this.state = 'leaving';
                    return { type: 'customer_left', reason: 'waited_too_long' };
                }
                break;
                
            case 'eating':
                // Increase satisfaction while eating
                this.satisfaction = Math.min(100, this.satisfaction + (timeDelta * 0.5));
                // After some time, customer is ready to pay
                if (gameTime - this.waitStartTime > 10 * 60) { // 10 minutes to eat
                    this.state = 'paying';
                    this.waitStartTime = gameTime;
                }
                break;
                
            case 'paying':
                // Wait for payment to be processed
                if (gameTime - this.waitStartTime > 1 * 60) { // 1 minute to pay
                    this.state = 'leaving';
                    return { 
                        type: 'payment_received', 
                        amount: this.order.totalPrice,
                        tip: this.calculateTip()
                    };
                }
                break;
        }
        
        return null;
    }
    
    getVisual() {
        switch(this.type) {
            case 'student': return '🎓';
            case 'business': return '💼';
            case 'tourist': return '📷';
            case 'regular': return '😊';
            default: return '👤';
        }
    }

    calculateTip() {
        // Base tip is 10-20% of order total, modified by satisfaction and type
        const baseTip = this.order.totalPrice * (0.1 + (Math.random() * 0.1));
        const satisfactionModifier = this.satisfaction / 100; // 0-1 based on satisfaction
        return baseTip * satisfactionModifier * this.tipMultiplier;
    }
}

class CafeSystem {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.tables = [];
        this.customers = [];
        this.orders = [];
        this.availableServers = 2; // Starting number of servers
        this.busyServers = 0;
        this.queue = [];
        this.dailyEarnings = 0;
        this.dailyCustomers = 0;
        this.queueModel = new QueueingModel(0.5, 0.3, 2); // Start with 2 servers
        
        // Initialize tables (4 tables to start)
        this.initializeTables(4);
        this.cafeView = document.getElementById('cafe-view');
    }
    
    initializeTables(count) {
        for (let i = 0; i < count; i++) {
            this.tables.push({
                id: i,
                customer: null,
                status: 'empty', // empty, waiting, eating, dirty
                timeOccupied: 0
            });
        }
    }
    
    spawnCustomer() {
        // Determine customer type based on time of day and other factors
        const customerTypes = Object.keys(CUSTOMER_TYPES);
        const type = customerTypes[Math.floor(Math.random() * customerTypes.length)];
        
        const customer = new Customer(type, this.game.gameTime);
        this.customers.push(customer);
        this.queue.push(customer);
        customer.state = 'waiting';
        customer.waitStartTime = this.game.gameTime;
        
        // Update queue model
        this.updateQueueModel();
        
        return customer;
    }
    
    updateQueueModel() {
        // Update queue model based on current state
        const arrivalRate = this.queue.length / (this.game.gameTime / 60); // Customers per minute
        const serviceRate = (this.availableServers * 0.3); // Each server can handle ~0.3 customers per minute
        
        // Update queue model with new rates
        this.queueModel = new QueueingModel(arrivalRate, serviceRate, this.availableServers);
    }
    
    // Process customer flow and orders
    update(timeDelta) {
        // Update all customers
        for (let i = this.customers.length - 1; i >= 0; i--) {
            const customer = this.customers[i];
            const result = customer.update(this.game.gameTime, timeDelta);
            
            // Handle customer events
            if (result) {
                if (result.type === 'customer_left') {
                    this.handleCustomerLeave(customer, result.reason);
                    this.customers.splice(i, 1);
                } else if (result.type === 'payment_received') {
                    this.handlePayment(customer, result.amount, result.tip);
                    this.handleCustomerLeave(customer, 'paid');
                    this.customers.splice(i, 1);
                }
            }
        }
        
        // Process orders
        this.processOrders(timeDelta);
        
        // Handle queue
        this.processQueue();
        
        // More frequent customer spawning for testing
        if (Math.random() < 0.05 && this.customers.length < 10) { // 5% chance per update
            this.spawnCustomer();
        }

        // Render the cafe state
        this.render();
    }
    
    processQueue() {
        // Find customers waiting in queue
        const waitingCustomers = this.queue.filter(c => c.state === 'waiting');
        
        // Try to seat customers
        for (const customer of waitingCustomers) {
            const table = this.findAvailableTable();
            if (table) {
                this.seatCustomer(customer, table);
                // Remove from queue
                this.queue = this.queue.filter(c => c !== customer);
            } else {
                // No tables available, customer remains in queue
                break;
            }
        }
        
        // Update queue model
        this.updateQueueModel();
    }
    
    findAvailableTable() {
        return this.tables.find(table => table.status === 'empty' || table.status === 'dirty');
    }
    
    seatCustomer(customer, table) {
        // Clean table if needed
        if (table.status === 'dirty') {
            // In a real game, this would take some time
            table.status = 'cleaning';
            // Simulate cleaning time
            setTimeout(() => {
                table.status = 'empty';
            }, 3000);
            return false;
        }
        
        // Seat customer
        table.customer = customer;
        table.status = 'waiting';
        customer.table = table;
        customer.state = 'waiting';
        customer.waitStartTime = this.game.gameTime;
        
        // Generate order
        const availableItems = Object.keys(MENU_ITEMS);
        customer.generateOrder(availableItems);
        
        // Add to orders queue
        if (customer.order) {
            customer.order.timePlaced = this.game.gameTime;
            this.orders.push(customer.order);
            customer.state = 'waiting_for_order';
        }
        
        return true;
    }
    
    processOrders(timeDelta) {
        // Start preparing pending orders if servers are available
        const pendingOrders = this.orders.filter(o => o.status === 'pending');
        const preparingOrders = this.orders.filter(o => o.status === 'preparing');
        
        // Start new orders if we have server capacity
        if (preparingOrders.length < this.availableServers && pendingOrders.length > 0) {
            const ordersToStart = Math.min(
                this.availableServers - preparingOrders.length,
                pendingOrders.length
            );
            
            for (let i = 0; i < ordersToStart; i++) {
                pendingOrders[i].status = 'preparing';
                pendingOrders[i].timeStarted = this.game.gameTime;
            }
        }
        
        // Process orders that are being prepared
        for (const order of this.orders.filter(o => o.status === 'preparing')) {
            // Simulate order preparation
            const prepTimeElapsed = (this.game.gameTime - (order.timeStarted || order.timePlaced)) / 60; // in minutes
            if (prepTimeElapsed >= order.prepTime) {
                order.status = 'ready';
                order.timeCompleted = this.game.gameTime;
                this.serveOrder(order);
            }
        }
    }
    
    serveOrder(order) {
        // Find customer who placed the order
        const customer = this.customers.find(c => c.order === order);
        if (customer) {
            customer.state = 'eating';
            customer.waitStartTime = this.game.gameTime;
            
            // Update satisfaction based on wait time
            const waitTime = (this.game.gameTime - order.timePlaced) / 60; // in minutes
            const expectedWaitTime = order.prepTime * 1.5; // 50% buffer for expected wait
            
            if (waitTime > expectedWaitTime) {
                // Decrease satisfaction for long wait
                const waitPenalty = (waitTime - expectedWaitTime) * 5; // 5% per minute over
                customer.satisfaction = Math.max(0, customer.satisfaction - waitPenalty);
            } else {
                // Small satisfaction boost for quick service
                customer.satisfaction = Math.min(100, customer.satisfaction + 5);
            }
            
            // Mark order as served
            order.status = 'served';
        }
    }
    
    render() {
        if (!this.cafeView) {
            this.cafeView = document.getElementById('cafe-view');
            if (!this.cafeView) return; // Still can't find it, exit
        }

        // Clear existing content
        this.cafeView.innerHTML = '';

        // Create and append tables
        this.tables.forEach((table, index) => {
            const tableElement = document.createElement('div');
            tableElement.className = `table ${table.status}`;
            tableElement.id = `table-${index}`;
            
            // Add customer if table is occupied
            if (table.customer) {
                const customerElement = document.createElement('div');
                customerElement.className = 'customer';
                customerElement.textContent = table.customer.getVisual();
                tableElement.appendChild(customerElement);
                
                // Add satisfaction indicator
                const satisfactionElement = document.createElement('div');
                satisfactionElement.className = 'satisfaction';
                satisfactionElement.style.width = `${table.customer.satisfaction}%`;
                tableElement.appendChild(satisfactionElement);
            } else {
                // Show table number when empty
                const tableLabel = document.createElement('div');
                tableLabel.className = 'table-label';
                tableLabel.textContent = `Table ${index + 1}`;
                tableElement.appendChild(tableLabel);
            }
            
            this.cafeView.appendChild(tableElement);
        });

        // Show queue if there are customers waiting
        if (this.queue.length > 0) {
            const queueElement = document.createElement('div');
            queueElement.className = 'queue-area';
            
            const queueLabel = document.createElement('div');
            queueLabel.className = 'queue-label';
            queueLabel.textContent = `Queue (${this.queue.length})`;
            queueElement.appendChild(queueLabel);
            
            this.queue.forEach(customer => {
                const customerElement = document.createElement('div');
                customerElement.className = 'customer queue-customer';
                customerElement.textContent = customer.getVisual();
                customerElement.title = `${customer.name} - Patience: ${Math.round(customer.patience)}min`;
                queueElement.appendChild(customerElement);
            });
            
            this.cafeView.appendChild(queueElement);
        } else {
            // Show empty cafe message
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-cafe-message';
            emptyMessage.textContent = 'Waiting for customers...';
            this.cafeView.appendChild(emptyMessage);
        }
    }
    
    handlePayment(customer, amount, tip) {
        // Add to daily earnings
        this.dailyEarnings += amount + tip;
        this.dailyCustomers++;
        
        // Update player stats
        this.game.playerStats.money += amount + tip;
        
        // Update reputation based on satisfaction
        const repChange = Math.floor((customer.satisfaction - 50) / 10); // -5 to +5
        this.game.playerStats.reputation = Math.max(0, Math.min(100, 
            this.game.playerStats.reputation + repChange));
        
        // Free up the table
        if (customer.table) {
            customer.table.status = 'dirty';
            customer.table.customer = null;
            customer.table = null;
        }
    }
    

    handleCustomerLeave(customer, reason) {
        // Handle different leave reasons
        switch (reason) {
            case 'waited_too_long':
                // Penalty for making customer wait too long
                this.game.playerStats.reputation = Math.max(0, 
                    this.game.playerStats.reputation - 2);
                break;
                
            case 'no_available_tables':
                // Smaller penalty for not having tables
                this.game.playerStats.reputation = Math.max(0, 
                    this.game.playerStats.reputation - 1);
                break;
        }
        
        // Free up the table if customer was seated
        if (customer.table) {
            customer.table.status = 'dirty';
            customer.table.customer = null;
        }
        
        // Remove from any queues
        this.queue = this.queue.filter(c => c !== customer);
    }
    
    // Add more methods for order taking, serving, etc.
}

// Initialize the cafe system
export function initCafe(gameEngine) {
    const cafeSystem = new CafeSystem(gameEngine);
    cafeSystem.cafeView = document.getElementById('cafe-view');
    if (cafeSystem.cafeView) {
        cafeSystem.cafeView.innerHTML = ''; // Clear any existing content
    }
    
    return cafeSystem;
}
