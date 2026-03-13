# 📁 Kiya Smart POS System – Project Folder Structure & Architecture

### *(Based on SRS Document & Team Collaboration Requirements)*

This document defines the **scalable, modular, team-friendly folder structure** for the Kiya Smart POS & Inventory Management System. It covers:

* Backend structure
* Web structure
* Mobile structure
* Shared modules
* Documentation structure
* Recommended workflows
* Best practices for 2–5 developers
* Future support for Electron desktop

---

# 🏗️ 1. Overview

The project contains **three main applications**:

1. **Backend** → Node.js + Express (Monolithic backend with modular architecture)
2. **Web App** → React + Vite
3. **Mobile App** → React Native

It uses a **monorepo** layout to improve collaboration among a 2–5 person team.

Future support for **Electron desktop app** will integrate without major changes.

---

# 📦 2. Project Root Folder Structure

```
smart-pos-system/
│
├── backend/
├── web/
├── mobile/
├── shared/
├── docs/
│
├── .gitignore
└── README.md
```

Each major application lives in its own directory with isolated dependencies.

---

# 🖥️ 3. Backend Structure (Node.js Monolithic – Modular Inside)

```
backend/
│
├── src/
│   ├── config/
│   │   ├── db.js
│   │   ├── env.js
│   │   └── logger.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── receipts/
│   │   ├── customers/
│   │   ├── reports/
│   │   ├── expenses/
│   │   ├── barcodes/
│   │   ├── stores/
│   │   └── utils/
│   │
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── constants/
│   ├── jobs/
│   ├── app.js
│   └── server.js
│
├── tests/
├── package.json
└── README.md
```

### ✨ Why this works

* Matches all SRS modules exactly
* Easy to assign to different team members
* Clear separation of business logic, controllers, and routes
* Supports future expansion (supplier module, loyalty program, etc.)

---

# 🌐 4. Web App Structure (React + Vite)

```
web/
│
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── cashier/
│   │   ├── manager/
│   │   ├── owner/
│   │   ├── admin/
│   │   └── layout/
│   │
│   ├── hooks/
│   ├── context/
│   ├── services/     # axios wrappers, API calls
│   ├── utils/
│   ├── assets/
│   ├── styles/
│   └── main.tsx
│
├── public/
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── .gitignore
├── package.json
└── README.md
```

### Matching SRS Pages:

* Cashier POS pages
* Manager dashboard + employee management
* Owner pages (expenses, receipts, shop settings)
* Admin pages (mart management, approvals)
* Multi-language UI: Amharic + English

---

# 📱 5. Mobile App Structure (React Native)

```
mobile/
│
├── src/
│   ├── screens/
│   ├── components/
│   ├── navigation/
│   ├── hooks/
│   ├── context/
│   ├── services/
│   ├── utils/
│   ├── assets/
│   └── App.js
│
├── android/
├── ios/
├── package.json
└── README.md
```

### Mobile features include:

* Cashier POS (camera barcode scanning)
* Manager stats and alerts
* Owner monitoring dashboard

---

# 🔁 6. Shared Modules (Optional but Recommended)

```
shared/
│
├── utils/
├── types/
└── constants/
```

Use this folder to share:

* **Roles** (Admin, Owner, Manager, Cashier, Store Keeper)
* Validation helpers
* Currency / number formatters
* Barcode utilities
* Reusable constants

Shared code reduces duplication across web + backend + mobile.

---

# 📚 7. Documentation Folder (SRS, API Docs, Diagrams)

```
docs/
│
├── SRS/
├── API/
├── UI-wireframes/
└── architecture/
```

Good for team and client communication.

Examples:

* Updated SRS
* Postman collections
* ER diagrams
* Sequence diagrams
* UI/UX wireframes

---

# 🧱 8. Backend Module Template

Each module inside `backend/src/modules/` follows:

```
module-name/
│
├── module.model.js
├── module.controller.js
├── module.service.js
├── module.routes.js
├── module.validators.js
├── module.helpers.js
└── index.js
```

### Matches SRS sub-systems like:

* `products` → item registration, editing, barcodes
* `sales` → POS logic, discounts, extra charges
* `receipts` → printing, QR
* `inventory` → stock logs and management
* `customers` → registration
* `reports` → daily/weekly/monthly reports

---

# 🧩 9. Web Pages (By Role – SRS Based)

```
web/src/pages/
│
├── cashier/
├── manager/
├── owner/
├── admin/
└── storekeeper/
```

This exactly matches the SRS user classes.

---

# 🖥️ 10. Future Desktop (Electron)

Not needed now, but will fit like this:

```
desktop/
   ├── electron/
   ├── src/
   ├── preload/
   └── package.json
```

Electron will load your web build and add printer, barcode scanner, and offline mode functionality.

---

# 🤝 11. Why This Folder Structure Works for 2–5 Team Members

### ✔ Easy parallel development

Each developer gets one directory:

* backend dev
* web dev
* mobile dev
* shared utilities
* documentation

### ✔ No merge conflicts

Clear separation of responsibilities.

### ✔ CI/CD friendly

Monorepo supports automated deployment for backend, web, mobile.

---

# 📝 12. Summary

This folder structure:

* Fully aligns with your **Kiya Smart POS SRS V2**
* Supports clean, modular development
* Works perfectly for a small team
* Handles Web + Mobile + Backend + Future Desktop
* Highly scalable for future features
* Matches enterprise-level POS systems

---
