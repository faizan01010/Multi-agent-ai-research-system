from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse
from pipeline import graph
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str

@app.get("/")
def home():
    return {"status": "API is running 🚀"}

@app.post("/research")
def run_research(data: ResearchRequest):

    try:
        print("REQUEST RECEIVED:", data.topic)

        result = graph.invoke({
            "topic": data.topic
        })

        print("GRAPH RESULT:", result)

        report = result.get("report", "")

        safe_topic = re.sub(r'[^a-zA-Z0-9_-]', '_', data.topic)[:50]
        filename = safe_topic + ".md"

        with open(filename, "w", encoding="utf-8") as f:
            f.write(report)

        print("Saved at:", filename)

        return {
            "report": result.get("report", ""),
            "feedback": result.get("feedback", ""),
            "file_name": filename,
            "logs": [
                {"msg": "search done"},
                {"msg": "reader done"},
                {"msg": "writer done"},
                {"msg": "critic done"}
            ]
        }

    except Exception as e:
      print("ERROR:", str(e))
      raise HTTPException(
         status_code=503,
         detail="Research is taking longer than usual (API busy). Please try again in a few seconds."
      )

@app.get("/report/{filename}")
def get_report(filename: str):
    return FileResponse(
        path=filename,
        media_type="text/markdown",
        filename=filename
    )