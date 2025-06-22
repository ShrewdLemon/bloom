import { GameEngine } from './core/game.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing game.");
    const game = new GameEngine();
    game.init();
});
