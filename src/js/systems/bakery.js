// Bakery System for Bloom & Brew
import { QueueingModel } from '../algorithms/queuing-theory.js';
import { runRevenueSimulation } from '../algorithms/monte-carlo.js';

let game = null; // Module-scoped game engine instance

// Bakery product definitions
const BAKERY_PRODUCTS = {
    croissant: {
        id: 'croissant',
        name: 'Croissant',
        basePrice: 3.50,
        cost: 1.20,
        prepTime: 20, // minutes
        qualityDecay: 0.1, // per hour
        ingredients: {
            flour: 0.2,  // kg
            butter: 0.15, // kg
            yeast: 0.01, // kg
            sugar: 0.03, // kg
            salt: 0.005 // kg
        },
        complexity: 1,
        baseDemand: 15 // per day
    },
    sourdough: {
        id: 'sourdough',
        name: 'Sourdough Loaf',
        basePrice: 6.00,
        cost: 1.80,
        prepTime: 1440, // 24 hours (includes fermentation)
        qualityDecay: 0.05,
        ingredients: {
            flour: 0.5,
            water: 0.3,
            salt: 0.01,
            starter: 0.1 // kg of sourdough starter
        },
        complexity: 2,
        baseDemand: 8
    },
    // Add more products as needed
};

// Bakery system state
let bakeryState = {
    inventory: {
        flour: 50, // kg
        butter: 20, // kg
        yeast: 5, // kg
        sugar: 10, // kg
        salt: 2, // kg
        water: 100, // liters
        starter: 5 // kg
    },
    products: {},
    queue: [],
    activeBatches: [],
    equipment: {
        ovens: 2,
        mixers: 1,
        proofingBoxes: 3
    },
    staff: {
        bakers: 2,
        skillLevel: 1.0 // Multiplier for production speed/quality
    },
    recipes: { ...BAKERY_PRODUCTS },
    qualityMultiplier: 1.0,
    efficiency: 1.0
};

// Initialize the bakery system
export function initBakery(gameEngine) {
    game = gameEngine;
    // Initialize products
    for (const [id, product] of Object.entries(BAKERY_PRODUCTS)) {
        bakeryState.products[id] = {
            ...product,
            currentStock: 0,
            price: product.basePrice,
            demand: product.baseDemand,
            popularity: 0.5 // 0 to 1 scale
        };
    }
    
    return {
        update,
        getState: () => ({ ...bakeryState }),
        bakeProduct,
        restockIngredients,
        getAvailableProducts,
        updatePrices,
        forecastDemand,
        getProductionRecommendations,
        handleSpecialEvent
    };
}

// Update bakery state
export function update(gameTime, deltaTime) {
    // Update active batches
    updateBatches(deltaTime);
    
    // Update product quality over time
    updateProductQuality(deltaTime);
    
    // Update demand based on time of day and other factors
    updateDemand();
    
    // Process queue if there are bakers available
    processQueue();
    
    // Random events (e.g., equipment failure, ingredient spoilage)
    if (Math.random() < 0.001 * deltaTime) {
        triggerRandomEvent();
    }
}

// Update active batches
export function updateBatches(deltaTime) {
    for (let i = bakeryState.activeBatches.length - 1; i >= 0; i--) {
        const batch = bakeryState.activeBatches[i];
        batch.timeRemaining -= deltaTime * bakeryState.staff.skillLevel * bakeryState.efficiency;
        
        if (batch.timeRemaining <= 0) {
            // Batch is complete
            const product = bakeryState.products[batch.productId];
            const quality = calculateBatchQuality(batch);
            const quantity = batch.quantity;
            
            // Add to inventory
            product.currentStock += quantity;
            product.quality = quality;
            
            // Remove from active batches
            bakeryState.activeBatches.splice(i, 1);
            
            // Notify player
            game.playerStats.lastNotification = {
                type: 'success',
                message: `Baked ${quantity} ${product.name}${quantity > 1 ? 's' : ''} (Quality: ${Math.round(quality * 100)}%)`
            };
        }
    }
}

// Calculate batch quality based on various factors
export function calculateBatchQuality(batch) {
    let quality = 0.8; // Base quality
    
    // Skill impact
    quality *= bakeryState.staff.skillLevel;
    
    // Equipment impact
    const equipmentQuality = 0.9 + (Math.random() * 0.2); // 0.9-1.1
    quality *= equipmentQuality;
    
    // Recipe complexity impact
    const recipe = bakeryState.recipes[batch.productId];
    quality *= Math.max(0.5, 1 - (recipe.complexity * 0.1));
    
    // Random variation
    quality *= 0.9 + (Math.random() * 0.2);
    
    return Math.min(1, Math.max(0, quality));
}

