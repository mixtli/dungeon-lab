import os
import argparse
import logging
import random
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain.chains import RetrievalQA, ConversationalRetrievalChain
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import configuration
from config import config, DND_CONTEXT_PROMPT, DEFAULT_EMBED_MODEL, DEFAULT_LLM_MODEL

# Load environment variables from .env file if it exists
load_dotenv(verbose=True)

def load_vector_store(model_name=None, base_url=None):
    """Load the Chroma vector store with Ollama embeddings."""
    # Initialize Ollama embeddings
    logger.info("Initializing Ollama embeddings")
    embeddings = OllamaEmbeddings(
        model=model_name or os.getenv("OLLAMA_EMBED_MODEL", DEFAULT_EMBED_MODEL),
        base_url=base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    
    # Load existing Chroma database
    logger.info(f"Loading Chroma vector store from {config.chroma_persist_dir}")
    
    # Create the client with explicit include parameters
    import chromadb
    client = chromadb.PersistentClient(path=config.chroma_persist_dir)
    
    # Configure Chroma with embedding function and make sure searches include embeddings
    vector_store = Chroma(
        client=client,
        collection_name="dnd_5e_rules",
        embedding_function=embeddings,
        collection_metadata={"hnsw:space": "cosine"},  # Ensure consistent similarity measure
    )
    
    # Test if the client is working correctly
    try:
        logger.info("Testing Chroma database connection...")
        collection = vector_store._collection
        count = collection.count()
        logger.info(f"Successfully connected to Chroma. Found {count} documents.")
    except Exception as e:
        logger.error(f"Error connecting to Chroma database: {str(e)}")
    
    return vector_store

def create_qa_chain(vector_store, llm_model=None, temperature=0.0, base_url=None, return_source_docs=False):
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
        input_variables=["context", "question", "chat_history"]
    )
    
    # Create a properly configured retriever
    retriever = vector_store.as_retriever(
        search_kwargs={
            "k": 10
        },
        search_type="similarity"  # Make sure we're using similarity search
    )
    
    # Create the retrieval QA chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt_template},
        return_source_documents=return_source_docs
    )
    
    return qa_chain

def create_conversation_chain(vector_store, llm_model=None, temperature=0.0, base_url=None, return_source_docs=False):
    """Create a conversational chain with memory using the vector store retriever and Ollama LLM."""
    # Initialize the Ollama LLM
    llm_name = llm_model or os.getenv("OLLAMA_LLM_MODEL", DEFAULT_LLM_MODEL)
    
    logger.info(f"Initializing Ollama LLM with model: {llm_name}")
    llm = ChatOllama(
        model=llm_name,
        temperature=temperature,
        base_url=base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    
    # Create memory for conversation history
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        output_key="answer"
    )
    
    # Create a properly configured retriever
    retriever = vector_store.as_retriever(
        search_kwargs={
            "k": 10,
        },
        search_type="similarity"  # Make sure we're using similarity search
    )
    
    # Create the conversational retrieval chain with memory
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        condense_question_prompt=PromptTemplate.from_template(
            "Given the following conversation and a follow-up question, rephrase the follow-up question to be a standalone question that captures the context of the conversation.\n\nChat History:\n{chat_history}\n\nFollow-up question: {question}\n\nStandalone question:"
        ),
        combine_docs_chain_kwargs={
            "prompt": PromptTemplate(
                template=DND_CONTEXT_PROMPT,
                input_variables=["chat_history", "context", "question"]
            )
        },
        return_source_documents=return_source_docs,
        return_generated_question=True
    )
    
    return qa_chain

def query_rules(query, qa_chain):
    """Query the D&D rules using the QA chain."""
    logger.info(f"Querying: '{query}'")
    
    # Handle both types of chains (with or without memory)
    if isinstance(qa_chain, ConversationalRetrievalChain):
        result = qa_chain.invoke({"question": query})
        if "generated_question" in result:
            logger.info(f"Generated standalone question: {result['generated_question']}")
        return result["answer"]
    else:
        # For standard RetrievalQA chain
        result = qa_chain.invoke({"query": query})
        return result["result"]

