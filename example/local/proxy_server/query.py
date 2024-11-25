from requests import get

API_CALL = "http://localhost:3333/blazegraph/namespace/kb/sparql"+"?query="+
print(get(API_CALL))
