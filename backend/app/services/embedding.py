from langchain_community.embeddings import FastEmbedEmbeddings

_embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

def get_embedding_function():
    return _embeddings