// Update product quality over time
export function updateProductQuality(deltaTime) {
    const hoursPassed = deltaTime / 60; // Convert minutes to hours
    
    for (const product of Object.values(bakeryState.products)) {
        if (product.currentStock > 0 && product.qualityDecay) {
            // Quality degrades over time
            const decayFactor = 1 - (product.qualityDecay * hoursPassed);
            product.quality = (product.quality || 1) * decayFactor;
        }
    }
}

// Update demand based on time of day and other factors
export function updateDemand() {
    const hour = Math.floor((game.gameTime / 60) % 24);
    let demandMultiplier = 1.0;
    
    // Time-based demand
    if (hour >= 7 && hour < 10) {
        demandMultiplier = 1.5; // Morning rush
    } else if (hour >= 11 && hour < 14) {
        demandMultiplier = 2.0; // Lunch rush
    } else if (hour >= 17 && hour < 20) {
        demandMultiplier = 1.8; // Dinner rush
    } else {
        demandMultiplier = 0.5; // Slow hours
    }
    
    // Update demand for each product
    for (const product of Object.values(bakeryState.products)) {
        // Base demand with random variation
        const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8-1.2
        product.demand = Math.max(1, Math.floor(
            (product.baseDemand * demandMultiplier * randomFactor) / 24 // Per hour
        ));
        
        // Update popularity based on sales and quality
        if (product.salesToday) {
            const salesFactor = Math.min(1, product.salesToday / (product.baseDemand * 0.5));
            const qualityFactor = product.quality || 1;
            product.popularity = Math.max(0.1, Math.min(0.9, 
                (product.popularity || 0.5) * 0.9 + (salesFactor * qualityFactor * 0.1)
            ));
            product.salesToday = 0; // Reset for next day
        }
    }
}

// Process baking queue
export function processQueue() {
    if (bakeryState.queue.length === 0) return;
    
    // Check for available bakers
    const availableBakers = bakeryState.staff.bakers - bakeryState.activeBatches.length;
    
    if (availableBakers <= 0) return;
    
    // Process up to available bakers from the queue
    const batchesToStart = Math.min(availableBakers, bakeryState.queue.length);
    
    for (let i = 0; i < batchesToStart; i++) {
        const batch = bakeryState.queue.shift();
        bakeryState.activeBatches.push(batch);
    }
}

// Trigger a random bakery event
export function triggerRandomEvent(game) {
    const events = [
        // Positive events
        {
            name: 'Happy Accident',
            description: 'Your bakers discovered a new technique!',
            effect: () => { bakeryState.qualityMultiplier += 0.05; },
            probability: 0.3
        },
        {
            name: 'Efficient Day',
            description: 'Everything is running smoothly today.',
            effect: () => { bakeryState.efficiency = 1.2; },
            probability: 0.4
        },
        // Negative events
        {
            name: 'Oven Malfunction',
            description: 'One of the ovens broke down!',
            effect: () => { 
                bakeryState.equipment.ovens = Math.max(1, bakeryState.equipment.ovens - 1);
                // Add repair cost
                game.playerStats.money -= 100;
            },
            probability: 0.2
        },
        {
            name: 'Ingredient Spoilage',
            description: 'Some of your ingredients went bad!',
            effect: () => {
                for (const ingredient in bakeryState.inventory) {
                    bakeryState.inventory[ingredient] *= 0.8; // Lose 20% of each ingredient
                }
            },
            probability: 0.1
        }
    ];
    
    // Select random event based on probability
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const event of events) {
        cumulativeProbability += event.probability;
        if (random <= cumulativeProbability) {
            // Trigger the event
            event.effect();
            
            // Notify player
            game.playerStats.lastNotification = {
                type: event.effect === events[0].effect || event.effect === events[1].effect ? 'success' : 'error',
                message: `${event.name}: ${event.description}`
            };
            
            break;
        }
    }
}

// Bake a product
export function bakeProduct(productId, quantity, game) {
    const product = bakeryState.products[productId];
    if (!product) {
        throw new Error(`Product ${productId} not found`);
    }
    
    // Check ingredients
    const requiredIngredients = { ...product.ingredients };
    for (const [ingredient, amount] of Object.entries(requiredIngredients)) {
        requiredIngredients[ingredient] = amount * quantity;
        
        if (bakeryState.inventory[ingredient] < requiredIngredients[ingredient]) {
            throw new Error(`Not enough ${ingredient}`);
        }
    }
    
    // Deduct ingredients
    for (const [ingredient, amount] of Object.entries(requiredIngredients)) {
        bakeryState.inventory[ingredient] -= amount;
    }
    
    // Calculate production time (in minutes)
    const productionTime = (product.prepTime * quantity) / bakeryState.staff.skillLevel;
    
    // Create batch
    const batch = {
        productId,
        quantity,
        startTime: game.gameTime,
        timeRemaining: productionTime,
        quality: 1.0 // Starts at 100%
    };
    
    // Add to queue
    bakeryState.queue.push(batch);
    
    return batch;
}

