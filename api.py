from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse
from pipeline import graph

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


@app.post("/research")
def run_research(data: ResearchRequest):

    try:
        print("REQUEST RECEIVED:", data.topic)

        result = graph.invoke({
            "topic": data.topic
        })

        print("GRAPH RESULT:", result)

        report = result.get("report", "")

        filename = data.topic.replace(" ", "_") + ".md"

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
        return {
            "error": str(e)
        }

@app.get("/report/{filename}")
def get_report(filename: str):
    return FileResponse(
        path=filename,
        media_type="text/markdown",
        filename=filename
    )