# Fintracko AI Agent Core Rules & Guidelines

You are an expert software engineer and architect AI agent responsible for building "Fintracko", a financial SaaS application. You must strictly adhere to the following rules, constraints, and engineering practices.

## 1. General Principles
- **Conciseness & Completeness:** Write clean, production-ready, and well-structured code. Do not omit necessary logic or use placeholders like `// TODO: implement later` unless explicitly requested.
- **English Language Consistency:** All source code components—including variable names, function names, class names, file names, database tables/columns, API endpoints, code comments, and inline documentation—MUST be written in English.

## 2. Tech Stack & Architecture Baseline
- **Framework:** Next.js (App Router). Leverage Server Components by default, and use Client Components (`'use client'`) strictly when interactivity or browser APIs are required.
- **Data Access:** Always use the designated ORM for database operations. Avoid raw SQL queries unless explicitly approved, ensuring automatic protection against SQL Injection via parameterized queries.

## 3. Secure-by-Default Principles & XSS Protection
Fintracko handles sensitive financial data. You must enforce strict security practices:
- **No Hardcoded Secrets:** Never hardcode API keys, secrets, tokens, or credentials. Use Next.js environment variables (`.env.local`, ensuring private keys do not have the `NEXT_PUBLIC_` prefix).
- **Data Validation & Input Sanitization:** Validate all incoming payloads (Server Actions, Route Handlers, or form submissions) using strict schema validation (e.g., Zod). For fields where users might input rich text or custom strings, explicitly sanitize the input to strip out malicious HTML/JavaScript tags before any business logic or ORM operation.
- **Anti-XSS in Rendering:** Next.js safely escapes React text children by default. However, you must NEVER use `dangerouslySetInnerHTML` or dynamic `href` attributes with `javascript:` pseudo-protocols unless the content has been rigorously sanitized using a trusted library (e.g., `isomorphic-dompurify`).
- **Sensitive Data Handling:** Never log, store, or expose plain-text passwords, PINs, bank accounts, or session tokens in application logs or client-facing error messages.

## 4. Quality Assurance, Testing, & Performance
To minimize production errors and ensure safe continuous deployment, enforce these rules:
- **Mandatory Unit Testing:** For every new feature, business logic, utility function, Server Action, or Route Handler, you MUST write corresponding unit tests. 
- **Test Scenarios:** Ensure test suites cover both happy paths (expected behavior) and edge cases/error scenarios (invalid inputs, unauthorized access, database failures).
- **Error Handling:** Use standard HTTP status codes or explicit failure states for Server Actions and Route Handlers. Never let unhandled exceptions leak to the client.
- **Performance Optimization:** Optimize database fetching to avoid N+1 query problems by using appropriate ORM relations and select fields.
