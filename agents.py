from langchain.agents import create_agent
from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tools import web_search , scrape_url 
from dotenv import load_dotenv

load_dotenv()

#model setup 
llm = ChatMistralAI(model="mistral-small-latest",temperature=0)


#1st agent 
def build_search_agent():
    return create_agent(
        model = llm,
        tools= [web_search]
    )

#2nd agent 

def build_reader_agent():
    return create_agent(
        model = llm,
        tools = [scrape_url]
    )


#writer chain 

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

#critic_chain 

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

def search_node(state):

    print("\n" + "=" * 50)
    print("STEP 1 - SEARCH AGENT")
    print("=" * 50)

    search_agent = build_search_agent()

    result = search_agent.invoke({
        "messages": [
            (
                "user",
                f"Find recent, reliable and detailed information about: {state['topic']}"
            )
        ]
    })

    search_results = result["messages"][-1].content

    return {
        "search_results": search_results
    }


def reader_node(state):

    print("\n" + "=" * 50)
    print("STEP 2 - READER AGENT")
    print("=" * 50)

    reader_agent = build_reader_agent()

    result = reader_agent.invoke({
        "messages": [
            (
                "user",
                f"""
Based on the following search results about '{state['topic']}',
pick the most relevant URL and scrape it.

Search Results:

{state['search_results'][:1000]}
"""
            )
        ]
    })

    print("\nREADER RESULT RAW:")
    print(result)
    print("\n")

    scraped_content = result["messages"][-1].content

    print("\nSCRAPED CONTENT:")
    print(scraped_content[:1000])
    print("\n")

    return {
        "scraped_content": scraped_content
    }


def writer_node(state):

    print("\n" + "=" * 50)
    print("STEP 3 - WRITER")
    print("=" * 50)

    print("SEARCH RESULTS LENGTH =", len(state["search_results"]))
    print("SCRAPED CONTENT LENGTH =", len(state["scraped_content"]))

    research = f"""
SEARCH RESULTS:

{state['search_results']}

SCRAPED CONTENT:

{state['scraped_content']}
"""

    report = writer_chain.invoke({
        "topic": state["topic"],
        "research": research
    })

    return {
        "report": report
    }


def critic_node(state):

    print("\n" + "=" * 50)
    print("STEP 4 - CRITIC")
    print("=" * 50)

    feedback = critic_chain.invoke({
        "report": state["report"]
    })

    return {
        "feedback": feedback
    }