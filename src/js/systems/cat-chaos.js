// Schrödinger's Chaos System for Bloom & Brew
// Manages the cat's behavior and random chaotic events

let game = null; // Module-scoped game engine instance

// Cat state
let catState = {
    name: 'Schrödinger',
    mood: 'sleeping', // sleeping, playing, mischievous, chaotic
    chaosLevel: 0, // 0-100, increases when player is AFK/distracted
    lastInteraction: Date.now(),
    isPresent: true,
    currentActivity: null,
    cooldown: 0,
    affection: 50, // 0-100, affects likelihood of positive/negative actions
    chaosEvents: []
};

// Possible cat activities
const CAT_ACTIVITIES = [
    // Neutral activities
    {
        id: 'sleeping',
        name: 'Sleeping',
        description: 'The cat is peacefully napping.',
        mood: 'sleeping',
        chaosChange: -0.1,
        minAffection: 0,
        duration: [30000, 120000], // 30s to 2 minutes
        isDistracting: false
    },
    {
        id: 'grooming',
        name: 'Grooming',
        description: 'The cat is cleaning itself.',
        mood: 'content',
        chaosChange: -0.05,
        minAffection: 0,
        duration: [15000, 45000],
        isDistracting: false
    },
    
    // Positive activities (higher affection required)
    {
        id: 'purring',
        name: 'Purring',
        description: 'The cat is purring contentedly.',
        mood: 'happy',
        chaosChange: -0.2,
        minAffection: 30,
        duration: [20000, 60000],
        isDistracting: false,
        effect: () => {
            // Slight boost to customer satisfaction
            game.playerStats.customerSatisfaction = Math.min(100, game.playerStats.customerSatisfaction + 2);
            return 'Customers are charmed by the purring cat!';
        }
    },
    {
        id: 'gift',
        name: 'Brings a Gift',
        description: 'The cat brings you a "gift".',
        mood: 'affectionate',
        chaosChange: -0.3,
        minAffection: 60,
        duration: [10000, 20000],
        isDistracting: true,
        effect: () => {
            // Random positive effect
            const effects = [
                () => { game.playerStats.money += 10; return 'The cat brought you a coin!' },
                () => { 
                    // Find a random product to restock
                    const products = Object.values(game.systems.bakery.getState().products);
                    if (products.length > 0) {
                        const product = products[Math.floor(Math.random() * products.length)];
                        product.currentStock += 3;
                        return `The cat found some extra ${product.name}s!`;
                    }
                    return 'The cat tried to help but got distracted.';
                },
                () => { 
                    game.playerStats.customerSatisfaction = Math.min(100, game.playerStats.customerSatisfaction + 5);
                    return 'Customers love the cat\'s antics!';
                }
            ];
            const randomEffect = effects[Math.floor(Math.random() * effects.length)];
            return randomEffect();
        }
    },
    
    // Negative activities (triggered by high chaos or low affection)
    {
        id: 'knock_over',
        name: 'Knocks Over Display',
        description: 'The cat knocks over a display!',
        mood: 'mischievous',
        chaosChange: 0.3,
        minAffection: -Infinity,
        duration: [5000, 15000],
        isDistracting: true,
        effect: () => {
            // Reduce stock of a random product
            const bakery = game.systems.bakery.getState();
            const products = Object.values(bakery.products).filter(p => p.currentStock > 0);
            
            if (products.length > 0) {
                const product = products[Math.floor(Math.random() * products.length)];
                const lost = Math.min(product.currentStock, Math.ceil(product.currentStock * 0.3)); // Up to 30% of stock
                product.currentStock -= lost;
                
                // Small chance to reduce customer satisfaction
                if (Math.random() > 0.7) {
                    game.playerStats.customerSatisfaction = Math.max(0, game.playerStats.customerSatisfaction - 5);
                    return `The cat knocked over the ${product.name} display! Lost ${lost} items and some customer satisfaction.`;
                }
                
                return `The cat knocked over the ${product.name} display! Lost ${lost} items.`;
            }
            
            return 'The cat knocked something over, but nothing was damaged.';
        }
    },
    {
        id: 'block_door',
        name: 'Blocks Doorway',
        description: 'The cat is sitting in the doorway, blocking customers.',
        mood: 'stubborn',
        chaosChange: 0.4,
        minAffection: -Infinity,
        duration: [20000, 40000],
        isDistracting: true,
        effect: () => {
            // Reduce customer flow
            game.playerStats.customerSatisfaction = Math.max(0, game.playerStats.customerSatisfaction - 8);
            return 'The cat is blocking the doorway, making it hard for customers to enter!';
        }
    },
    {
        id: 'steal_food',
        name: 'Steals Food',
        description: 'The cat steals food from a customer!',
        mood: 'chaotic',
        chaosChange: 0.5,
        minAffection: -Infinity,
        duration: [10000, 20000],
        isDistracting: true,
        effect: () => {
            // Significant impact on customer satisfaction
            game.playerStats.customerSatisfaction = Math.max(0, game.playerStats.customerSatisfaction - 15);
            
            // But the cat might leave a "gift" later
            if (Math.random() > 0.7) {
                catState.affection += 5;
                catState.chaosEvents.push({
                    type: 'delayed',
                    time: Date.now() + 60000, // 1 minute later
                    effect: () => {
                        game.playerStats.money += 5;
                        return 'The cat left a coin on the counter as an apology!';
                    }
                });
            }
            
            return 'The cat stole food from a customer! They are not happy.';
        }
    }
];

