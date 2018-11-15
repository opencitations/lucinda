var browser_conf = {
  "sparql_endpoint": "https://query.wikidata.org/sparql",

  "prefixes": [
    {"prefix":"wd","iri":"http://www.wikidata.org/entity/"},
    {"prefix":"wds","iri":"http://www.wikidata.org/entity/statement/"},
    {"prefix":"wdv","iri":"http://www.wikidata.org/value/"},
    {"prefix":"wdt","iri":"http://www.wikidata.org/prop/direct/"},
    {"prefix":"wikibase","iri":"http://wikiba.se/ontology#"},
    {"prefix":"p","iri":"http://www.wikidata.org/prop/"},
    {"prefix":"ps","iri":"http://www.wikidata.org/prop/statement/"},
    {"prefix":"pq","iri":"http://www.wikidata.org/prop/qualifier/"},
    {"prefix":"rdfs","iri":"http://www.w3.org/2000/01/rdf-schema#"},
    {"prefix":"bd","iri":"http://www.bigdata.com/rdf#"}
    ],

  "categories":{

    "document": {
          "rule": "Q.*",
          "query": [
            `
            SELECT DISTINCT ?work ?title ?doi ?pubmedid ?volume ?issue ?pages ?short_iri ?short_iri_id ?date (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited) AS ?in_cits) ?author_resource ?author_str ?s_ordinal WHERE {

                      #Scholarly article type
                      ?work wdt:P31 wd:Q13442814.

                      #Filtering Rule
                      BIND(<http://www.wikidata.org/entity/[[VAR]]> as ?work) .

                      # Article Fields
                      optional { ?work wdt:P1476 ?title .}
                      optional { ?work wdt:P356 ?doi .}
                      optional { ?work wdt:P698 ?pubmedid . }
                      optional { ?work wdt:P478 ?volume . }
                      optional { ?work wdt:P433 ?issue . }
                      optional { ?work wdt:P304 ?pages . }
                      BIND(REPLACE(STR(?work), 'http://www.wikidata.org/', '', 'i') as ?short_iri) .
                      BIND(REPLACE(STR(?short_iri), 'entity/Q', '', 'i') as ?short_iri_id) .
                      optional{ ?work wdt:P2860 ?cites .}
                      optional{ ?cited wdt:P2860 ?work .}
                      optional{
                        ?work wdt:P577 ?alldate .
                        BIND(STR(YEAR (?alldate)) as ?date).
                      }

                      # Article Authors
                      {
                          ?work p:P50 [
                              pq:P1545 ?s_ordinal;
                              ps:P50 ?author_resource;
                              ps:P50/rdfs:label ?author_str;
                          ]
                          FILTER(LANGMATCHES(LANG(?author_str), "EN"))
                      }
                      UNION
                      {
                          ?work p:P2093 [
                              pq:P1545 ?s_ordinal;
                              ps:P2093 ?author_str;
                          ]
                      }
              }
              Group by ?work ?title ?doi ?pubmedid ?volume ?issue ?pages ?short_iri ?short_iri_id ?date ?author_resource ?author_str ?s_ordinal
              order by ?s_ordinal
              LIMIT 500
            `
          ],
          "links": {
            "author_str": {"field":"author_resource","prefix":""},
            "doi": {"field":"doi","prefix":"https://www.doi.org/"},
            "work": {"field":"work","prefix":""},
            "pubmedid": {"field":"pubmedid","prefix":"https://www.ncbi.nlm.nih.gov/pubmed/"},
          },
          "group_by": {"keys":["work"], "concats":["author_str"]},
          "none_values": {"author_str": "No authors", "title": "Document without title"},

          "contents": {
            "header": [
                {"classes":["40px"]},
                {"fields": ["title"], "classes":["header-title"]},
                {"classes":["10px"]},
                {"fields": ["author_str"], "concat_style":{"author_str": "inline"}}
            ],
            "details": [
              {"classes":["20px"]},
              {"fields": ["FREE-TEXT","work"], "values":["Wikidata resource: ", null] },
              {"classes":["10px"]},
              {"fields": ["FREE-TEXT","doi"], "values":["DOI: ", null] },
              {"fields": ["FREE-TEXT","volume","FREE-TEXT","pages"], "values":["Volume: ",null," ;Pages: ",null]},
              {"fields": ["FREE-TEXT","date"], "values":["Publication date: ", null] },
              {"fields": ["FREE-TEXT","pubmedid"], "values":["PubMed ID: ", null] }
            ],
            "metrics": [
              {"classes":["30px"]},
              {"fields": ["FREE-TEXT"], "values": ["Metrics"], "classes": ["metrics-title"]},
              {"classes":["15px"]},
              {"fields": ["FREE-TEXT","in_cits","FREE-TEXT"], "values": ["Cited by ",null," documents"], "classes": ["metric-entry","imp-value","metric-entry"]},
              {"classes":["10px"]},
              {"fields": ["FREE-TEXT","out_cits","FREE-TEXT"], "values": ["Cites ",null," documents"], "classes": ["metric-entry","imp-value","metric-entry"], "respects":[[],[more_than_zero],[]]}
            ],


            "oscar": [
              {
                "query_text": "short_iri",
                "rule": "citing_documents",
                "label":"Citations of this work by others",
                "config_mod" : [
      							{"key":"page_limit_def" ,"value":30},
      							{"key":"categories.[[name,document]].fields.[[title,Date]].sort.default" ,"value":{"order": "asc"}},
      							{"key":"progress_loader.visible" ,"value":false}
      					]
              }
            ]

          },

          "ext_data": {
            //"crossref4doi": {"name": call_crossref, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}}
          }
    },

    "author": {
          "rule": "ra\/.*",
          "query": [
            "SELECT ?label ?orcid ?author_iri ?short_iri ?author (COUNT(distinct ?doc) AS ?num_docs) (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits_docs) (COUNT(?cited_by) AS ?in_cits_tot) WHERE {",
    	         "BIND(<https://w3id.org/oc/corpus/[[VAR]]> as ?author_iri) .",
               "BIND(REPLACE(STR(?author_iri), 'https://w3id.org/oc/corpus', '', 'i') as ?short_iri) .",
               "?author_iri rdfs:label ?label .",
    	         "?author_iri foaf:familyName ?fname .",
    	         "?author_iri foaf:givenName ?name .",
    	         "BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author) .",
    	         "OPTIONAL {?role pro:isHeldBy ?author_iri .}",
               "OPTIONAL {?doc pro:isDocumentContextFor ?role.}",
               "OPTIONAL {?doc cito:cites ?cites .}",
               "OPTIONAL {?cited_by cito:cites ?doc .}",
               "OPTIONAL {",
      	          "?author_iri datacite:hasIdentifier [",
      		            "datacite:usesIdentifierScheme datacite:orcid ;",
  			              "literal:hasLiteralValue ?orcid",
                  "]",
    	         "}",
             "} GROUP BY ?label ?orcid ?author_iri ?short_iri ?author "
          ],
          "links": {
            //"author": {"field":"author_iri"},
            "title": {"field":"doc"},
            "orcid": {"field":"orcid","prefix":"https://orcid.org/"}
          },
          "group_by": {"keys":["label"], "concats":["doc","title","year"]},

          "contents": {
            "extra": {
                "browser_view_switch":{
                    "labels":["ldd","Browser"],
                    "values":["short_iri","short_iri"],
                    "regex":["w3id.org\/oc\/corpus\/ra\/.*","w3id.org\/oc\/browser\/ra\/.*"],
                    "query":[["PREFIX pro:<http://purl.org/spar/pro/> SELECT ?role WHERE {?role pro:isHeldBy <https://w3id.org/oc/corpus[[VAR]]>. ?role pro:withRole pro:author . }"],["SELECT ?role WHERE {BIND(<https://w3id.org/oc/corpus[[VAR]]> as ?role)}"]],
                    "links":["https://w3id.org/oc/corpus[[VAR]]","https://w3id.org/oc/browser[[VAR]]"]
                }
            },
            "header": [
                {"classes":["40px"]},
                {"fields": ["author"], "classes":["header-title"]}
            ],
            "details": [
                {"classes":["20px"]},
                {"fields": ["FREE-TEXT","orcid"], "values": ["Author ORCID: ",null]}
            ],
            "metrics": [
                {"classes":["5px"]},
                {"fields": ["FREE-TEXT"], "values": ["Metrics"], "classes": ["metrics-title"]},
                {"classes":["25px"]},
                {"fields": ["FREE-TEXT","num_docs","FREE-TEXT"], "values": ["Author of ",null," documents"], "classes": ["metric-entry","imp-value"]},
                {"classes":["10px"]},
                //{"fields": ["FREE-TEXT","in_cits_tot","FREE-TEXT"], "values": ["Cited ",null," number of times"], "classes": ["metric-entry","imp-value","metric-entry"]},
                {"fields": ["FREE-TEXT","in_cits_docs","FREE-TEXT"], "values": ["Cited by ",null," different documents"], "classes": ["metric-entry","imp-value","metric-entry"]}
                //{"classes":["5px"]}
                //{"fields": ["FREE-TEXT","in_cits_docs","FREE-TEXT"], "values": ["\xa0\xa0\xa0 by ",null," different documents"], "classes": ["metric-entry","imp-value","metric-entry"]}
            ],
            "oscar": [
              {
                "query_text": "author_iri",
                "rule": "author_works",
                "label":"Author's documents",
                "config_mod" : [
      							{"key":"categories.[[name,document]].fields.[[title,Publisher]]" ,"value":"REMOVE_ENTRY"},
      							{"key":"page_limit_def" ,"value":20},
      							{"key":"categories.[[name,document]].fields.[[title,Year]].sort.default" ,"value":{"order": "desc"}}
                    //{"key":"progress_loader.visible" ,"value":false}
      					]
              }
            ]
          }
        }
      }
}

//"FUNC" {"name": call_crossref, "param":{"fields":[],"vlaues":[]}}
function call_crossref(str_doi, field){
  var call_crossref_api = "https://api.crossref.org/works/";
  var call_url =  call_crossref_api+ encodeURIComponent(str_doi);

  var result_data = "";
  $.ajax({
        dataType: "json",
        url: call_url,
        type: 'GET',
        async: false,
        success: function( res_obj ) {
            if (field == 1) {
              result_data = res_obj;
            }else {
              if (!b_util.is_undefined_key(res_obj,field)) {
                result_data = b_util.get_obj_key_val(res_obj,field);
              }
            }
            //console.log(result_data);
            //browser._update_page();
        }
   });
   return result_data;
}


//Heuristics
function more_than_zero(val){
  return parseInt(val) > 0
}
