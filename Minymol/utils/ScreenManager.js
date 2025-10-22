/**
 * 🚀 ScreenManager - Intelligent Screen Mounting System
 * 
 * This manager controls screen lifecycle to optimize navigation performance:
 * - Lazy mounting: Screens mount only when first accessed
 * - Keep-alive: Frequently used screens stay mounted
 * - Preloading: Adjacent screens mount in background after interaction
 * - Memory management: Unmount unused screens after timeout
 * 
 * PERFORMANCE GOALS:
 * - Tab switch < 100ms on Android mid-range
 * - Reduce JS thread usage during navigation
 * - Smooth transitions without janks
 */

import { InteractionManager } from 'react-native';

class ScreenManager {
    constructor() {
        // Screen mounting state
        this.mountedScreens = new Set(['home']); // Home is always mounted initially
        this.screenHistory = ['home']; // Navigation history
        this.preloadQueue = new Set(); // Screens queued for preload
        
        // Configuration
        this.maxMountedScreens = 3; // Maximum screens to keep alive
        this.preloadDelay = 500; // Delay before preloading adjacent screens (ms)
        this.unmountTimeout = 30000; // Unmount unused screens after 30s
        
        // Timers
        this.preloadTimers = {};
        this.unmountTimers = {};
        
        // Screen priorities (higher = more important to keep alive)
        this.screenPriorities = {
            home: 10,
            categories: 8,
            profile: 6,
            cart: 7
        };
        
        // Performance tracking
        this.transitionStart = null;
        this.metrics = {
            transitions: [],
            averageTime: 0
        };
    }
    
    /**
     * Check if a screen should be mounted
     */
    shouldMount(screenName) {
        return this.mountedScreens.has(screenName);
    }
    
    /**
     * Start a screen transition
     */
    startTransition(toScreen) {
        // Cancel any pending preloads
        this.clearPreloadTimers();
        
        // Cancel unmount timer for target screen
        if (this.unmountTimers[toScreen]) {
            clearTimeout(this.unmountTimers[toScreen]);
            delete this.unmountTimers[toScreen];
        }
        
        // Mount target screen if not already mounted
        if (!this.mountedScreens.has(toScreen)) {
            this.mountedScreens.add(toScreen);
        }
        
        // Update history
        this.updateHistory(toScreen);
    }
    
    /**
     * End a screen transition and measure performance
     */
    endTransition(toScreen) {
        // Schedule preloading of adjacent screens after interactions complete
        this.schedulePreload(toScreen);
        
        // Schedule cleanup of unused screens
        this.scheduleCleanup(toScreen);
    }
    
    /**
     * Update navigation history
     */
    updateHistory(screenName) {
        // Remove if already in history
        const index = this.screenHistory.indexOf(screenName);
        if (index > -1) {
            this.screenHistory.splice(index, 1);
        }
        
        // Add to end (most recent)
        this.screenHistory.push(screenName);
        
        // Keep only last 5 screens
        if (this.screenHistory.length > 5) {
            this.screenHistory.shift();
        }
    }
    
