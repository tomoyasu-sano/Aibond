# Aibond

**Breaking language barriers to deepen bonds with loved ones**

A conversation recording and translation tool for international couples

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=flat&logo=google-cloud&logoColor=white)](https://cloud.google.com/)

## Overview

Aibond is a SaaS platform designed for international couples and families (estimated market: 300,000+ couples). It supports cross-language communication through real-time speech recognition and translation.

### Key Features

- **Real-time Transcription**: Instantly convert spoken conversations into text
- **Speaker Identification**: Automatically identify who said what
- **Real-time Translation**: Translate from primary language to secondary language on the fly
- **AI-powered Organization**: Automatically extract and track commitments from conversations
- **Conversation History Management**: Organize and search important conversations by category

## Demo

🔗 **Live Production**: https://aibond-web-694039525012.asia-northeast1.run.app

## Main Features

### 1. Conversation Recording (Talks)
- Real-time speech recognition and transcription
- Speaker identification
- Multi-language translation (Google Cloud Translation API)
- Conversation history storage and search

### 2. AI Analysis
- Automatic conversation summarization using Google Gemini API
- Automatic extraction and management of commitments
- Sentiment analysis

### 3. Partner Management
- Account linking between couples
- Shared conversation history
- Privacy settings

### 4. Multi-language Support
- Japanese/English UI toggle
- Expandable voice recognition language support

### 5. Subscription Management
- Stripe integration for payment processing
- Multiple pricing plans (Free/Light/Standard/Premium)
- Automatic usage time tracking

## Tech Stack

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible UI components
- **shadcn/ui** - UI component library

### Backend
- **Next.js API Routes** - Server-side API
- **Supabase** - Authentication & Database (PostgreSQL)
- **Supabase Storage** - Audio file storage

### AI & Speech Processing
- **Google Cloud Speech-to-Text** - Voice recognition
- **Google Cloud Translation** - Translation
- **Google Gemini API** - AI analysis & summarization
- **Google Cloud Natural Language** - Sentiment analysis

### Payment & Billing
- **Stripe** - Subscription management
- **Stripe Webhooks** - Event processing

### Infrastructure
- **Google Cloud Run** - Container hosting
- **Google Cloud Secrets** - Secret management
- **Google Cloud Build** - CI/CD
- **Docker** - Containerization

## Project Structure

```
Aibond/
├── web/                    # Next.js application
│   ├── src/
│   │   ├── app/           # App Router
│   │   ├── components/    # UI components
│   │   ├── lib/           # Utilities & libraries
│   │   └── types/         # TypeScript type definitions
│   ├── public/            # Static files
│   └── Dockerfile         # Production environment
├── scripts/               # Deployment scripts
├── SPECIFICATION/         # Technical specifications
└── documents/            # Documentation
```

## Acknowledgments

This project uses the following technologies and services:
- Next.js
- Supabase
- Google Cloud Platform
- Stripe
