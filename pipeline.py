from langgraph.graph import StateGraph, END
from state import ResearchState

from agents import (
    search_node,
    reader_node,
    writer_node,
    critic_node
)

# ==========================================
# CONDITIONAL ROUTING
# ==========================================

def should_rewrite(state):

    feedback = state["feedback"]

    try:
        score = int(
            feedback.split("Score:")[1]
            .split("/")[0]
            .strip()
        )
    except:
        score = 10

    print(f"\nDetected Score = {score}")

    if score < 8:
        print("Score below 8 → Rewriting Report...")
        return "rewrite"

    return "end"


# ==========================================
# BUILD GRAPH
# ==========================================

builder = StateGraph(ResearchState)

builder.add_node("search", search_node)
builder.add_node("reader", reader_node)
builder.add_node("writer", writer_node)
builder.add_node("critic", critic_node)

builder.set_entry_point("search")

builder.add_edge("search", "reader")
builder.add_edge("reader", "writer")
builder.add_edge("writer", "critic")

builder.add_conditional_edges(
    "critic",
    should_rewrite,
    {
        "rewrite": "writer",
        "end": END
    }
)

graph = builder.compile()


# ==========================================
# RUN
# ==========================================

if __name__ == "__main__":

    topic = input("\nEnter Research Topic: ")

    result = graph.invoke({
        "topic": topic
    })


    # Save markdown file
    filename = topic.replace(" ", "_") + ".md"

    with open(filename, "w", encoding="utf-8") as f:
        f.write(result["report"])

    print("\n✓ should_rewrite() → end → file saved")
    print(f"📄 {filename}")

    print("\n" + "=" * 70)
    print("FINAL REPORT")
    print("=" * 70)
    print(result["report"])

    print("\n" + "=" * 70)
    print("CRITIC FEEDBACK")
    print("=" * 70)
    print(result["feedback"])

