// src/js/systems/management.js
// Contains the logic for the management minigame, adapted from user's code.

// --- GAME DATA ---
const equipmentData = {
    'coffee-machine': { cost: 500, rep: 10, type: 'basic' },
    'pro-coffee-machine': { cost: 1200, rep: 25, type: 'pro' },
    'pastry-display': { cost: 300, rep: 5 },
    'desk': { cost: 150 },
    'premium-chair': { cost: 250, rep: 5 }
};

const staffData = {
    'barista': { dailyCost: 50, rep: 10 }
};

// --- MANAGEMENT SYSTEM CLASS ---
class ManagementSystem {
    constructor(game) {
        this.game = game; // Reference to the main game engine
        this.isPanelOpen = false;

        // Management-specific state
        this.mgmtState = {
            coffeeMachine: 'none', // none, basic, pro
            hasPastryDisplay: false,
            coworkingDesks: 0,
            premiumChairs: 0,
            hasBarista: false,
            deskCapacity: 6,
            baseRent: 20,
        };
    }

    openPanel() {
        if (!this.isPanelOpen) {
            this.isPanelOpen = true;
            this.game.pause();
            document.getElementById('management-modal').style.display = 'flex';
            this.updateUI();
            console.log('Management panel opened.');
        }
    }

    closePanel() {
        if (this.isPanelOpen) {
            this.isPanelOpen = false;
            this.game.resume();
            document.getElementById('management-modal').style.display = 'none';
            console.log('Management panel closed.');
        }
    }

    updateUI() {
        if (!this.isPanelOpen) return;

        const stats = this.game.playerStats;
        const money = stats.money;

        // Update stats in the panel
        document.getElementById('mgmt-money-value').textContent = `$${Math.floor(stats.money)}`;
        document.getElementById('mgmt-day-value').textContent = stats.day;
        document.getElementById('mgmt-reputation-value').textContent = `${Math.floor(stats.reputation)}/100`;

        // Update button states
        document.getElementById('buy-coffee-machine').disabled = this.mgmtState.coffeeMachine !== 'none' || money < equipmentData['coffee-machine'].cost;
        document.getElementById('buy-pro-coffee-machine').disabled = this.mgmtState.coffeeMachine === 'pro' || money < equipmentData['pro-coffee-machine'].cost;
        document.getElementById('buy-pastry-display').disabled = this.mgmtState.hasPastryDisplay || money < equipmentData['pastry-display'].cost;
        document.getElementById('buy-desk').disabled = this.mgmtState.coworkingDesks >= this.mgmtState.deskCapacity || money < equipmentData['desk'].cost;
        document.getElementById('buy-premium-chair').disabled = this.mgmtState.premiumChairs >= this.mgmtState.coworkingDesks || money < equipmentData['premium-chair'].cost;
        document.getElementById('hire-barista').disabled = this.mgmtState.hasBarista || money < 100; // Buffer for salary
    }

    nextDay() {
        const stats = this.game.playerStats;
        const state = this.mgmtState;

        // 1. Calculate Income & Expenses
        let cafeIncome = 0;
        if (state.coffeeMachine === 'basic') cafeIncome += 50 + (stats.reputation / 4);
        if (state.coffeeMachine === 'pro') cafeIncome += 120 + (stats.reputation / 2);
        if (state.hasPastryDisplay) cafeIncome += 30;
        if (state.hasBarista) cafeIncome *= 1.2;

        const coworkIncome = (state.coworkingDesks * 20) + (state.premiumChairs * 5);
        const dailyIncome = cafeIncome + coworkIncome;
        
        let dailyExpenses = state.baseRent;
        if (state.hasBarista) dailyExpenses += staffData.barista.dailyCost;

        // 2. Update money and day
        stats.money += dailyIncome - dailyExpenses;
        stats.day += 1;
        
        // 3. Update customers (simplified)
        stats.customersServed += Math.floor(cafeIncome / 5) + state.coworkingDesks;

        console.log(`Day ${stats.day-1} Summary: Income $${Math.floor(dailyIncome)}, Expenses $${Math.floor(dailyExpenses)}.`);

        // 4. Check for game over conditions
        this.checkEndConditions();

        // 5. Update UI
        this.updateUI();
        this.game.updateUI(); // Update main game HUD
    }

    checkEndConditions() {
        const stats = this.game.playerStats;
        if (stats.money < 0) {
            this.game.pause();
            alert("Game Over: You've gone bankrupt!");
        }
        if (stats.reputation <= 0) {
            this.game.pause();
            alert("Game Over: Your reputation is ruined!");
        }
    }

    init() {
        // Event listeners for management panel buttons
        try {
            const closeBtn = document.getElementById('close-mgmt-panel-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closePanel());
            }
            
            const nextDayBtn = document.getElementById('next-day-button');
            if (nextDayBtn) {
                nextDayBtn.addEventListener('click', () => this.nextDay());
            }

            // Purchase buttons
            const purchaseButtons = [
                'buy-coffee-machine', 'buy-pro-coffee-machine', 'buy-pastry-display',
                'buy-desk', 'buy-premium-chair', 'hire-barista'
            ];
            
            purchaseButtons.forEach(buttonId => {
                const btn = document.getElementById(buttonId);
                if (btn) {
                    btn.addEventListener('click', () => {
                        const itemId = buttonId.replace('buy-', '').replace('hire-', '');
                        this.purchase(itemId);
                    });
                }
            });
            
            console.log('Management system event listeners attached successfully');
        } catch (error) {
            console.error('Error initializing management system:', error);
        }
    }
    
    update(gameTime, deltaTime) {
        // Update method for system consistency
        // Management system is mostly event-driven, but we can add periodic updates here
        return;
    }

    purchase(itemId) {
        const stats = this.game.playerStats;
        const state = this.mgmtState;
        let item;

        if (equipmentData[itemId]) {
            item = equipmentData[itemId];
            if (stats.money >= item.cost) {
                stats.money -= item.cost;
                if(item.rep) stats.reputation += item.rep;

                // Update specific state
                if (itemId === 'coffee-machine') state.coffeeMachine = 'basic';
                if (itemId === 'pro-coffee-machine') state.coffeeMachine = 'pro';
                if (itemId === 'pastry-display') state.hasPastryDisplay = true;
                if (itemId === 'desk') state.coworkingDesks++;
                if (itemId === 'premium-chair') state.premiumChairs++;

                console.log(`Purchased ${itemId}`);
            }
        } else if (staffData[itemId]) {
            item = staffData[itemId];
            if (stats.money >= 100) { // Salary buffer
                if(item.rep) stats.reputation += item.rep;
                if (itemId === 'barista') state.hasBarista = true;
                console.log(`Hired a ${itemId}`);
            }
        }
        
        this.updateUI();
        this.game.updateUI();
    }
}

export function initManagementSystem(gameEngine) {
    const system = new ManagementSystem(gameEngine);
    system.init();
    return system;
}