// Restock ingredients
export function restockIngredients(order, game) {
    let totalCost = 0;
    
    // Calculate costs and update inventory
    for (const [ingredient, amount] of Object.entries(order)) {
        if (!(ingredient in bakeryState.inventory)) {
            throw new Error(`Invalid ingredient: ${ingredient}`);
        }
        
        // Simple pricing model - in a real game, this would be more complex
        const pricePerUnit = {
            flour: 2.5,
            butter: 8.0,
            yeast: 15.0,
            sugar: 3.0,
            salt: 1.0,
            water: 0.1,
            starter: 5.0
        }[ingredient] || 1.0;
        
        totalCost += pricePerUnit * amount;
        bakeryState.inventory[ingredient] = (bakeryState.inventory[ingredient] || 0) + amount;
    }
    
    // Deduct money
    game.playerStats.money -= totalCost;
    
    return { success: true, totalCost };
}

// Get available products with current stock and pricing
export function getAvailableProducts() {
    return Object.values(bakeryState.products).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.currentStock,
        quality: product.quality || 1.0,
        demand: product.demand
    }));
}

// Update product prices
export function updatePrices(newPrices) {
    for (const [productId, price] of Object.entries(newPrices)) {
        if (bakeryState.products[productId]) {
            bakeryState.products[productId].price = price;
        }
    }
}

// Forecast demand using Monte Carlo simulation
export function forecastDemand(days = 7, simulations = 1000) {
    const results = {};
    
    for (const [productId, product] of Object.entries(bakeryState.products)) {
        const baseDemand = product.baseDemand * days;
        const volatility = baseDemand * 0.3; // 30% volatility
        
        const simulation = runRevenueSimulation({
            baseRevenue: baseDemand,
            dailyVolatility: volatility / baseDemand,
            days: 1, // We're simulating the entire period as one
            simulations
        });
        
        results[productId] = {
            expected: baseDemand,
            min: simulation.statistics.min,
            max: simulation.statistics.max,
            percentiles: simulation.statistics.percentiles
        };
    }
    
    return results;
}

// Get production recommendations based on current state
export function getProductionRecommendations() {
    const recommendations = [];
    const forecast = forecastDemand(1, 500);
    
    for (const [productId, product] of Object.entries(bakeryState.products)) {
        const currentStock = product.currentStock;
        const expectedDemand = forecast[productId]?.expected || product.baseDemand;
        const safetyStock = expectedDemand * 0.3; // 30% safety stock
        const targetStock = Math.ceil(expectedDemand + safetyStock);
        const needed = Math.max(0, targetStock - currentStock);
        
        if (needed > 0) {
            recommendations.push({
                productId,
                productName: product.name,
                currentStock,
                recommendedBatch: Math.ceil(needed / 5) * 5, // Round to nearest 5
                expectedDemand: Math.round(expectedDemand * 10) / 10
            });
        }
    }
    
    // Sort by priority (highest demand/stock ratio first)
    recommendations.sort((a, b) => 
        (b.expectedDemand / (b.currentStock || 1)) - (a.expectedDemand / (a.currentStock || 1))
    );
    
    return recommendations;
}

// Handle special events (e.g., holidays, festivals)
export function handleSpecialEvent(eventType) {
    const events = {
        holiday: {
            name: 'Holiday Season',
            effect: () => {
                // Increase demand for all products
                for (const product of Object.values(bakeryState.products)) {
                    product.baseDemand *= 1.5;
                }
                return 'Increased demand for all products!';
            }
        },
        festival: {
            name: 'Local Festival',
            effect: () => {
                // Increase demand for specific products
                if (bakeryState.products.croissant) {
                    bakeryState.products.croissant.baseDemand *= 2;
                }
                return 'Increased demand for pastries!';
            }
        },
        // Add more event types as needed
    };
    
    if (events[eventType]) {
        const message = events[eventType].effect();
        return {
            success: true,
            event: events[eventType].name,
            message
        };
    }
    
    return {
        success: false,
        message: 'Unknown event type'
    };
}
