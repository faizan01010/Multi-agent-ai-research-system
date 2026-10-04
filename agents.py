from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.rate_limiters import InMemoryRateLimiter
from tools import web_search, scrape_url
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

load_dotenv()

# ====================================================
# RATE LIMITER
# ====================================================

rate_limiter = InMemoryRateLimiter(
    requests_per_second=0.3,   
    check_every_n_seconds=0.2,
    max_bucket_size=1,
)

# ====================================================
# ERROR DETECTION HELPER
# ====================================================

def raise_if_error(text: str, source: str):
    if isinstance(text, str) and (
        "rate_limited" in text
        or "429" in text
        or "Error response" in text
        or "raw_status_code" in text
    ):
        raise Exception(f"{source} returned an error as content: {text[:200]}")


#model setup
llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    rate_limiter=rate_limiter,
)


def build_search_agent():
    return create_agent(model=llm, tools=[web_search])

def build_reader_agent():
    return create_agent(model=llm, tools=[scrape_url])


writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
    ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional."""),
])

writer_chain = writer_prompt | llm | StrOutputParser()

critic_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a sharp and constructive research critic. Be honest and specific."),
    ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

One line verdict:
..."""),
])

critic_chain = critic_prompt | llm | StrOutputParser()


# ====================================================
# LANGGRAPH NODES
# ====================================================

@retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=5, max=20))
def search_node(state):
    print("\n" + "=" * 50)
    print("STEP 1 - SEARCH AGENT")
    print("=" * 50)

    search_agent = build_search_agent()
    result = search_agent.invoke({
        "messages": [("user", f"Find recent, reliable and detailed information about: {state['topic']}")]
    })

    search_results = result["messages"][-1].content
    raise_if_error(search_results, "search_node")

    return {"search_results": search_results}


@retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=5, max=20))
def reader_node(state):
    print("\n" + "=" * 50)
    print("STEP 2 - READER AGENT")
    print("=" * 50)

    reader_agent = build_reader_agent()
    result = reader_agent.invoke({
        "messages": [("user", f"""
Based on the following search results about '{state['topic']}',
pick the most relevant URL and scrape it.

Search Results:

{state['search_results'][:1000]}
""")]
    })

    scraped_content = result["messages"][-1].content
    raise_if_error(scraped_content, "reader_node")

    return {"scraped_content": scraped_content}


@retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=5, max=20))
def writer_node(state):
    print("\n" + "=" * 50)
    print("STEP 3 - WRITER")
    print("=" * 50)

    research = f"""
SEARCH RESULTS:

{state['search_results'][:2500]}

SCRAPED CONTENT:

{state['scraped_content'][:2000]}
"""

    report = writer_chain.invoke({"topic": state["topic"], "research": research})
    raise_if_error(report, "writer_node")

    return {
        "report": report,
        "rewrite_count": state.get("rewrite_count", 0) + 1
    }


@retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=5, max=20))
def critic_node(state):
    print("\n" + "=" * 50)
    print("STEP 4 - CRITIC")
    print("=" * 50)

    feedback = critic_chain.invoke({"report": state["report"]})
    raise_if_error(feedback, "critic_node")

    return {"feedback": feedback}