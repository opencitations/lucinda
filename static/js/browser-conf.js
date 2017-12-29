var browser_conf = {
  "sparql_endpoint": "http://localhost:3000/blazegraph/sparql",

  "prefixes": [
      {"prefix":"cito","iri":"http://purl.org/spar/cito/"},
      {"prefix":"dcterms","iri":"http://purl.org/dc/terms/"},
      {"prefix":"datacite","iri":"http://purl.org/spar/datacite/"},
      {"prefix":"literal","iri":"http://www.essepuntato.it/2010/06/literalreification/"},
      {"prefix":"biro","iri":"http://purl.org/spar/biro/"},
      {"prefix":"frbr","iri":"http://purl.org/vocab/frbr/core#"},
      {"prefix":"c4o","iri":"http://purl.org/spar/c4o/"},
      {"prefix":"bds","iri":"http://www.bigdata.com/rdf/search#"},
      {"prefix":"fabio","iri":"http://purl.org/spar/fabio/"},
      {"prefix":"pro","iri":"http://purl.org/spar/pro/"},
      {"prefix":"rdf","iri":"http://www.w3.org/1999/02/22-rdf-syntax-ns#"}
    ],

  "document": {
        "rule": "https:\/\/w3id\\.org\/oc\/corpus\/br\/.*",
        "query": [
          "SELECT ?my_iri ?id_lit ?type ?short_type ?label ?title ?subtitle ?year ?author_iri ?author (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits) WHERE {",
               "BIND(<VAR> as ?my_iri) .",
               "?my_iri rdfs:label ?label .",
               "?my_iri rdf:type ?type .",
               "BIND(REPLACE(STR(?type), 'http://purl.org/spar/fabio/', '', 'i') as ?short_type) .",
               "OPTIONAL {?my_iri dcterms:title ?title .}",
               "OPTIONAL {?my_iri fabio:hasSubtitle ?subtitle .}",
               "OPTIONAL {?my_iri fabio:hasPublicationYear ?year .}",
               "OPTIONAL {?my_iri cito:cites ?cites .}",
               "OPTIONAL {?cited_by cito:cites ?my_iri .}",
                 "OPTIONAL {",
                    "?my_iri datacite:hasIdentifier [",
                    "datacite:usesIdentifierScheme datacite:doi ;",
                 "literal:hasLiteralValue ?id_lit",
                      "]",
                 "}",
                 "OPTIONAL {",
                        "?my_iri pro:isDocumentContextFor [",
                            "pro:withRole pro:author ;",
                            "pro:isHeldBy ?author_iri",
                        "].",
                        "?author_iri foaf:familyName ?fname .",
                        "?author_iri foaf:givenName ?name .",
                        "BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author) .",
                 "}",
          "} GROUP BY ?my_iri ?id_lit ?type ?short_type ?label ?title ?subtitle ?year ?author_iri ?author"
        ],
        "links": {
          "author": {"field":"author_iri","prefix":"","active": true},
          "short_type": {"field":"type","prefix":"","active": true},
          "id_lit": {"field":"id_lit","prefix":"http://dx.doi.org/","active": true}
        },
        "group_by": {"keys":["label"], "concats":["author","short_type"], "active": true},

        "text_mapping": {
            "short_type":[
                {"regex": /Expression/g, "value":"Document"},
                {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
            ]
        },

        "contents": {
          "header": [
              {"tag":"td", "classes":["40px"]},
              {"fields": ["title"], "tag":"th"},
              {"fields": ["subtitle"], "tag":"td"},
              {"tag":"td", "classes":["10px"]},
              {"fields": ["author"], "tag":"td", "concat_style":{"author": "inline"}}
          ],
          "details": [
            {"tag":"td", "classes":["20px"]},
            {"tag":"td", "fields": ["FREE-TEXT","id_lit"], "values":["DOI : ",""] },
            {"tag":"td", "fields": ["FREE-TEXT","year"], "values":["Publication year : ",""] },
            {"tag":"td", "fields": ["FREE-TEXT","short_type"], "values":["Document type : ",""], "concat_style":{"short_type": "last"} }
          ],
          "metrics": [
            {"tag":"td", "classes":["30px"]},
            {"fields": ["FREE-TEXT"], "values": ["Metrics"], "tag":"th"},
            {"tag":"td", "classes":["15px"]},
            {"fields": ["FREE-TEXT","in_cits","FREE-TEXT"], "values": ["Cited by ",""," documents"], "classes": ["metric-entry","imp-value","metric-entry"],  "tag":"td"},
            {"tag":"td", "classes":["10px"]},
            {"fields": ["FREE-TEXT","out_cits","FREE-TEXT"], "values": ["Cites ",""," documents"], "classes": ["metric-entry","imp-value","metric-entry"],  "tag":"td"},
          ]
        }
  },

  "author": {
        "rule": "https:\/\/w3id\\.org\/oc\/corpus\/ra\/.*",
        "query": [
          "SELECT ?label ?orcid ?author_iri ?author (COUNT(distinct ?doc) AS ?num_docs) (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits) WHERE {",
  	         "BIND(<VAR> as ?author_iri) .",
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
           "} GROUP BY ?label ?orcid ?author_iri ?author "
        ],
        "links": {
          "author": {"field":"author_iri","prefix":"","active": true},
          "title": {"field":"doc","prefix":"","active": true},
          "orcid": {"field":"orcid","prefix":"https://orcid.org/","active": true}
        },
        "group_by": {"keys":["label"], "concats":["doc","title","year"], "active": true},

        "contents": {
          "header": [
              {"tag":"td", "classes":["40px"]},
              {"fields": ["author"], "classes":["header-title"], "tag":"th"}
          ],
          "details": [
              {"tag":"td", "classes":["20px"]},
              {"fields": ["FREE-TEXT","orcid"], "values": ["Author ORCID: ",""], "tag":"td"}
          ],
          "metrics": [
              {"tag":"td", "classes":["5px"]},
              {"fields": ["FREE-TEXT"], "values": ["Metrics"], "classes": ["metrics-title"], "tag":"th"},
              {"tag":"td", "classes":["25px"]},
              {"fields": ["FREE-TEXT","num_docs","FREE-TEXT"], "values": ["Author of ",""," documents"], "classes": ["metric-entry","imp-value"],  "tag":"td"},
              {"tag":"td", "classes":["10px"]},
              {"fields": ["FREE-TEXT","in_cits","FREE-TEXT"], "values": ["Cited by ",""," documents"], "classes": ["metric-entry","imp-value","metric-entry"],  "tag":"td"}
          ]
        }
  }
}
