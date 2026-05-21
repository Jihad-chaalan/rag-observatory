from langchain_community.embeddings import HuggingFaceEmbeddings


_embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={'device': 'cpu'},
    encode_kwargs={'normalize_embeddings': True}
)

def get_embedding_function():
    return _embeddings