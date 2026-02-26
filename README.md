Good.
Private repo is fine for now. Just make sure you can share access with evaluators later.

Here is a **clean, judge-friendly README.md** — professional, structured, not overhyped.

You can paste this directly.

---

# Capability Gap AI

An intervention-first AI system designed to shift students from academic coding habits to industry-ready systemic reasoning through real-time Socratic intervention.

---

## 🚀 Problem Statement

Many Tier-2 and Tier-3 students in India master technical tools but struggle with reasoning under ambiguity, constraints, and trade-offs in real-world scenarios.

This “Tool-Master’s Trap” leads to fragile solutions, rework, and poor interview performance.

Capability Gap AI addresses this gap by analyzing *how* learners think — not just whether their answer is correct.

---

## 🧠 Solution Overview

Capability Gap AI provides real-time reasoning analysis during system design problem solving.

Instead of grading answers, the system:

1. Extracts reasoning structure
2. Detects flawed thinking patterns
3. Assigns an alignment score (0–1)
4. Intervenes with a targeted Socratic question
5. Measures improvement through Reasoning Alignment Delta (RAD)

This enables measurable cognitive growth within a single session.

---

## 🏗 Architecture Overview

Frontend

* React (AWS Amplify Hosting)

Backend

* FastAPI (Python)
* AWS Lambda (serverless execution)

AI Layer

* Amazon Bedrock
* Anthropic Claude 3 Haiku (structured reasoning analysis)

Storage

* Amazon S3 (scenario prompts)
* Amazon DynamoDB (session traces)

---

## 🔁 Core Workflow

1. User selects a scenario
2. User submits reasoning in free text
3. Backend invokes Bedrock (Claude 3 Haiku)
4. Model returns structured JSON containing:

   * Detected reasoning risks
   * Alignment score
   * Socratic intervention prompt
5. User revises response
6. System recalculates score and displays RAD improvement

---

## 📊 Key Metrics

* **Reasoning Alignment Score (0–1)**
* **Reasoning Alignment Delta (RAD)**
* Risk detection categories:

  * Code-first bias
  * Assumption lock-in
  * Missing scalability
  * Ignoring constraints
  * Lack of trade-off analysis

---

## 🛠 Tech Stack

* Amazon Bedrock (Claude 3 Haiku)
* AWS Lambda
* AWS Amplify
* Amazon S3
* Amazon DynamoDB
* FastAPI
* React

---

## 📦 Repository Structure

```
/frontend        → React application
/backend         → FastAPI service
/lambda          → AWS Lambda deployment config
/docs            → Architecture diagrams & wireframes
```

---

## 🔐 Data & Privacy

* No personally identifiable information is collected
* Session-level reasoning traces only
* All AI outputs returned in structured JSON format
* Advisory-only system (no hiring or ranking decisions)

---

## 🎯 Prototype Goal

To demonstrate a functional real-time AI reasoning intervention pipeline powered by Amazon Bedrock, capable of showing measurable improvement in thinking within a single session.

---

## 📌 Current Status

* System architecture finalized
* Risk taxonomy defined
* JSON response contract defined
* Backend scaffolded
* AWS Bedrock integration in progress

---


We build this clean.
No wasted motion. 🚀