def interactive_mode(qa_chain, debug_mode=False, vector_store=None):
    """Run an interactive query session."""
    has_memory = isinstance(qa_chain, ConversationalRetrievalChain)
    
    print("\nD&D 5e Rules Assistant - Interactive Mode")
    if has_memory:
        print("With conversation memory enabled!")
        print("Type 'clear' to clear conversation history")
    if debug_mode:
        print("Debug mode enabled - showing retrieved documents!")
        print("Type 'stats' to show vector store statistics")
        print("Type 'sample' to show random document samples")
        print("Type 'direct <query>' to directly query vector store")
    print("Type 'exit', 'quit', or 'q' to end the session\n")
    
    while True:
        user_query = input("\nEnter your D&D question: ")
        
        # Check for special commands
        if user_query.lower() in ["exit", "quit", "q"]:
            print("Ending session. May your future rolls be natural 20s!")
            break
            
        if has_memory and user_query.lower() == "clear":
            # Clear the conversation history
            qa_chain.memory.clear()
            print("Conversation history cleared!")
            continue
        
        if debug_mode:
            if user_query.lower() == "stats":
                show_vector_store_stats(vector_store)
                continue
                
            if user_query.lower() == "sample":
                sample_documents(vector_store)
                continue
                
            if user_query.lower().startswith("direct "):
                direct_query = user_query[7:]  # Remove "direct " prefix
                direct_similarity_search(vector_store, direct_query)
                continue
            
        try:
            if debug_mode:
                # In debug mode, directly query the vector store first
                print("\nRetrieving relevant documents...")
                retrieved_docs = vector_store.similarity_search_with_score(user_query, k=5)
                
                if retrieved_docs:
                    print("\n===== Retrieved Documents =====")
                    for i, (doc, score) in enumerate(retrieved_docs, 1):
                        print(f"\n--- Document {i} (Similarity: {score:.4f}) ---")
                        print(f"Content: {doc.page_content[:300]}...")
                        print(f"Metadata: {doc.metadata}")
                    print("\n=============================")
                else:
                    print("No documents retrieved! This might indicate a problem with the vector store.")
            
            # Then use the chain for actual answer generation
            answer = query_rules(user_query, qa_chain)
            print("\nAnswer:")
            print(answer)
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            print(f"Sorry, there was an error processing your question: {str(e)}")

def show_vector_store_stats(vector_store):
    """Show statistics about the vector store."""
    try:
        collection = vector_store._collection
        count = collection.count()
        print("\n===== Vector Store Statistics =====")
        print(f"Collection name: {collection.name}")
        print(f"Document count: {count}")
        
        # Get collection info
        if hasattr(collection, "_client"):
            # Try to get more detailed collection info if possible
            client = collection._client
            if hasattr(client, "get_collection") and callable(getattr(client, "get_collection")):
                coll_info = client.get_collection(collection.name)
                print(f"Collection info: {coll_info}")
        
        print("===================================")
    except Exception as e:
        logger.error(f"Error getting vector store stats: {str(e)}")
        print(f"Error retrieving vector store statistics: {str(e)}")

def sample_documents(vector_store, sample_size=3):
    """Sample random documents from the vector store."""
    try:
        # Get all document IDs
        collection = vector_store._collection
        ids = collection.get()["ids"]
        
        if not ids:
            print("No documents found in the vector store!")
            return
            
        # Sample random IDs
        if len(ids) <= sample_size:
            sampled_ids = ids
        else:
            sampled_ids = random.sample(ids, sample_size)
            
        # Get documents for sampled IDs - explicitly include embeddings
        result = collection.get(ids=sampled_ids, include=["documents", "metadatas", "embeddings"])
        
        print(f"\n===== {len(sampled_ids)} Random Document Samples =====")
        
        for i, (doc_id, doc_content, metadatas) in enumerate(zip(
            result.get("ids", []), 
            result.get("documents", []), 
            result.get("metadatas", [])
        ), 1):
            print(f"\n--- Sample {i} (ID: {doc_id}) ---")
            print(f"Content: {doc_content[:300]}...")
            print(f"Metadata: {metadatas}")
            if "embeddings" in result and result["embeddings"]:
                print(f"Has embedding of dimension: {len(result['embeddings'][i-1])}")
            
        print("\n==========================================")
    except Exception as e:
        logger.error(f"Error sampling documents: {str(e)}")
        print(f"Error sampling documents: {str(e)}")

def direct_similarity_search(vector_store, query, k=5):
    """Perform a direct similarity search and show results."""
    try:
        print(f"\nDirect similarity search for: '{query}'")
        results = vector_store.similarity_search_with_score(query, k=k)
        
        if not results:
            print("No matching documents found!")
            return
            
        print(f"\n===== Top {len(results)} Results =====")
        
        for i, (doc, score) in enumerate(results, 1):
            print(f"\n--- Result {i} (Similarity Score: {score:.4f}) ---")
            print(f"Content: {doc.page_content[:300]}...")
            print(f"Metadata: {doc.metadata}")
            
        print("\n===============================")
    except Exception as e:
        logger.error(f"Error in direct similarity search: {str(e)}")
        print(f"Error performing similarity search: {str(e)}")

