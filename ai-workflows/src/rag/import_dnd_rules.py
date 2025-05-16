from langchain_docling import DoclingLoader
from langchain_docling.loader import ExportType
FILE_PATH = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf"

loader = DoclingLoader(file_path=FILE_PATH, export_type=ExportType.MARKDOWN)

docs = loader.load()

print(docs[0].page_content)