    /**
     * Schedule preloading of adjacent screens
     */
    schedulePreload(currentScreen) {
        const adjacentScreens = this.getAdjacentScreens(currentScreen);
        
        InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
                adjacentScreens.forEach(screen => {
                    if (!this.mountedScreens.has(screen) && !this.preloadQueue.has(screen)) {
                        console.log(`🔮 ScreenManager: Preloading ${screen}`);
                        this.preloadQueue.add(screen);
                        this.mountedScreens.add(screen);
                    }
                });
            }, this.preloadDelay);
        });
    }
    
    /**
     * Get adjacent screens based on tab order
     */
    getAdjacentScreens(currentScreen) {
        const tabOrder = ['home', 'categories', 'profile', 'cart'];
        const currentIndex = tabOrder.indexOf(currentScreen);
        
        if (currentIndex === -1) return [];
        
        const adjacent = [];
        
        // Add previous tab
        if (currentIndex > 0) {
            adjacent.push(tabOrder[currentIndex - 1]);
        }
        
        // Add next tab
        if (currentIndex < tabOrder.length - 1) {
            adjacent.push(tabOrder[currentIndex + 1]);
        }
        
        return adjacent;
    }
    
    /**
     * Schedule cleanup of unused screens
     */
    scheduleCleanup(currentScreen) {
        // Don't unmount if we're under the limit
        if (this.mountedScreens.size <= this.maxMountedScreens) {
            return;
        }
        
        // Find screens to unmount based on priority and usage
        const screensToUnmount = this.getUnmountCandidates(currentScreen);
        
        screensToUnmount.forEach(screen => {
            // Clear existing timer if any
            if (this.unmountTimers[screen]) {
                clearTimeout(this.unmountTimers[screen]);
            }
            
            // Schedule unmount after timeout
            this.unmountTimers[screen] = setTimeout(() => {
                if (this.shouldUnmount(screen, currentScreen)) {
                    console.log(`🗑️  ScreenManager: Unmounting ${screen}`);
                    this.mountedScreens.delete(screen);
                    this.preloadQueue.delete(screen);
                    delete this.unmountTimers[screen];
                }
            }, this.unmountTimeout);
        });
    }
    
    /**
     * Get screens that are candidates for unmounting
     */
    getUnmountCandidates(currentScreen) {
        const mounted = Array.from(this.mountedScreens);
        
        // Calculate scores based on priority and recency
        const scores = mounted.map(screen => {
            const priority = this.screenPriorities[screen] || 5;
            const recencyIndex = this.screenHistory.lastIndexOf(screen);
            const recencyScore = recencyIndex >= 0 ? recencyIndex : -1;
            
            return {
                screen,
                score: priority + recencyScore * 2
            };
        });
        
        // Sort by score (lowest first)
        scores.sort((a, b) => a.score - b.score);
        
        // Return screens with lowest scores (excluding current)
        return scores
            .filter(s => s.screen !== currentScreen)
            .slice(0, Math.max(0, this.mountedScreens.size - this.maxMountedScreens))
            .map(s => s.screen);
    }
    
    /**
     * Check if a screen should be unmounted
     */
    shouldUnmount(screen, currentScreen) {
        // Never unmount current screen
        if (screen === currentScreen) return false;
        
        // Never unmount home (always keep alive)
        if (screen === 'home') return false;
        
        // Check if we're still over the limit
        if (this.mountedScreens.size <= this.maxMountedScreens) return false;
        
        return true;
    }
    
    /**
     * Clear all preload timers
     */
    clearPreloadTimers() {
        Object.values(this.preloadTimers).forEach(timer => clearTimeout(timer));
        this.preloadTimers = {};
    }
    
    /**
     * Calculate average transition time
     */
    calculateAverageTime() {
        const recent = this.metrics.transitions.slice(-10); // Last 10 transitions
        const sum = recent.reduce((acc, t) => acc + t.duration, 0);
        this.metrics.averageTime = sum / recent.length;
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            mountedScreens: Array.from(this.mountedScreens),
            screenHistory: [...this.screenHistory]
        };
    }
    
    /**
     * Force mount a screen (for manual preloading)
     */
    forceMount(screenName) {
        if (!this.mountedScreens.has(screenName)) {
            console.log(`🔧 ScreenManager: Force mounting ${screenName}`);
            this.mountedScreens.add(screenName);
        }
    }
    
    /**
     * Force unmount a screen
     */
    forceUnmount(screenName) {
        if (screenName !== 'home' && this.mountedScreens.has(screenName)) {
            console.log(`🔧 ScreenManager: Force unmounting ${screenName}`);
            this.mountedScreens.delete(screenName);
            this.preloadQueue.delete(screenName);
        }
    }
    
    /**
     * Reset manager (for debugging)
     */
    reset() {
        this.clearPreloadTimers();
        Object.values(this.unmountTimers).forEach(timer => clearTimeout(timer));
        this.unmountTimers = {};
        this.mountedScreens = new Set(['home']);
        this.screenHistory = ['home'];
        this.preloadQueue.clear();
        this.metrics = { transitions: [], averageTime: 0 };
        console.log('🔄 ScreenManager: Reset complete');
    }
}

// Export singleton instance
export default new ScreenManager();
