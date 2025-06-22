// Core Game Engine for Bloom & Brew
import { QueueingModel } from '../algorithms/queuing-theory.js';
import { runMonteCarloSimulation } from '../algorithms/monte-carlo.js';
import { initBakery } from '../systems/bakery.js';
import { initCafe } from '../systems/cafe.js';
import { initFlowers } from '../systems/flowers.js';
import { initCatChaos } from '../systems/cat-chaos.js';
import { initManagementSystem } from '../systems/management.js';
import { updateHUD } from '../ui/hud.js';

export class GameEngine {
    constructor() {
        this.gameTime = 360; // Start at 6:00 AM
        this.isPaused = true; // Start paused until difficulty is selected
        this.gameSpeed = 1; // 1x speed by default
        this.difficulty = 'casual'; // 'casual' or 'professional'
        this.playerStats = {
            money: 1000,
            reputation: 50,
            day: 1,
            customerSatisfaction: 100,
            customersServed: 0,
            dailyCustomers: 0
        };
        
        // Initialize game systems, passing a reference to the engine
        this.systems = {
            bakery: initBakery(this),
            cafe: initCafe(this),
            flowers: initFlowers(this),
            catChaos: initCatChaos(this),
            management: initManagementSystem(this)
        };
        
        // Game loop variables
        this.lastUpdate = 0;
        this.gameLoop = null;
    }
    
    // Game loop
    gameLoop(timestamp) {
        if (!this.lastUpdate) {
            this.lastUpdate = timestamp;
        }

        const deltaTime = timestamp - this.lastUpdate;
        this.lastUpdate = timestamp;

        if (!this.isPaused) {
            // Update game time (1 real second = 1 game minute)
            this.gameTime += (deltaTime * this.gameSpeed) / 1000;
            
            // Update all game systems
            Object.values(this.systems).forEach(system => {
                if (system.update) {
                    system.update(this.gameTime, deltaTime);
                }
            });
            
            // Update UI
            this.updateUI();
            
            // Render the cafe view
            if (this.systems.cafe && this.systems.cafe.render) {
                this.systems.cafe.render();
            }
        }
        
        // Continue the game loop
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    // Initialize the game
    init() {
        console.log('Initializing game...');
        
        // Set up event listeners
        const casualBtn = document.getElementById('casual-btn');
        const proBtn = document.getElementById('pro-btn');
        const manageBtn = document.getElementById('manage-btn');
        
        if (casualBtn) {
            casualBtn.addEventListener('click', () => this.setDifficulty('casual'));
        }
        if (proBtn) {
            proBtn.addEventListener('click', () => this.setDifficulty('professional'));
        }
        if (manageBtn) {
            manageBtn.addEventListener('click', () => this.systems.management.openPanel());
        }
        
        // Set up action button listeners
        this.setupActionButtons();
        
        // Set up time control listeners
        this.setupTimeControls();
        
        // Show welcome modal
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            welcomeModal.classList.add('show');
            console.log('Welcome modal shown');
        }
        
        // Update UI
        this.updateUI();
        
        // Start the game loop
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    // Set up action button event listeners
    setupActionButtons() {
        const bakeBtn = document.getElementById('bake-btn');
        const arrangeBtn = document.getElementById('arrange-btn');
        const serveBtn = document.getElementById('serve-btn');
        const spawnBtn = document.getElementById('spawn-customer-btn');
        
        if (bakeBtn) {
            bakeBtn.addEventListener('click', () => this.handleBakeAction());
        }
        if (arrangeBtn) {
            arrangeBtn.addEventListener('click', () => this.handleArrangeAction());
        }
        if (serveBtn) {
            serveBtn.addEventListener('click', () => this.handleServeAction());
        }
        if (spawnBtn) {
            spawnBtn.addEventListener('click', () => this.handleSpawnCustomerAction());
        }
    }
    
    // Handle bake action
    handleBakeAction() {
        if (this.systems.bakery) {
            try {
                // Bake croissants by default
                this.systems.bakery.bakeProduct('croissant', 5, this);
                this.showNotification('Started baking 5 croissants!', 'success');
            } catch (error) {
                this.showNotification(`Baking failed: ${error.message}`, 'error');
            }
        }
    }
    
    // Handle arrange flowers action
    handleArrangeAction() {
        // Simple flower arrangement action
        this.playerStats.customerSatisfaction = Math.min(100, this.playerStats.customerSatisfaction + 2);
        this.showNotification('Arranged beautiful flowers! Customer satisfaction increased.', 'success');
    }
    
    // Handle serve action
    handleServeAction() {
        if (this.systems.cafe) {
            // Try to serve waiting customers
            const waitingCustomers = this.systems.cafe.customers.filter(c => c.state === 'waiting_for_order');
            if (waitingCustomers.length > 0) {
                this.showNotification(`Serving ${waitingCustomers.length} customers...`, 'info');
            } else {
                this.showNotification('No customers waiting to be served.', 'info');
            }
        }
    }
    
    // Handle spawn customer action
    handleSpawnCustomerAction() {
        if (this.systems.cafe) {
            this.systems.cafe.spawnCustomer();
            this.showNotification('Attracted a new customer!', 'success');
        }
    }
    
    // Show notification helper
    showNotification(message, type = 'info') {
        this.playerStats.lastNotification = { message, type };
    }
    
    // Set up time control buttons
    setupTimeControls() {
        const pauseBtn = document.getElementById('pause-btn');
        const playBtn = document.getElementById('play-btn');
        const fastBtn = document.getElementById('fast-btn');
        const ultraFastBtn = document.getElementById('ultra-fast-btn');
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.setGameSpeed(0));
        }
        if (playBtn) {
            playBtn.addEventListener('click', () => this.setGameSpeed(1));
        }
        if (fastBtn) {
            fastBtn.addEventListener('click', () => this.setGameSpeed(3));
        }
        if (ultraFastBtn) {
            ultraFastBtn.addEventListener('click', () => this.setGameSpeed(10));
        }
        
