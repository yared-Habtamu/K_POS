# Kiya Smart POS System - Documentation

Welcome to the Kiya Smart POS & Inventory Management System documentation. This folder contains comprehensive documentation for developers, contributors, and users.

## 📚 Documentation Index

### For Developers

- **[Contributing Guidelines](./CONTRIBUTING.md)** - How to contribute to the project
- **[API Documentation](./API.md)** - Backend API reference (coming soon)
- **[Architecture Guide](./architecture.md)** - System architecture and design decisions (coming soon)
- **[Database Schema](./database-schema.md)** - Database structure and relationships (coming soon)

### For Users

- **[User Guide](./user-guide.md)** - How to use the POS system (coming soon)
- **[Installation Guide](./installation.md)** - Setup and installation instructions (coming soon)
- **[FAQ](./faq.md)** - Frequently asked questions (coming soon)

### Project Management

- **[SRS Document](./SRS/)** - Software Requirements Specification
- **[UI Wireframes](./UI-wireframes/)** - User interface designs and mockups
- **[Changelog](./CHANGELOG.md)** - Version history and changes (coming soon)

## 🏗️ Project Overview

The Kiya Smart POS & Inventory Management System is a comprehensive point-of-sale solution designed for retail businesses. It consists of three main applications:

### 1. Backend (Node.js + Express)

A robust RESTful API server that handles:
- User authentication and authorization
- Product and inventory management
- Sales transactions and receipts
- Customer management
- Reporting and analytics
- Multi-store support

**Key Technologies:**
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- Bcrypt for password hashing

### 2. Web Application (Vue.js)

A modern web interface for:
- Cashier POS operations
- Manager dashboards and employee management
- Owner analytics and shop settings
- Admin multi-store management
- Bilingual support (Amharic + English)

**Key Technologies:**
- Vue.js 3 with Composition API
- TypeScript
- Vite for build tooling
- React Router for navigation

### 3. Mobile Application (React Native)

A native mobile app providing:
- Mobile POS functionality
- Barcode scanning via camera
- Manager notifications and alerts
- Owner monitoring dashboard
- Offline capability (planned)

**Key Technologies:**
- React Native
- TypeScript
- React Navigation
- Native device APIs

## 🎯 Key Features

### Core POS Features

- ✅ **Product Management**
  - Product registration with barcodes
  - Category and brand management
  - Bulk import/export
  - Image support

- ✅ **Inventory Management**
  - Real-time stock tracking
  - Low stock alerts
  - Stock movement logs
  - Multi-location inventory

- ✅ **Sales Processing**
  - Fast checkout interface
  - Multiple payment methods
  - Discount and promotion support
  - Receipt printing and QR codes

- ✅ **Customer Management**
  - Customer registration
  - Purchase history
  - Loyalty program (planned)

- ✅ **Reporting & Analytics**
  - Daily, weekly, monthly reports
  - Sales analytics
  - Inventory reports
  - Expense tracking

### User Roles

The system supports multiple user roles with different permissions:

1. **Admin**
   - Multi-store management
   - User management
   - System configuration
   - Approvals and oversight

2. **Owner**
   - Shop settings
   - Expense management
   - Receipt management
   - Full analytics access

3. **Manager**
   - Employee management
   - Inventory oversight
   - Sales reports
   - Shift management

4. **Cashier**
   - POS operations
   - Sales processing
   - Customer registration
   - Receipt printing

5. **Store Keeper**
   - Inventory management
   - Stock updates
   - Product management

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.x
- MongoDB >= 6.0
- npm or yarn
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/POS.git
   cd POS
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install web dependencies:**
   ```bash
   cd ../web
   npm install
   ```

4. **Install mobile dependencies:**
   ```bash
   cd ../mobile
   npm install
   ```

5. **Set up environment variables:**
   - Copy `.env.example` files in each directory
   - Configure database connections and API keys

6. **Start MongoDB:**
   ```bash
   mongod
   ```

7. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

8. **Start the web app:**
   ```bash
   cd web
   npm run dev
   ```

9. **Start the mobile app:**
   ```bash
   cd mobile
   npm start
   ```

## 📁 Project Structure

```
POS/
├── backend/          # Node.js backend API
│   ├── src/
│   │   ├── modules/  # Feature modules
│   │   ├── routes/   # API routes
│   │   ├── middleware/
│   │   └── services/
│   └── package.json
│
├── web/              # Vue.js web application
│   ├── src/
│   │   ├── pages/    # Page components
│   │   ├── components/
│   │   ├── services/  # API services
│   │   └── utils/
│   └── package.json
│
├── mobile/           # React Native mobile app
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   └── services/
│   ├── android/
│   ├── ios/
│   └── package.json
│
├── doc/              # Documentation
│   ├── CONTRIBUTING.md
│   ├── README.md
│   ├── API.md
│   └── SRS/
│
└── README.md         # Root README
```

## 🔧 Development

### Backend Development

```bash
cd backend
npm run dev          # Start development server
npm test             # Run tests
npm run lint         # Lint code
```

### Web Development

```bash
cd web
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
```

### Mobile Development

```bash
cd mobile
npm start            # Start Metro bundler
npm run android      # Run on Android
npm run ios          # Run on iOS
npm test             # Run tests
```

## 🧪 Testing

- **Backend**: Unit and integration tests using Jest
- **Web**: Component and E2E tests
- **Mobile**: Unit and component tests

Run all tests:
```bash
npm test  # In each directory
```

## 📝 Code Style

- **Backend**: ESLint with Node.js best practices
- **Web**: ESLint + Prettier with Vue.js style guide
- **Mobile**: ESLint with React Native rules

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](./CONTRIBUTING.md) before submitting pull requests.

## 📄 License

[Specify your license here]

## 👥 Team

- Backend Team
- Frontend Team
- Mobile Team

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/POS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/POS/discussions)
- **Email**: support@yourdomain.com

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Core POS functionality
- ✅ Basic inventory management
- ✅ User authentication
- ✅ Multi-role support

### Phase 2 (Planned)
- 🔄 Advanced reporting
- 🔄 Loyalty program
- 🔄 Supplier management
- 🔄 Mobile offline mode

### Phase 3 (Future)
- 📋 Multi-currency support
- 📋 Advanced analytics
- 📋 Desktop application (Electron)
- 📋 API for third-party integrations

## 📊 Status

- **Backend**: ✅ Active Development
- **Web**: ✅ Active Development
- **Mobile**: ✅ Active Development
- **Documentation**: 🔄 In Progress

---

**Last Updated**: November 2024

For the latest updates, check our [Changelog](./CHANGELOG.md) or [GitHub Releases](https://github.com/your-org/POS/releases).

