import os
import argparse
import logging
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file if it exists
load_dotenv(verbose=True)

# Paths
CHROMA_PERSIST_DIR = "ai-workflows/data/chroma_db"

# Default Ollama models
DEFAULT_EMBED_MODEL = "nomic-embed-text"
DEFAULT_LLM_MODEL = "llama3"  # or "mistral" as an alternative

# Default D&D context prompt
DND_CONTEXT_PROMPT = """
You are a knowledgeable Dungeons & Dragons 5th Edition Dungeon Master's assistant. 
Use the provided D&D rule information to answer questions accurately and helpfully.
If the answer isn't in the provided context, say you don't have that specific information
but offer general D&D knowledge if possible.

Context information from the D&D 5e rules:
{context}

Question: {question}
"""

def load_vector_store(model_name=None, base_url=None):
    """Load the Chroma vector store with Ollama embeddings."""
    # Initialize Ollama embeddings
    logger.info("Initializing Ollama embeddings")
    embeddings = OllamaEmbeddings(
        model=model_name or os.getenv("OLLAMA_EMBED_MODEL", DEFAULT_EMBED_MODEL),
        base_url=base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    
    # Load existing Chroma database
    logger.info(f"Loading Chroma vector store from {CHROMA_PERSIST_DIR}")
    vector_store = Chroma(
        persist_directory=CHROMA_PERSIST_DIR,
        embedding_function=embeddings,
        collection_name="dnd_5e_rules"
    )
    
    return vector_store

def create_qa_chain(vector_store, llm_model=None, temperature=0.0, base_url=None):
    """Create a QA chain using the vector store retriever and Ollama LLM."""
    # Initialize the Ollama LLM
    llm_name = llm_model or os.getenv("OLLAMA_LLM_MODEL", DEFAULT_LLM_MODEL)
    
    logger.info(f"Initializing Ollama LLM with model: {llm_name}")
    llm = ChatOllama(
        model=llm_name,
        temperature=temperature,
        base_url=base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    
    # Create prompt template
    prompt_template = PromptTemplate(
        template=DND_CONTEXT_PROMPT,
        input_variables=["context", "question"]
    )
    
    # Create the retrieval QA chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(search_kwargs={"k": 5}),
        chain_type_kwargs={"prompt": prompt_template}
    )
    
    return qa_chain

def query_rules(query, qa_chain):
    """Query the D&D rules using the QA chain."""
    logger.info(f"Querying: '{query}'")
    result = qa_chain.invoke({"query": query})
    
    return result["result"]

def interactive_mode(qa_chain):
    """Run an interactive query session."""
    print("\nD&D 5e Rules Assistant - Interactive Mode")
    print("Type 'exit', 'quit', or 'q' to end the session\n")
    
    while True:
        user_query = input("\nEnter your D&D question: ")
        if user_query.lower() in ["exit", "quit", "q"]:
            print("Ending session. May your future rolls be natural 20s!")
            break
            
        try:
            answer = query_rules(user_query, qa_chain)
            print("\nAnswer:")
            print(answer)
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            print(f"Sorry, there was an error processing your question: {str(e)}")

def main():
    """Main function to run the D&D rules querying tool."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Query D&D 5e rules")
    parser.add_argument("--embed-model", type=str, help=f"Ollama embedding model (default: {DEFAULT_EMBED_MODEL})")
    parser.add_argument("--llm-model", type=str, help=f"Ollama LLM model for answers (default: {DEFAULT_LLM_MODEL})")
    parser.add_argument("--base-url", type=str, help="Ollama base URL (default: http://localhost:11434)")
    parser.add_argument("--temperature", type=float, default=0.0,
                        help="Temperature for LLM responses (0.0-1.0)")
    parser.add_argument("--query", type=str, help="Single query to run (if not provided, interactive mode is started)")
    args = parser.parse_args()
    
    try:
        # Load vector store
        vector_store = load_vector_store(
            model_name=args.embed_model,
            base_url=args.base_url
        )
        
        # Create QA chain
        qa_chain = create_qa_chain(
            vector_store, 
            llm_model=args.llm_model,
            temperature=args.temperature,
            base_url=args.base_url
        )
        
        if args.query:
            # Single query mode
            answer = query_rules(args.query, qa_chain)
            print("\nAnswer:")
            print(answer)
        else:
            # Interactive mode
            interactive_mode(qa_chain)
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise

if __name__ == "__main__":
    main() 