// Initialize the cat chaos system
export function initCatChaos(gameEngine) {
    game = gameEngine;
    // Start with a neutral activity
    startNewActivity('sleeping');
    
    return {
        update,
        getState: () => ({ ...catState }),
        interact,
        petCat,
        feedCat,
        scoldCat,
        getCurrentActivity: () => catState.currentActivity 
            ? { ...catState.currentActivity, timeRemaining: catState.activityEnd - Date.now() }
            : null
    };
}

// Update cat state
export function update(gameTime, deltaTime) {
    const now = Date.now();
    
    // Update cooldown
    if (catState.cooldown > 0) {
        catState.cooldown = Math.max(0, catState.cooldown - deltaTime);
    }
    
    // Process delayed events
    processDelayedEvents();
    
    // Check if current activity is done
    if (catState.currentActivity && now >= catState.activityEnd) {
        // If the activity had an effect, apply it
        if (catState.currentActivity.effect) {
            const message = catState.currentActivity.effect();
            if (message) {
                game.playerStats.lastNotification = {
                    type: catState.currentActivity.chaosChange >= 0 ? 'error' : 'success',
                    message
                };
            }
        }
        
        // Reset current activity
        catState.currentActivity = null;
    }
    
    // Update chaos level based on player activity
    updateChaosLevel();
    
    // Start a new activity if none is active and cooldown is over
    if (!catState.currentActivity && catState.cooldown <= 0) {
        startRandomActivity();
    }
}

// Process any delayed events
export function processDelayedEvents() {
    const now = Date.now();
    const remainingEvents = [];
    
    for (const event of catState.chaosEvents) {
        if (event.time <= now) {
            // Execute the event
            const message = event.effect();
            if (message) {
                game.playerStats.lastNotification = {
                    type: 'info',
                    message
                };
            }
        } else {
            remainingEvents.push(event);
        }
    }
    
    catState.chaosEvents = remainingEvents;
}

// Update chaos level based on player activity
export function updateChaosLevel() {
    const now = Date.now();
    const timeSinceInteraction = (now - catState.lastInteraction) / 1000; // in seconds
    
    // Increase chaos if player is inactive
    if (timeSinceInteraction > 30) {
        catState.chaosLevel = Math.min(100, catState.chaosLevel + (timeSinceInteraction - 30) * 0.01);
    }
    
    // Decrease chaos slowly over time if affection is high
    if (catState.affection > 60) {
        catState.chaosLevel = Math.max(0, catState.chaosLevel - 0.005);
    }
}

// Start a new activity
function startNewActivity(activityId) {
    const activity = CAT_ACTIVITIES.find(a => a.id === activityId);
    if (!activity) return;
    
    catState.currentActivity = activity;
    const duration = activity.duration[0] + Math.random() * (activity.duration[1] - activity.duration[0]);
        
        // Adjust for affection
        weight *= (catState.affection / 100) * 0.5 + 0.75; // Between 0.75 and 1.25
        
        return weight;
    });
    
    // Select weighted random activity
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;
    
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            selectedIndex = i;
            break;
        }
    }
    
    startNewActivity(availableActivities[selectedIndex].id);
}

// Start a specific activity by ID
export function startNewActivity(activityId) {
    const activity = CAT_ACTIVITIES.find(a => a.id === activityId) || CAT_ACTIVITIES[0];
    const duration = activity.duration 
        ? activity.duration[0] + Math.random() * (activity.duration[1] - activity.duration[0])
        : 30000; // Default 30 seconds
    
    catState.currentActivity = { ...activity };
    catState.activityEnd = Date.now() + duration;
    catState.mood = activity.mood;
    
    // Apply immediate chaos change
    catState.chaosLevel = Math.max(0, Math.min(100, catState.chaosLevel + activity.chaosChange));
    
    // Set cooldown between activities
    catState.cooldown = 5000 + Math.random() * 10000; // 5-15 seconds
    
    return activity;
}

