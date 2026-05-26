from langchain_community.embeddings import FastEmbedEmbeddings

# Using a very small, fast embedding model to reduce memory usage
_embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

def get_embedding_function():
    return _embeddings