# SecureGen

SecureGen is an AI-powered code security auditing tool that analyzes source code for vulnerabilities and provides secure alternatives. Built with React, Vite, and Tailwind CSS, it leverages the Groq API for blazing-fast AI analysis.

## Features

- **Instant Security Analysis**: Analyzes your code snippet for common vulnerabilities.
- **Risk Scoring**: Generates a risk score from 0-100 indicating the severity of the found issues.
- **Secure Code Generation**: Automatically generates a secure version of your code with explanations.
- **Diff View**: Highlights the exact changes made to secure your code.
- **Privacy First**: SecureGen is a frontend-only application. Your API key and code snippets are never stored on any server.

## Tech Stack

- **Frontend**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, Glassmorphism UI
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Syntax Highlighting**: Prism.js
- **AI Integration**: Groq API

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd securegen
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

4. **Usage**
   - Open your browser to the local server address (usually `http://localhost:5173`).
   - You will need a **Groq API Key**. Enter the key directly into the application's UI when prompted.
   - *Note: No environment variables (`.env` files) are needed for deployment as the app is fully client-side.*

## Security & Privacy Note

**Zero Server-Side Storage:** 
This application operates completely within your browser. All API requests are made directly from the client to the Groq API. Your API key and code snippets are stored exclusively in your browser's local storage and are never sent to a backend server or database.

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com).
- A `vercel.json` file is included to handle Single Page Application (SPA) routing.
- The build command is `npm run build` and the output directory is `dist`.
