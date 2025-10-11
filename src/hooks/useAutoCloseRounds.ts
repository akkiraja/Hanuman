import { useEffect, useRef, useCallback } from 'react';
import { useBiddingStore } from '../stores/biddingStore';
import { BidRound } from '../types/chitFund';
import { toast } from 'sonner-native';

interface AutoCloseOptions {
  enabled?: boolean;
  onRoundClosed?: (round: BidRound) => void;
  warningMinutes?: number; // Show warning X minutes before close
}

export function useAutoCloseRounds(groupId: string, options: AutoCloseOptions = {}) {
  const {
    enabled = true,
    onRoundClosed,
    warningMinutes = 5,
  } = options;

  const { currentRound, closeBidRound } = useBiddingStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);
  const isClosingRef = useRef(false);
  
  // Use refs to avoid dependency issues
  const closeBidRoundRef = useRef(closeBidRound);
  const onRoundClosedRef = useRef(onRoundClosed);
  
  // Update refs when values change
  useEffect(() => {
    closeBidRoundRef.current = closeBidRound;
    onRoundClosedRef.current = onRoundClosed;
  }, [closeBidRound, onRoundClosed]);
  
  const checkRoundExpiry = useCallback(async () => {
    if (!currentRound || !enabled || isClosingRef.current) return;
    
    const now = new Date();
    const endTime = currentRound.endTime;
    
    if (!endTime) return;
    
    const timeLeft = endTime.getTime() - now.getTime();
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    
    // Show warning before round ends
    if (minutesLeft <= warningMinutes && minutesLeft > 0 && !warningShownRef.current) {
      warningShownRef.current = true;
      toast.warning(`Round ${currentRound.roundNumber} ends in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}!`);
    }
    
    // Auto-close if time has passed and round is still active
    if (timeLeft <= 0 && currentRound.status === 'active') {
      isClosingRef.current = true;
      
      try {
        console.log(`🕐 Auto-closing expired round ${currentRound.roundNumber}`);
        
        const closedRound = await closeBidRoundRef.current(currentRound.id);
        
        if (closedRound.winnerName) {
          toast.success(
            `Round ${currentRound.roundNumber} closed! Winner: ${closedRound.winnerName}`
          );
        } else {
          toast.info(`Round ${currentRound.roundNumber} closed with no bids.`);
        }
        
        onRoundClosedRef.current?.(closedRound);
        
        // Reset warning flag for next round
        warningShownRef.current = false;
        
      } catch (error) {
        console.error('Auto-close round failed:', error);
        
        // Handle specific error cases
        if (error.message?.includes('No active bids')) {
          toast.info('Round ended with no bids. Creating next round...');
        } else {
          toast.error('Failed to auto-close round. Please close manually.');
        }
      } finally {
        isClosingRef.current = false;
      }
    }
  }, [currentRound?.id, currentRound?.status, currentRound?.endTime, enabled, warningMinutes]);

  const startAutoClose = useCallback(() => {
    if (!enabled) return;
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Check every 30 seconds
    intervalRef.current = setInterval(checkRoundExpiry, 30000);
    
    // Also check immediately
    checkRoundExpiry();
  }, [enabled, checkRoundExpiry]);

  const stopAutoClose = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    warningShownRef.current = false;
    isClosingRef.current = false;
  }, []);

  // Start/stop auto-close based on current round
  useEffect(() => {
    if (currentRound && currentRound.status === 'active' && currentRound.endTime) {
      startAutoClose();
    } else {
      stopAutoClose();
    }
    
    return stopAutoClose;
  }, [currentRound?.id, currentRound?.status, currentRound?.endTime]);

  // Cleanup on unmount
  useEffect(() => {
    return stopAutoClose;
  }, [stopAutoClose]);

  const getTimeLeft = useCallback(() => {
    if (!currentRound?.endTime) return null;
    
    const now = new Date();
    const timeLeft = currentRound.endTime.getTime() - now.getTime();
    
    if (timeLeft <= 0) return null;
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds, total: timeLeft };
  }, [currentRound?.endTime]);

  const isRoundExpiring = useCallback(() => {
    const timeLeft = getTimeLeft();
    if (!timeLeft) return false;
    
    const totalMinutes = Math.floor(timeLeft.total / (1000 * 60));
    return totalMinutes <= warningMinutes;
  }, [getTimeLeft, warningMinutes]);

  return {
    getTimeLeft,
    isRoundExpiring,
    startAutoClose,
    stopAutoClose,
  };
}