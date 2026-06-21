# Multi-Agent AI Research System

An AI-powered research assistant built using Langchain, Langgraph, and Mistral AI. The system uses multiple specialized agents to perform web research, analyze information, generate detailed reports, and evaluate report quality through an automated critic-feedback loop.

## Features

* Multi-Agent Architecture
* Web Search Integration
* Content Extraction & Analysis
* Automated Research Report Generation
* Critic-Based Report Evaluation
* Reflection & Rewrite Loop
* Markdown Report Export
* FastAPI Backend
* React Frontend Dashboard
* Real-Time Workflow Visualization

## Architecture

Search Agent
↓
Reader Agent
↓
Writer Agent
↓
Critic Agent
↓
Conditional Routing
↓
END

## Tech Stack

### Backend

* Python
* FastAPI
* LangChain
* LangGraph
* Mistral AI
* Tavily Search
* BeautifulSoup

### Frontend

* React
* Vite

## Workflow

1. User enters a research topic.
2. Search Agent gathers relevant information.
3. Reader Agent analyzes collected sources.
4. Writer Agent generates a structured report.
5. Critic Agent evaluates report quality.
6. If quality is below threshold, the report is rewritten.
7. Final report is exported as a Markdown (.md) file.

## Installation

```bash
pip install -r requirements.txt
```

```bash
npm install
```

## Run Backend

```bash
uvicorn api:app --reload
```

## Run Frontend

```bash
cd frontend
npm run dev
```

## Output

* Research Report
* Critic Feedback
* Quality Score
* Markdown Export (.md)

## Future Improvements

* PDF Export
* Citation Management
* Multi-Source Verification
* Advanced Agent Memory
* Report Versioning

## Author

mohd. Faizan Khan
