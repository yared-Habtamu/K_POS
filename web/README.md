# 🌐 Kiya POS System System - Web Application

React + TypeScript + Vite web application for the Kiya POS System & Inventory Management System.

## 🚀 Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API calls
- **ESLint** - Code linting

## 📁 Project Structure

```
web/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components organized by role
│   │   ├── cashier/    # Cashier POS pages
│   │   ├── manager/    # Manager dashboard & employee management
│   │   ├── owner/      # Owner pages (expenses, receipts, settings)
│   │   ├── admin/      # Admin pages (mart management, approvals)
│   │   └── layout/     # Layout components
│   ├── hooks/          # Custom React hooks
│   ├── context/        # React Context providers
│   ├── services/       # API service layer (axios wrappers)
│   ├── utils/          # Utility functions
│   ├── assets/         # Static assets (images, icons)
│   ├── styles/         # Global styles and themes
│   ├── App.tsx         # Root component
│   └── main.tsx        # Application entry point
├── public/             # Static public assets
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── eslint.config.js    # ESLint configuration
├── package.json        # Dependencies and scripts
└── .gitignore         # Git ignore rules
```

## 🛠️ Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Runs the app in development mode. Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### Build for Production

```bash
npm run build
```

Builds the app for production to the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

Preview the production build locally.

### Linting

```bash
npm run lint
```

Run ESLint to check code quality.

## 🎯 Features

- **Role-based Pages**: Organized by user roles (Cashier, Manager, Owner, Admin, Store Keeper)
- **Multi-language Support**: Amharic + English UI
- **Type Safety**: Full TypeScript support
- **Fast Development**: Vite HMR for instant updates
- **Code Quality**: ESLint configuration for consistent code style

## 📝 Notes

- This is part of a monorepo structure. See root `README.md` for overall project architecture.
- API endpoints should be configured in `src/services/` directory.
- Environment variables should be stored in `.env` files (not committed to git).

## 🔗 Related Documentation

- [Project Architecture](../../README.md) - Overall project structure
- [Backend API](../../backend/README.md) - Backend API documentation
- [Mobile App](../../mobile/README.md) - React Native mobile app
