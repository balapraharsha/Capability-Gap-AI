# Capability Gap AI

Capability Gap AI is an **adaptive AI interview simulator** that evaluates whether a candidate is ready for a specific technical role. It dynamically generates interview questions until competency coverage reaches 80% and confidence reaches 75%, then produces a detailed capability report.

## Architecture

### Assessment Flow

1. User selects **Role** + **Experience Level**
2. Assessment Engine loads **competency framework** for the role
3. AI generates the **first question** dynamically
4. User answers
5. Evaluation Engine runs **Observer**, **Critic**, and **Guide** agents
6. Competency Tracker updates scores
7. If coverage ≥ 80% and confidence ≥ 75% → generate report and end
8. Otherwise → AI generates **next question** targeting remaining competencies
9. Repeat until stop condition

### Supported Roles & Competencies

| Role | Competencies |
|------|--------------|
| Data Analyst | technical_analysis, business_metrics, problem_solving, communication, adaptability, stakeholder_thinking |
| Backend Engineer | system_design, scalability, debugging, tradeoff_reasoning, communication, ownership |
| Data Scientist | technical_analysis, experimentation, problem_solving, communication, adaptability, stakeholder_thinking |
| ML Engineer | system_design, model_serving, debugging, tradeoff_reasoning, communication, ownership |
| Product Manager | product_thinking, business_metrics, prioritization, communication, stakeholder_thinking, adaptability |
| Cloud Engineer | system_design, scalability, cost_optimization, tradeoff_reasoning, debugging, ownership |

### Question Types

- `quiz`, `case_study`, `situation`, `communication_task`, `leadership_scenario`, `technical_reasoning`

### DynamoDB Tables

- **Users** – user metadata
- **AssessmentSessions** – session state (tested/remaining competencies, confidence, coverage, current question)
- **Answers** – per-answer evaluations (Observer, Critic, Guide outputs)
- **Reports** – final capability reports

## Project Structure

```
capability-gap-ai/
├── frontend/          # React + TypeScript + Tailwind + Vite
│   └── src/
│       ├── components/
│       ├── pages/     # Home, RoleSelection, Assessment, Evaluation, Dashboard, Report
│       ├── context/
│       ├── api.ts
│       └── types.ts
├── backend/
│   └── lambda/
│       ├── assessment_engine.py   # Main orchestration
│       ├── competency_tracker.py  # Tracks coverage and confidence
│       ├── topic_retriever.py     # Loads competency frameworks
│       ├── question_synthesizer.py# Generates FAANG-style questions
│       ├── observer_agent.py      # Extracts reasoning structure
│       ├── critic_agent.py        # Detects reasoning flaws
│       ├── guide_agent.py         # Socratic follow-up questions
│       ├── report_generator.py    # Final capability report
│       └── common.py
└── infrastructure/
    └── template.yaml  # AWS SAM
```

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/assessment/start` | Start session, generate first question |
| POST | `/assessment/{sessionId}/answer` | Evaluate answer, generate next question or report |
| GET | `/assessment/{sessionId}/report` | Return final capability report |
| GET | `/users/{userId}/assessments` | List user assessments |

## Getting Started

### Frontend

```bash
cd frontend
npm install
```

Create `.env`:

```
VITE_API_BASE_URL=https://your-api-id.execute-api.region.amazonaws.com/prod
```

```bash
npm run dev
```

### Backend & Infrastructure

```bash
cd infrastructure
sam build
sam deploy --guided
```

- Ensure AWS CLI and SAM CLI are installed
- Enable Amazon Bedrock access in your account
- For local/mock evaluation, set `BEDROCK_MOCK=1` in Lambda environment

### Deployment

1. Deploy SAM stack: `sam deploy --guided`
2. Copy the `ApiUrl` output
3. Set `VITE_API_BASE_URL` in frontend `.env`
4. Build and serve: `cd frontend && npm run build`
