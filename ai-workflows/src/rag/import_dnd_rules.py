from langchain_docling import DoclingLoader
from langchain_docling.loader import ExportType
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
from dotenv import load_dotenv
import logging
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file if it exists
load_dotenv(verbose=True)

# PDF URL and local paths
PDF_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf"
CHROMA_PERSIST_DIR = "ai-workflows/data/chroma_db"
PDF_CACHE_DIR = "ai-workflows/data/pdf_cache"

# Default Ollama models
DEFAULT_EMBED_MODEL = "nomic-embed-text"

# Maximum token size to avoid warnings
MAX_CHUNK_SIZE = 450  # Conservative limit below the 512 token warning

def process_chunk_for_chroma(chunk):
    """Process a chunk to make it compatible with Chroma."""
    # If it's a tuple (page_content, metadata), convert to Document
    if isinstance(chunk, tuple) and len(chunk) == 2:
        page_content, metadata = chunk
        
        # Create a simple metadata dict with only simple types
        simple_metadata = {"source": "D&D 5e SRD"}
        
        # Add any simple metadata keys if metadata is a dict
        if isinstance(metadata, dict):
            for key, value in metadata.items():
                if isinstance(value, (str, int, float, bool)) or value is None:
                    simple_metadata[key] = value
        
        return Document(page_content=page_content, metadata=simple_metadata)
    
    # If it's already a Document, make sure metadata is simple
    elif hasattr(chunk, 'page_content'):
        simple_metadata = {"source": "D&D 5e SRD"}
        
        # Add any simple metadata keys if metadata is a dict
        if hasattr(chunk, 'metadata') and isinstance(chunk.metadata, dict):
            for key, value in chunk.metadata.items():
                if isinstance(value, (str, int, float, bool)) or value is None:
                    simple_metadata[key] = value
        
        return Document(page_content=chunk.page_content, metadata=simple_metadata)
    
    # If it's a string, create a Document with basic metadata
    elif isinstance(chunk, str):
        return Document(page_content=chunk, metadata={"source": "D&D 5e SRD"})
    
    # For anything else, try to convert to string and create a Document
    else:
        try:
            return Document(
                page_content=str(chunk), 
                metadata={"source": "D&D 5e SRD"}
            )
        except Exception as e:
            logger.error(f"Could not process chunk type: {type(chunk)}")
            logger.error(f"Error details: {str(e)}")
            return None

def load_and_process_pdf(max_chunk_size=MAX_CHUNK_SIZE):
    """Load and process the D&D 5e PDF using Docling."""
    logger.info(f"Loading PDF from {PDF_URL}")
    
    # Initialize the DoclingLoader
    loader = DoclingLoader(
        file_path=PDF_URL,
        export_type=ExportType.DOC_CHUNKS  # Use DOC_CHUNKS to automatically split into logical sections
    )
    
    # Load and parse the document
    logger.info("Parsing PDF content")
    documents = loader.load()
    logger.info(f"Loaded {len(documents)} document(s)")
    
    # Debug the document structure
    if documents:
        logger.info(f"First document type: {type(documents[0])}")
    
    # Process the Docling chunks for compatibility with Chroma
    logger.info("Processing chunks for Chroma compatibility")
    processed_chunks = []
    for i, chunk in enumerate(documents):
        try:
            processed_chunk = process_chunk_for_chroma(chunk)
            if processed_chunk is not None:
                processed_chunks.append(processed_chunk)
        except Exception as e:
            logger.warning(f"Error processing chunk {i}: {str(e)}")
    
    logger.info(f"Processed {len(processed_chunks)} chunks for vector database")
    
    # Split any chunks that are too large to avoid token limit warnings
    logger.info(f"Ensuring chunks are within token limits (max {max_chunk_size} tokens)")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chunk_size,
        chunk_overlap=50,
        length_function=len,
    )
    
    final_chunks = []
    for doc in processed_chunks:
        # Create a rough estimate of token count (approximately 4 chars per token)
        est_tokens = len(doc.page_content) / 4
        
        if est_tokens > max_chunk_size:
            # If the chunk is too large, split it further
            smaller_chunks = text_splitter.split_documents([doc])
            final_chunks.extend(smaller_chunks)
            logger.debug(f"Split large chunk (~{int(est_tokens)} tokens) into {len(smaller_chunks)} smaller chunks")
        else:
            # If the chunk is already small enough, keep it as is
            final_chunks.append(doc)
    
    logger.info(f"Final chunk count after size adjustment: {len(final_chunks)}")
    
    return final_chunks

def create_vector_store(chunks, model_name=None, base_url=None):
    """Create a Chroma vector store from document chunks using Ollama embeddings."""
    logger.info("Initializing Ollama embeddings")
    
    # Initialize Ollama embeddings
    embeddings = OllamaEmbeddings(
        model=model_name or os.getenv("OLLAMA_EMBED_MODEL", DEFAULT_EMBED_MODEL),
        base_url=base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    
    logger.info(f"Creating Chroma vector store at {CHROMA_PERSIST_DIR}")
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
        collection_name="dnd_5e_rules"
    )
    
    # Removed persist() call since it's no longer needed/supported
    logger.info("Vector store created successfully")
    
    return vector_store

def test_retrieval(vector_store, query="What are spell slots?"):
    """Test the retrieval from the vector store."""
    logger.info(f"Testing retrieval with query: '{query}'")
    docs = vector_store.similarity_search(query, k=3)
    
    logger.info(f"Retrieved {len(docs)} relevant documents")
    for i, doc in enumerate(docs):
        logger.info(f"Document {i+1}:")
        logger.info(f"Content: {doc.page_content[:150]}...")
        logger.info(f"Metadata: {doc.metadata}")
        logger.info("-" * 50)
    
    return docs

def main():
    """Main function to run the RAG pipeline."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Create D&D 5e RAG pipeline")
    parser.add_argument("--model", type=str, help=f"Ollama embedding model name (default: {DEFAULT_EMBED_MODEL})")
    parser.add_argument("--base-url", type=str, help="Ollama base URL (default: http://localhost:11434)")
    parser.add_argument("--test-query", type=str, default="What are spell slots?", 
                        help="Test query for retrieval")
    parser.add_argument("--max-chunk-size", type=int, default=MAX_CHUNK_SIZE,
                        help="Maximum chunk size in estimated tokens")
    args = parser.parse_args()
    
    # Set chunk size from argument if provided
    max_chunk_size = args.max_chunk_size
    
    # Ensure directories exist
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    os.makedirs(PDF_CACHE_DIR, exist_ok=True)  # Still create this dir for potential future use
    
    logger.info("Starting D&D 5e rules RAG pipeline")
    
    try:
        # Load and process the PDF
        chunks = load_and_process_pdf(max_chunk_size=max_chunk_size)
        
        # Create vector store
        vector_store = create_vector_store(
            chunks, 
            model_name=args.model, 
            base_url=args.base_url
        )
        
        # Test retrieval
        test_retrieval(vector_store, query=args.test_query)
        
        logger.info("RAG pipeline completed successfully")
    except Exception as e:
        logger.error(f"Error in RAG pipeline: {str(e)}")
        raise

if __name__ == "__main__":
    main()

