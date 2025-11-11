# Hanuman (Bhishi Manager)

A React Native mobile application for managing traditional Indian Chit Funds, also known as Bhishi, Committee, or VC groups. This app enables users to create and manage collective savings groups with both lucky draw and bidding systems.

## 🎯 What is Bhishi?

Bhishi (also called Committee, Chit Fund, or Kitty) is a traditional Indian savings system where a group of people contribute a fixed amount monthly. Each month, one member receives the pooled amount through either:
- **Lucky Draw**: Random selection among eligible members
- **Bidding System**: Lowest unique bid wins the pool

## ✨ Key Features

### Core Functionality
- **Group Management**: Create and manage Bhishi groups with customizable monthly amounts and draw dates
- **Member Management**: Add members from phone contacts or existing platform users
- **Lucky Draw System**: Deterministic random winner selection with live spinner animation
- **Bidding System**: Real-time bidding rounds with automatic winner declaration
- **Payment Tracking**: Mark payments as done, track payment status
- **Dual Admin System**: Appoint co-admins with full administrative powers

### Notifications
- **Push Notifications**: Real-time alerts for draws, bidding, payments, and more
- **SMS Notifications**: Hinglish message templates for key events
- **Android Heads-up**: High-priority notifications for urgent events

### Technical Features
- **Real-time Updates**: Live bidding feed and draw synchronization
- **Payment Integration**: Cashfree payment gateway integration (test mode)
- **Authentication**: OTP-based login via Supabase and Twilio
- **Deep Linking**: Support for navigation via custom URL schemes
- **Auto-linking**: Automatic member linking upon registration

## 🚀 Getting Started

### Prerequisites
- Node.js and npm/bun installed
- Expo CLI
- iOS Simulator or Android Emulator (for testing)

### Installation

```bash
# Install dependencies
npm install
# or
bun install

# Start development server
npm start
# or
bun start
```

### Available Scripts

```bash
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator
npm run web        # Run in web browser
npm run build:web  # Build for web deployment
npm run deploy:testflight  # Deploy to TestFlight
```

## 📁 Project Structure

```
/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation configuration
│   ├── stores/          # Zustand state management stores
│   ├── services/        # API and notification services
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   ├── constants/       # App constants and colors
│   ├── hooks/           # Custom React hooks
│   ├── config/          # Configuration files
│   ├── supabase/        # Supabase client and migrations
│   ├── magically/       # Magically SDK integration
│   ├── App.tsx          # Root application component
│   ├── PROJECT.md       # Detailed project context and history
│   └── TASKS.md         # Task tracking
├── assets/              # Images, fonts, and other assets
├── index.ts             # Entry point
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## 🛠 What I Can Help You With

As an AI coding assistant with deep understanding of this repository, I can help you with:

### Development Tasks
- **Bug Fixes**: Identify and fix issues in the codebase
- **New Features**: Implement new functionality following existing patterns
- **Code Refactoring**: Improve code quality and maintainability
- **Performance Optimization**: Enhance app performance and loading times
- **UI/UX Improvements**: Update designs and user experience

### Code Quality
- **Testing**: Write and improve tests for components and services
- **Type Safety**: Add or improve TypeScript types
- **Code Review**: Review code changes and suggest improvements
- **Best Practices**: Ensure code follows React Native and Expo best practices

### Documentation
- **Code Comments**: Add meaningful comments to complex logic
- **API Documentation**: Document service functions and interfaces
- **User Documentation**: Create or update user-facing documentation
- **Technical Specs**: Document architectural decisions and patterns

### Integration & Setup
- **Supabase Integration**: Work with database queries and real-time subscriptions
- **Notification System**: Configure push notifications and SMS
- **Payment Gateway**: Integrate or update Cashfree payment flows
- **Third-party Services**: Add new services or update existing integrations

### Debugging
- **Issue Investigation**: Analyze logs and error messages
- **Performance Profiling**: Identify bottlenecks and optimize
- **Build Issues**: Resolve build and deployment problems
- **Runtime Errors**: Fix crashes and unexpected behavior

### Specific to This App
- **Lucky Draw Logic**: Modify draw algorithms and animations
- **Bidding System**: Update bidding rules and real-time updates
- **Group Management**: Enhance group creation and member management
- **Authentication Flow**: Improve OTP and user registration
- **Notification Templates**: Update message templates and delivery logic

## 🔧 Technical Stack

- **Framework**: React Native 0.79.2 + Expo ~53.0.9
- **Language**: TypeScript 5.3.3
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: Supabase Auth + Twilio OTP
- **Payments**: Cashfree Payment Gateway
- **Notifications**: Expo Notifications + SMS
- **Navigation**: React Navigation (Stack, Tabs, Drawer)
- **UI Components**: Custom components + Lucide icons
- **Package Manager**: Bun (lock file present)

## 📝 Recent Updates

See [src/PROJECT.md](src/PROJECT.md) for a detailed decision tree and project history, including:
- Dual admin system implementation
- SMS and push notification enhancements
- Deterministic lucky draw system
- Automatic member linking on registration
- Real-time bidding updates
- Payment integration and reminders

## 🤝 Contributing

When making changes to this codebase:
1. Maintain existing code style and patterns
2. Test changes thoroughly on both Android and iOS
3. Update documentation if adding new features
4. Follow the minimal change principle
5. Run linting and type checking before committing

## 📱 App Features by User Type

### As an Admin
- Create Bhishi groups (Lucky Draw or Bidding)
- Add members from contacts or platform
- Conduct lucky draws or create bidding rounds
- Track member payments
- Appoint co-admins
- Send notifications to members

### As a Member
- Join groups via invitation
- Mark payments as done
- Participate in lucky draws
- Place bids in bidding rounds
- Receive payment reminders
- View group history and winners

### As a Pending Member (Unregistered)
- Receive SMS notifications
- Win lucky draws
- Auto-link to groups upon registration

## 🔐 Security & Privacy

- Row Level Security (RLS) policies on all database tables
- OTP-based authentication
- Secure token storage using Expo Secure Store
- Phone number validation and E.164 format enforcement
- Payment data handled securely via Cashfree

## 📄 License

Private repository - All rights reserved.

---

**Need help with something specific?** Just ask! I can help with coding tasks, debugging, feature implementation, documentation, testing, and more. I have full context of this project and can make precise, minimal changes to achieve your goals.