        // Initialize button states
        this.updateTimeControlButtons();
    }
    
    // Set game speed
    setGameSpeed(speed) {
        if (speed === 0) {
            this.isPaused = true;
            this.gameSpeed = 1;
        } else {
            this.isPaused = false;
            this.gameSpeed = speed;
        }
        this.updateTimeControlButtons();
        console.log(`Game speed set to ${speed === 0 ? 'paused' : speed + 'x'}`);
    }
    
    // Update time control button states
    updateTimeControlButtons() {
        const buttons = ['pause-btn', 'play-btn', 'fast-btn', 'ultra-fast-btn'];
        const speeds = [0, 1, 3, 10];
        
        buttons.forEach((btnId, index) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                const isActive = (this.isPaused && speeds[index] === 0) || 
                               (!this.isPaused && this.gameSpeed === speeds[index]);
                btn.classList.toggle('active', isActive);
            }
        });
    }
    
    // Set game difficulty and start the game
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        document.body.classList.toggle('professional-mode', difficulty === 'professional');
        
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            welcomeModal.classList.remove('show');
        }
        
        this.startGame();
        console.log(`Game started in ${difficulty} mode`);
    }
    
    // Start the game loop
    startGame() {
        this.isPaused = false;
        this.lastUpdate = performance.now();
        console.log(`Game started with ${this.difficulty} difficulty.`);
        
        // Spawn initial customers for immediate gameplay
        this.spawnInitialCustomers();
        
        // Update UI
        this.updateUI();
        this.updateTimeControlButtons();
    }
    
    // Spawn some initial customers to make the game feel alive
    spawnInitialCustomers() {
        if (this.systems.cafe) {
            // Spawn 2-3 customers immediately
            const initialCustomers = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < initialCustomers; i++) {
                setTimeout(() => {
                    this.systems.cafe.spawnCustomer();
                    this.showNotification(`New customer arrived!`, 'info');
                }, i * 3000); // Stagger arrivals every 3 seconds
            }
        }
    }
    
    // Update game state
    updateGameState(deltaTime) {
        // Update time of day
        const hours = Math.floor((this.gameTime / 60) % 24);
        const minutes = Math.floor(this.gameTime % 60);
        
        // Update customer flow based on time of day
        this.updateCustomerFlow(hours, minutes);
        
        // Update all game systems
        Object.values(this.systems).forEach(system => {
            if (system.update) system.update(deltaTime, this);
        });
    }
    
    // Update customer flow based on time of day
    updateCustomerFlow(hours, minutes) {
        // Simple customer flow model (will be enhanced with queuing theory)
        const currentHour = hours;
        let customerRate = 0;
        
        // Define customer flow rates throughout the day
        if (currentHour >= 7 && currentHour < 10) {
            // Morning rush
            customerRate = 10 + Math.sin((currentHour - 7) * Math.PI / 3) * 5;
        } else if (currentHour >= 11 && currentHour < 14) {
            // Lunch rush
            customerRate = 15 + Math.sin((currentHour - 11) * Math.PI / 3) * 8;
        } else if (currentHour >= 17 && currentHour < 20) {
            // Dinner rush
            customerRate = 12 + Math.sin((currentHour - 17) * Math.PI / 3) * 6;
        } else {
            // Slow hours
            customerRate = 2;
        }
        
        // Adjust for difficulty
        if (this.difficulty === 'professional') {
            customerRate *= 1.5;
        }
        
        // Update customer count (simplified for now)
        // In a real implementation, this would use the queuing model
        const newCustomers = Math.floor(customerRate * Math.random() * 0.1);
        this.playerStats.dailyCustomers += newCustomers;
    }
    
    // Update the user interface
    updateUI() {
        // Update game time display
        const hours = Math.floor((this.gameTime / 60) % 24);
        const minutes = Math.floor(this.gameTime % 60);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = ((hours + 11) % 12 + 1);
        document.getElementById('game-time').textContent = 
            `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        
        // Update customer count
        document.getElementById('customer-count').textContent = this.playerStats.dailyCustomers;
        
        // Update satisfaction
        document.getElementById('satisfaction').textContent = 
            `${Math.min(100, Math.max(0, this.playerStats.customerSatisfaction))}%`;
        
        // Update HUD
        updateHUD(this.playerStats);
    }
    
    // Pause the game
    pause() {
        this.isPaused = true;
        cancelAnimationFrame(this.gameLoop);
    }
    
    // Resume the game
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.lastUpdate = performance.now();
            this.gameLoop = requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }
    
    // Clean up the game
    destroy() {
        cancelAnimationFrame(this.gameLoop);
        // Clean up any event listeners or resources
    }
}

