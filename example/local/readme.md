first start the server:
`python3 -m http.server 8000`


run a local DB:
`
cd /Users/ivanhb/ivanhb.edu/research/project/opencitations/project/oc_web/triplestor
java -server -Xmx2G -Dbigdata.propertyFile=meta.properties -Djetty.port=3333 -Djetty.host=127.0.0.1 -jar blazegraph.jar &`