// Player interacts with the cat
export function interact(game) {
    catState.lastInteraction = Date.now();
    
    // Small chance to trigger a special interaction
    if (Math.random() > 0.8) {
        if (catState.affection > 70) {
            // Positive interaction
            const messages = [
                `${catState.name} purrs loudly and rubs against your leg.`,
                `${catState.name} brings you a small gift (a bottle cap).`,
                `${catState.name} sits on your lap while you work.`
            ];
            game.playerStats.lastNotification = {
                type: 'success',
                message: messages[Math.floor(Math.random() * messages.length)]
            };
            catState.affection = Math.min(100, catState.affection + 2);
        } else if (catState.affection < 30) {
            // Negative interaction
            const messages = [
                `${catState.name} glares at you and flicks its tail.`,
                `${catState.name} ignores you completely.`,
                `${catState.name} knocks over a small object in protest.`
            ];
            game.playerStats.lastNotification = {
                type: 'error',
                message: messages[Math.floor(Math.random() * messages.length)]
            };
            catState.affection = Math.max(0, catState.affection - 2);
        }
    }
    
    // If cat was being mischievous, it might stop
    if (catState.currentActivity?.chaosChange > 0 && Math.random() > 0.7) {
        catState.currentActivity = null;
        catState.cooldown = 5000;
        return 'The cat stops what it\'s doing and looks at you innocently.';
    }
    
    return null;
}

// Player pets the cat
export function petCat(game) {
    catState.lastInteraction = Date.now();
    
    // Increase affection, but not too much at once
    const affectionGain = 1 + Math.random() * 2; // 1-3 points
    catState.affection = Math.min(100, catState.affection + affectionGain);
    
    // Reduce chaos level
    catState.chaosLevel = Math.max(0, catState.chaosLevel - 5);
    
    // Random response
    const responses = [
        `${catState.name} purrs contentedly.`,
        `${catState.name} leans into your hand.`,
        `${catState.name} gives you a slow blink.`,
        `${catState.name} rolls over for a belly rub.`
    ];
    
    // Small chance to get a positive effect
    if (Math.random() > 0.9) {
        const effect = Math.random();
        if (effect > 0.95) {
            // Rare positive effect
            game.playerStats.customerSatisfaction = Math.min(100, game.playerStats.customerSatisfaction + 5);
            return `${responses[Math.floor(Math.random() * responses.length)]} Customers seem happier with ${catState.name} around!`;
        } else if (effect > 0.8) {
            // Small money bonus
            const bonus = Math.floor(Math.random() * 10) + 1;
            game.playerStats.money += bonus;
            return `${responses[Math.floor(Math.random() * responses.length)]} You find $${bonus} stuck to ${catState.name}'s fur!`;
        }
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// Player feeds the cat
export function feedCat(game, foodType = 'regular') {
    catState.lastInteraction = Date.now();
    
    let message = '';
    let effect = 0;
    
    switch (foodType) {
        case 'treat':
            effect = 5 + Math.random() * 5; // 5-10 points
            message = `${catState.name} happily devours the treat!`;
            break;
        case 'fish':
            effect = 8 + Math.random() * 7; // 8-15 points
            message = `${catState.name} loves the fish!`;
            break;
        case 'milk':
            effect = 3 + Math.random() * 4; // 3-7 points
            message = `${catState.name} laps up the milk.`;
            break;
        default: // regular food
            effect = 2 + Math.random() * 3; // 2-5 points
            message = `${catState.name} eats the food.`;
    }
    
    // Apply effect with diminishing returns
    const effectiveGain = effect * (1 - (catState.affection / 200));
    catState.affection = Math.min(100, catState.affection + effectiveGain);
    
    // Reduce chaos level more than usual
    catState.chaosLevel = Math.max(0, catState.chaosLevel - 10);
    
    // If cat was being mischievous, it will stop to eat
    if (catState.currentActivity?.chaosChange > 0) {
        catState.currentActivity = null;
        catState.cooldown = 10000; // 10 seconds before next activity
        message += ' The cat stops misbehaving to eat.';
    }
    
    return message;
}

// Player scolds the cat
// (Not recommended, but sometimes necessary)
export function scoldCat(game) {
    catState.lastInteraction = Date.now();
    
    // Decrease affection
    catState.affection = Math.max(0, catState.affection - 5);
    
    // Reduce chaos level more if affection is high
    const chaosReduction = catState.affection > 50 ? 20 : 10;
    catState.chaosLevel = Math.max(0, catState.chaosLevel - chaosReduction);
    
    // Random response
    const responses = [
        `${catState.name} looks offended.`,
        `${catState.name} flicks its tail and walks away.`,
        `${catState.name} ignores you.`,
        `You feel guilty for scolding ${catState.name}.`
    ];
    
    // If chaos level was very high, cat might stop misbehaving
    if (catState.currentActivity?.chaosChange > 0) {
        if (Math.random() > 0.5) {
            catState.currentActivity = null;
            catState.cooldown = 15000; // 15 seconds before next activity
            return `${responses[Math.floor(Math.random() * responses.length)]} The cat stops misbehaving... for now.`;
        } else {
            // Sometimes scolding makes it worse!
            catState.chaosLevel = Math.min(100, catState.chaosLevel + 10);
            return `${catState.name} looks at you defiantly and knocks something else over!`;
        }
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
}
