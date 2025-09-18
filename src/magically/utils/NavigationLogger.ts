/**
 * Standalone NavigationLogger for React Navigation
 * Drop-in solution with zero dependencies - just add to NavigationContainer
 * 
 * Usage:
 * import { createNavigationLogger } from './NavigationLogger';
 * 
 * <NavigationContainer onStateChange={createNavigationLogger()}>
 *   ...
 * </NavigationContainer>
 */

import { NavigationState } from '@react-navigation/native';

export interface NavigationEvent {
  eventId: string;
  fromScreen?: string;
  toScreen: string;
  params?: any;
  stack?: string[];
  action?: string;
  timestamp: number;
}

class NavigationLogger {
  private navigationHistory: NavigationEvent[] = [];
  private currentScreen: string | null = null;
  private eventCounter = 0;
  private isDebugEnabled: boolean;
  private sessionId: string;

  constructor(isDebugEnabled: boolean = false) {
    this.isDebugEnabled = isDebugEnabled;
    this.sessionId = `session-${Date.now()}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `nav-${++this.eventCounter}-${Date.now()}`;
  }

  /**
   * Get screen name from navigation state
   */
  private getActiveRouteName(state: NavigationState | undefined): string | null {
    if (!state) return null;

    const route = state.routes[state.index];
    
    // Handle nested navigators
    if (route.state) {
      return this.getActiveRouteName(route.state as NavigationState);
    }
    
    return route.name;
  }

  /**
   * Get full navigation stack
   */
  private getNavigationStack(state: NavigationState): string[] {
    const stack: string[] = [];
    
    const traverse = (navState: NavigationState) => {
      const route = navState.routes[navState.index];
      stack.push(route.name);
      
      if (route.state) {
        traverse(route.state as NavigationState);
      }
    };
    
    traverse(state);
    return stack;
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    
    const sensitiveFields = [
      'password', 'token', 'accessToken', 'refreshToken', 
      'access_token', 'refresh_token', 'client_secret',
      'authorization', 'auth', 'secret', 'apiKey', 'api_key'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Handle navigation state change
   */
  onStateChange = (state: NavigationState | undefined): void => {
    if (!state) return;
    
    const newScreen = this.getActiveRouteName(state);
    if (!newScreen) return;
    
    // Only log if screen actually changed
    if (newScreen !== this.currentScreen) {
      const eventId = this.generateEventId();
      const stack = this.getNavigationStack(state);
      
      const navigationEvent: NavigationEvent = {
        eventId,
        fromScreen: this.currentScreen || undefined,
        toScreen: newScreen,
        params: this.sanitizeData(state.routes[state.index].params),
        stack,
        action: this.currentScreen ? 'navigate' : 'initial',
        timestamp: Date.now()
      };
      
      // Store in history
      this.navigationHistory.push(navigationEvent);
      if (this.navigationHistory.length > 50) {
        this.navigationHistory.shift(); // Keep only last 50 events
      }
      
      // Send structured navigation data
      const structuredData = {
        __raw: true,
        type: 'navigation',
        data: {
          ...navigationEvent,
          historyLength: this.navigationHistory.length,
          sessionId: this.sessionId,
        }
      };
      
      // Send as JSON for platform parsing
      console.log(JSON.stringify(structuredData));
      
      // Update current screen
      this.currentScreen = newScreen;
    }
  };
}

// Singleton instance
let loggerInstance: NavigationLogger | null = null;

/**
 * Create or get navigation logger callback
 * This returns a function that can be directly passed to NavigationContainer's onStateChange
 * Also handles initial state logging
 */
export function createNavigationLogger(isDebugEnabled: boolean = __DEV__) {
  if (!loggerInstance) {
    loggerInstance = new NavigationLogger(isDebugEnabled);
  }
  
  // Return a wrapper function that captures and logs initial state
  return (state: NavigationState | undefined) => {
    // For initial state, currentScreen will be null
    // onStateChange already handles this properly, so just call it once
    loggerInstance?.onStateChange(state);
  };
}