def debug_query_with_retrieval(vector_store, query, k=5):
    """Debug function to show the retrieval process for a query."""
    print(f"Debug query: '{query}'")
    
    try:
        # Get embeddings for the query
        embed_fn = vector_store._embedding_function
        query_embedding = embed_fn.embed_query(query)
        print(f"Generated query embedding with {len(query_embedding)} dimensions")
        
        # Perform similarity search
        results = vector_store.similarity_search_with_score(query, k=k)
        
        print(f"\n===== Retrieved {len(results)} documents =====")
        for i, (doc, score) in enumerate(results, 1):
            print(f"\n--- Document {i} (Similarity Score: {score:.4f}) ---")
            # Print truncated content to avoid overwhelming output
            content_preview = doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content
            print(f"Content: {content_preview}")
            print(f"Metadata: {doc.metadata}")
            
        return results
    except Exception as e:
        logger.error(f"Error in debug retrieval: {str(e)}")
        print(f"Error in debug retrieval: {str(e)}")
        return None

def validate_database_contents(vector_store, sample_size=5):
    """Validate the database contents and structure."""
    print("\n===== Validating Database Contents =====")
    
    try:
        # Get collection stats
        collection = vector_store._collection

        count = collection.count()
        print(f"Document count: {count}")
        
        if count == 0:
            print("ERROR: Vector store is empty! No documents found.")
            return False
            
        # Sample random documents to validate structure
        result = collection.get(limit=sample_size, include=["documents", "metadatas", "embeddings"])
        
        # Check if we have expected fields in the result
        expected_fields = ["ids", "documents", "metadatas", "embeddings"]
        missing_fields = [field for field in expected_fields if field not in result or not result[field]]
        
        if missing_fields:
            print(f"WARNING: Missing expected fields in database: {missing_fields}")
            
        # Check document structure
        if "documents" in result and result["documents"]:
            print(f"\nDocument content sample: {result['documents'][0][:200]}...")
        else:
            print("ERROR: No document content found!")
            
        # Check metadata structure
        if "metadatas" in result and result["metadatas"]:
            metadata_sample = result["metadatas"][0]
            print(f"Metadata fields: {list(metadata_sample.keys())}")
            print(f"Metadata sample: {metadata_sample}")
        else:
            print("ERROR: No metadata found!")
            
        # Check embeddings
        if "embeddings" in result and result["embeddings"]:
            embedding_sample = result["embeddings"][0]
            print(f"Embedding dimensions: {len(embedding_sample)}")
        else:
            print("ERROR: No embeddings found!")
            
        print("\nDatabase validation complete")
        return True
    except Exception as e:
        logger.error(f"Error validating database: {str(e)}")
        print(f"Error validating database: {str(e)}")
        return False

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
    parser.add_argument("--no-memory", action="store_true", help="Disable conversation memory")
    
    # Add debugging arguments
    parser.add_argument("--debug", action="store_true", help="Enable debug mode to show retrieved documents")
    parser.add_argument("--validate-db", action="store_true", help="Validate vector database contents")
    parser.add_argument("--show-stats", action="store_true", help="Show vector store statistics")
    parser.add_argument("--sample-docs", type=int, help="Sample N random documents from the vector store")
    parser.add_argument("--debug-query", type=str, help="Run a debug query showing detailed retrieval information")
    parser.add_argument("--return-sources", action="store_true", help="Return source documents in query results")
    
    args = parser.parse_args()
    
    try:
        # Load vector store
        vector_store = load_vector_store(
            model_name=args.embed_model,
            base_url=args.base_url
        )
        
        # Handle debugging-specific commands
        if args.validate_db:
            validate_database_contents(vector_store)
            return
            
        if args.show_stats:
            show_vector_store_stats(vector_store)
            return
            
        if args.sample_docs:
            sample_documents(vector_store, sample_size=args.sample_docs)
            return
            
        if args.debug_query:
            debug_query_with_retrieval(vector_store, args.debug_query)
            return
        
        # Create appropriate chain based on memory preference
        if args.no_memory:
            logger.info("Creating QA chain without conversation memory")
            qa_chain = create_qa_chain(
                vector_store, 
                llm_model=args.llm_model,
                temperature=args.temperature,
                base_url=args.base_url,
                return_source_docs=args.return_sources
            )
        else:
            logger.info("Creating QA chain with conversation memory")
            qa_chain = create_conversation_chain(
                vector_store, 
                llm_model=args.llm_model,
                temperature=args.temperature,
                base_url=args.base_url,
                return_source_docs=args.return_sources
            )
        
        if args.query:
            # Single query mode
            if args.debug:
                print("\nDebug retrieval information:")
                debug_query_with_retrieval(vector_store, args.query)
                
            answer = query_rules(args.query, qa_chain)
            print("\nAnswer:")
            print(answer)
        else:
            # Interactive mode
            interactive_mode(qa_chain, debug_mode=args.debug, vector_store=vector_store)
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise

if __name__ == "__main__":
    main() 