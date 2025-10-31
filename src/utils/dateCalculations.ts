import { ChitGroup } from '../types/chitFund';

// Calculate the next draw date for a group based on draw_date (day of month)
export const getNextDrawDate = (drawDay: string): Date => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const drawDayNum = parseInt(drawDay);
  
  // Calculate this month's draw date
  let drawDate = new Date(currentYear, currentMonth, drawDayNum);
  
  // If draw day has passed this month, consider next month's draw
  if (drawDate <= today) {
    drawDate = new Date(currentYear, currentMonth + 1, drawDayNum);
  }
  
  return drawDate;
};

// Check if we're in the 5-day payment window before draw date
export const isInPaymentWindow = (drawDay: string): boolean => {
  const today = new Date();
  const drawDate = getNextDrawDate(drawDay);
  
  // Calculate payment window start (5 days before draw date)
  const paymentWindowStart = new Date(drawDate);
  paymentWindowStart.setDate(drawDate.getDate() - 5);
  
  // Payment window is from 5 days before until draw date
  return today >= paymentWindowStart && today <= drawDate;
};

// Get days until a specific date
export const getDaysUntil = (targetDate: Date): number => {
  const today = new Date();
  const timeDiff = targetDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Format date for display (e.g., "28 Aug, 8PM")
export const formatDrawDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const time = '8PM'; // Fixed time for draws
  
  return `${day} ${month}, ${time}`;
};

// Format due date with urgency (e.g., "due in 3 days", "due today", "overdue")
export const formatDueDate = (targetDate: Date): string => {
  const daysUntil = getDaysUntil(targetDate);
  
  if (daysUntil < 0) {
    return 'overdue';
  } else if (daysUntil === 0) {
    return 'due today';
  } else if (daysUntil === 1) {
    return 'due tomorrow';
  } else {
    return `due in ${daysUntil} days`;
  }
};

// Find the next contribution due from user's groups
export const getNextContributionDue = (
  groups: ChitGroup[], 
  userId: string, 
  groupPaymentStatus: {[key: string]: string}
): { amount: number; dueDate: Date; groupName: string } | null => {
  const upcomingContributions = groups
    .filter(group => {
      // Only active groups where user hasn't paid and is in payment window
      const paymentStatus = groupPaymentStatus[group.id] || 'pending';
      return (
        group.status === 'active' &&
        paymentStatus === 'pending' &&
        isInPaymentWindow(group.drawDay)
      );
    })
    .map(group => ({
      amount: group.monthlyAmount,
      dueDate: getNextDrawDate(group.drawDay),
      groupName: group.name
    }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  
  return upcomingContributions.length > 0 ? upcomingContributions[0] : null;
};

// Find the next lucky draw from user's groups
export const getNextLuckyDraw = (groups: ChitGroup[]): { date: Date; groupName: string } | null => {
  const upcomingDraws = groups
    .filter(group => group.status === 'active')
    .map(group => ({
      date: getNextDrawDate(group.drawDay),
      groupName: group.name
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return upcomingDraws.length > 0 ? upcomingDraws[0] : null;
};