# 🚀 SmartSupport AI — Enterprise Multi-Tenant AI Customer Support Platform

SmartSupport AI is a production-ready, full-stack AI Customer Support & Ticket Operations Platform powered by **Mistral AI**, **Pinecone Vector Database**, **Prisma ORM**, and **Neon Cloud PostgreSQL**.

---

## 🌟 Key Features

### 👤 1. Customer Support Portal
- **Ticket Management**: Create, track, and converse on support tickets with real-time status updates.
- **24/7 AI Chatbot Workspace**: Interactive AI assistant powered by RAG (Retrieval-Augmented Generation) with suggested prompt pills.
- **Persistent DB Chat History**: Chatbot conversations persist automatically in the PostgreSQL database across browser refreshes.
- **1-Click Ticket Escalation**: Effortlessly turn AI conversations into official support tickets.

### 🎧 2. Agent AI Copilot Workspace
- **Automated AI Triage**: Real-time classification of ticket category, priority, and customer sentiment (`NEUTRAL`, `FRUSTRATED`, `ANGRY`).
- **One-Click Draft Replies**: AI-generated context-aware response suggestions grounded in internal company documentation.
- **Ticket Lifecycle Management**: Assign agents, update ticket status (`OPEN`, `IN_PROGRESS`, `RESOLVED`), and view detailed event audit logs.

### 📊 3. Admin Operations Console & PDF Pipeline
- **Real-Time Analytics Dashboard**: Real-time metric cards tracking total tickets, response times, resolution rates, and agent metrics.
- **Native PDF Ingestion**: Drag-and-drop PDF upload pipeline with Node.js text extraction (no binary leaks) and 900-character chunking.
- **Vector Search Simulator**: Live Pinecone RAG retrieval playground to test vector similarity scores and citations.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Clients["Client Portals - React 18 & Vite"]
        CP["Customer Portal & 24/7 AI Chatbot"]
        AP["Agent Copilot Workspace"]
        AD["Admin Operations & PDF Ingestion"]
    end

    subgraph Auth["Authentication"]
        CLERK["Clerk Auth - RBAC Security"]
    end

    subgraph Backend["Express.js Backend API"]
        MW["Auth & Tenant Isolation Middleware"]
        TC["Ticket Management Controller"]
        KC["Knowledge & PDF Pipeline Controller"]
        AC["Analytics Engine Controller"]
    end

    subgraph Storage["Database & Vector Storage"]
        PRISMA["Prisma ORM"]
        NEON["Neon Cloud PostgreSQL Database"]
        PINECONE["Pinecone Cloud Vector Store"]
    end

    subgraph AI["AI & RAG Engine"]
        MISTRAL["Mistral AI API - mistral-small-latest"]
    end

    CP --> CLERK
    AP --> CLERK
    AD --> CLERK

    CLERK --> MW
    MW --> TC
    MW --> KC
    MW --> AC

    TC --> PRISMA
    KC --> PRISMA
    AC --> PRISMA
    PRISMA --> NEON

    KC --> PINECONE
    TC --> MISTRAL
    PINECONE --> MISTRAL
    MISTRAL --> TC
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Lucide Icons |
| **Authentication** | Clerk Auth (`@clerk/clerk-react`) with dynamic RBAC role routing |
| **Backend API** | Node.js, Express.js (ESM Modules), Multer, `pdf-parse` |
| **Database & ORM** | Neon Cloud PostgreSQL, Prisma ORM |
| **AI Triage & LLM** | Mistral AI API (`mistral-small-latest`) |
| **Vector DB / RAG** | Pinecone Cloud Vector Store (`ai-customer-support`) |

---

## 📁 Project Structure

```
Skillmine/
├── client/                     # Vite + React Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable UI Components & Chatbot
│   │   ├── context/            # AuthContext (Clerk + Local User State)
│   │   ├── pages/              # Customer, Agent, and Admin Dashboards
│   │   ├── services/           # Axios API Client
│   │   └── App.jsx             # Main Router & Navigation Header
│   └── package.json
│
├── server/                     # Node.js + Express Backend API
│   ├── prisma/
│   │   ├── schema.prisma       # Multi-tenant PostgreSQL Data Model
│   │   └── seed.js             # Initial Seeding Script
│   ├── src/
│   │   ├── controllers/        # Ticket, Knowledge, Analytics & User Logic
│   │   ├── middleware/         # Auth, Tenant Isolation, Error & PDF Upload
│   │   ├── routes/             # Express API Routes
│   │   ├── services/           # Mistral AI, Pinecone Vector & Knowledge Indexing
│   │   └── app.js              # Server Entrypoint
│   └── package.json
│
└── README.md
```

---

## 🔑 Environment Variables Configuration

Create a `server/.env` file in the `server/` directory:

### `server/.env`
```env
PORT=5000
DATABASE_URL="postgresql://your_user:your_password@your-host.neon.tech/neondb?sslmode=require&connect_timeout=30"
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key

# Clerk Auth
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_PUBLISHABLE_KEY

# Pinecone Cloud Vector Index
PINECONE_API_KEY=pcsk_YOUR_PINECONE_API_KEY
PINECONE_INDEX=ai-customer-support
PINECONE_HOST=https://your-index-host.svc.pinecone.io

# Mistral AI
MISTRAL_API_KEY=YOUR_MISTRAL_API_KEY
MISTRAL_MODEL=mistral-small-latest
```

---

## ⚡ Quick Start & Running Locally

### 1. Start Backend Server
```bash
cd server
npm install

# Push Prisma Schema to Neon Cloud PostgreSQL
npx prisma db push

# Seed Baseline Accounts & Documentation
node prisma/seed.js

# Start Express Backend
node src/app.js
```
*Backend API will run at: `http://localhost:5000`*

### 2. Start Frontend Client
```bash
cd client
npm install
npm run dev
```
*Frontend Client will run at: `http://localhost:5173`*

---

## 📜 License
Licensed under the MIT License.
