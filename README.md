<img src="doc/lucinda_logo-v2.0.png" alt="drawing" width="350"/>

### The OpenCitations RDF Resource Browser
#### *"LUCINDA and [OSCAR](https://github.com/opencitations/oscar) work better together"*
Lucinda is a general RDF-resource browser which could be configured to work with any triplestore providing a SPARQL-endpoint address. LUCINDA can also integrate in it [OSCAR](https://github.com/opencitations/oscar), The OpenCitations RDF Search Application.  
In this repository you can find few examples of Lucinda usage. Currently we have tested Lucinda with two different projects: [OpenCitations](http://opencitations.net/), and [Wikidata](http://wikidata.org/). For each one of these projects we have its corresponding .html main entry, try the Wikidata example, presented at [Wikicite2018](https://meta.wikimedia.org/wiki/WikiCite_2018), at [example/wikidata/browser.html](https://opencitations.github.io/lucinda/example/wikidata/browser.html?browse=Q30536251) .

# LUCINDA Configuration

**0) LUCINDA Needs bootstrap (currently LUCINDA uses bootstrap-3.4.1):**   
```<link href="../../static/css/bootstrap.min.css" rel="stylesheet" />```  
```<script src="path/to/bootstrap.min.js" />```
        
        
**1) Insert in your HTML page the following block:** 

```<div class="__lucinda__" data-content="..."></div></div>``` 
* **[[data-content]]**= Combine: *"header"* | *"details"* | *"switch"* | *"metrics"*.  
e.g.  ```view_op="header details metrics"```


**2) Include your configuration file, and right after that include the 'browse.js' script in your HTML page, like this:**

```<script type="text/javascript" src="path/to/your/conf.js"></script>```  
```<script type="text/javascript" src="path/to/browse.js""></script>```


**3) To run LUCINDA call its main method:**

```browse.do_sparql_query([[QUERY]])```
* **[[QUERY]]**: in case an empty string is given LUCINDA will not build the interface. The other option is giving a string corresponding a query as URL address. e.g. *"?browse=br/1"*

