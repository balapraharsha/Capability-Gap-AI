# Capably AI — Adaptive Technical Capability Assessment Platform

AI-powered platform that simulates real technical interview situations and evaluates a candidate’s **role readiness using adaptive AI scenarios and multi-agent evaluation**.

This project was built as part of the **AI for Bharat Hackathon**, where it was **shortlisted for its approach to AI-driven capability evaluation and adaptive interview simulation**.

Unlike traditional quizzes, Capaby AI presents **realistic engineering problems** such as debugging code, fixing broken implementations, analyzing logs, and making decisions under pressure. Each answer is evaluated by AI agents to determine reasoning quality, technical accuracy, and communication clarity.

The system then generates a **comprehensive capability report** highlighting strengths, weaknesses, and personalized learning recommendations.

---

# Key Features

## Adaptive AI Assessment

Questions dynamically adapt based on user responses, allowing the system to simulate real interview pressure and evaluate decision-making.

## Scenario Chain Engine

Multi-step scenarios simulate real workplace incidents:

Decision → Complication → Follow-up Decision → Escalation → Final Resolution

Each step increases complexity and evaluates adaptability.

## Multi-Agent AI Evaluation

Each response is analyzed by three AI agents:

Observer
Summarizes reasoning and decision approach.

Critic
Evaluates technical depth, trade-offs, and correctness.

Guide
Provides improvement suggestions and deeper reflection prompts.

## Six Technical Question Types

1. Scenario Decision
2. Debug the Code
3. Fix the Code
4. Code Review
5. Log Detective
6. Complexity Analysis

## Nine Skill Dimensions Evaluated

* Decision Making
* Debugging Ability
* Code Correctness
* Code Quality
* Incident Diagnosis
* Algorithmic Thinking
* Communication Clarity
* Adaptability Under Pressure
* Technical Depth

## Capability Report

After the assessment, the platform generates:

* Overall readiness score
* Radar chart of skill dimensions
* Strength and weakness analysis
* Priority improvement areas
* Personalized learning recommendations

---

# System Architecture

The system is composed of three major layers:

Frontend (React + TypeScript)

Handles UI rendering, scenario flow, and visualization of capability analytics.

Backend (Python + AWS Lambda)

Generates questions, manages scenario chains, evaluates responses, and generates reports.

AI Layer (AWS Bedrock)

Claude models power question generation and evaluation agents.

---

# Project Structure

```
Capability-Gap-AI
│
├── backend
│   ├── lambda
│   │   ├── assessment_engine.py
│   │   ├── common.py
│   │   ├── competency_tracker.py
│   │   ├── critic_agent.py
│   │   ├── guide_agent.py
│   │   ├── observer_agent.py
│   │   ├── question_synthesizer.py
│   │   ├── report_generator.py
│   │   ├── scenario_chain_synthesizer.py
│   │   ├── technical_question_synthesizer.py
│   │   └── topic_retriever.py
│   │
│   └── requirements.txt
│
├── frontend
│   ├── src
│   │   ├── components
│   │   │   ├── Layout.tsx
│   │   │   ├── TechnicalQuestionCard.tsx
│   │   │   └── TimerBadge.tsx
│   │   │
│   │   ├── context
│   │   │   └── AssessmentContext.tsx
│   │   │
│   │   ├── pages
│   │   │   ├── AssessmentPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EvaluationPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── ReportPage.tsx
│   │   │   └── RoleSelectionPage.tsx
│   │   │
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── types.ts
│   │
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.cjs
│   ├── tailwind.config.cjs
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── infrastructure
│   └── template.yaml
│
└── README.md
```

---

# Assessment Workflow

1. User selects a target role and experience level
2. Backend loads competency framework for the role
3. AI generates an adaptive assessment
4. User answers six progressively complex questions
5. AI agents evaluate each response
6. Skill scores are calculated across nine dimensions
7. Final capability report is generated

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* Axios
* Recharts

## Backend

* Python
* AWS Lambda
* AWS SAM

## AI

* AWS Bedrock
* Claude Models

## Infrastructure

* Serverless Architecture
* AWS API Gateway
* AWS Lambda Functions

---

# Running the Project

Clone the repository

```
git clone https://github.com/yourusername/capaby-ai.git
```

Install frontend dependencies

```
cd frontend
npm install
```

Create environment file

```
.env
```

Add API endpoint

```
VITE_API_BASE_URL=http://localhost:3000
```

Start development server

```
npm run dev
```

---

# Hackathon Recognition

This project was developed during the **AI for Bharat Hackathon** and was shortlisted for its innovative approach to **AI-driven technical capability assessment and adaptive interview simulation**.

---

# Future Improvements

* Real-time coding execution environment
* Interview simulation mode
* AI-generated personalized practice questions
* Team analytics dashboard for recruiters
* Skill progression tracking across multiple assessments

---

# Author
## 👨‍💻 Developed By

**Bala Praharsha Mannepalli**  
📧 [balapraharsha.m@gmail.com]  
🔗 [LinkedIn](https://linkedin.com/in/mannepalli-bala-praharsha) | [GitHub](https://github.com/balapraharsha)  

**Yasasswini Idimukkala**  
📧 [yasasswini.idimukkala.8@gmail.com]  
🔗 [LinkedIn](https://www.linkedin.com/in/idimukkala-yasasswini) | [GitHub](https://github.com/yasasswini08)

---

## 💖 Show Some Love
Enjoying this project? Give it a **star** ⭐ on GitHub!  
Contributions, suggestions, and forks are always welcome.

