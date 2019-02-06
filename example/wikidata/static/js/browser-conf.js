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
            SELECT DISTINCT ?work ?title ?doi ?pubmedid ?volume ?issue ?pages ?short_iri ?short_iri_id ?date (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited) AS ?in_cits) ?author_resource ?author_short_iri ?author_str ?s_ordinal WHERE {

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
                          BIND(REPLACE(STR(?author_resource), 'http://www.wikidata.org/entity/', '', 'i') as ?author_short_iri) .
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
              Group by ?work ?title ?doi ?pubmedid ?volume ?issue ?pages ?short_iri ?short_iri_id ?date ?author_resource ?author_short_iri ?author_str ?s_ordinal
              order by ?s_ordinal
              LIMIT 500
            `
          ],
          "links": {
            "author_str": {"field":"author_short_iri","prefix":"https://opencitations.github.io/lucinda/example/wikidata/browser.html?browse="},
            "doi": {"field":"doi","prefix":"https://www.doi.org/"},
            "work": {"field":"work","prefix":""},
            "pubmedid": {"field":"pubmedid","prefix":"https://www.ncbi.nlm.nih.gov/pubmed/"},
          },
          "group_by": {"keys":["work"], "concats":["author_str"]},
          "none_values": {
                      "author_str": "No authors",
                      "title": "Document without title"
          },

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
              {"fields": ["FREE-TEXT","doi"], "values":["DOI: ", null], "respects":[[],[not_unknown]] },
              {"fields": ["FREE-TEXT","volume"], "values":["Volume: ",null], "respects":[[],[not_unknown]]},
              {"fields": ["FREE-TEXT","pages"], "values":["Pages: ",null], "respects":[[],[not_unknown]]},
              {"fields": ["FREE-TEXT","date"], "values":["Publication date: ", null], "respects":[[],[not_unknown]] },
              {"fields": ["FREE-TEXT","pubmedid"], "values":["PubMed ID: ", null], "respects":[[],[not_unknown]]}
            ],
            "metrics": [
              {"classes":["30px"]},
              {"fields": ["FREE-TEXT"], "values": ["Metrics"], "classes": ["metrics-title"]},
              {"classes":["15px"]},
              {"fields": ["FREE-TEXT","in_cits","FREE-TEXT"], "values": ["Cited by ",null," documents"], "classes": ["metric-entry","imp-value","metric-entry"]},
              {"classes":["10px"]},
              {"fields": ["FREE-TEXT","out_cits","FREE-TEXT"], "values": ["Cites ",null," documents"], "classes": ["metric-entry","imp-value","metric-entry"], "respects":[[],[more_than_zero],[]]}
            ],
            "oscar_conf": {
                "progress_loader":{
                          "visible": false,
                          "spinner": false,
                          "title":"Loading the list of Citations and References ...",
                          //"subtitle":"Be patient - this might take several seconds!"
                          //"abort":{"title":"Abort", "href_link":""}
                        },
                "timeout":{
                  "value": 90000,
                  "link": "/search"
                }
            },
            "oscar": [
              {
                "query_text": "short_iri",
                "rule": "entity_citing_documents",
                "label":"Citations of this work by others",
                "config_mod" : [
                    {"key":"categories.[[name,document]].extra_elems" ,"value":[]},
      							{"key":"page_limit_def" ,"value":30},
      							{"key":"categories.[[name,document]].fields.[[title,Cited]].sort.default" ,"value":{"order": "desc"}},
      							{"key":"progress_loader.visible" ,"value":false}
      					]
              },
              {
                "query_text": "short_iri",
                "rule": "entity_cited_documents",
                "label":"Outgoing references",
                "config_mod" : [
                    {"key":"categories.[[name,document]].extra_elems" ,"value":[]},
      							{"key":"page_limit_def" ,"value":30},
      							{"key":"categories.[[name,document]].fields.[[title,Cited]].sort.default" ,"value":{"order": "desc"}},
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
          "rule": "Q.*",
          "query": [`
            SELECT DISTINCT ?author ?genderLabel ?dateLabel ?employerLabel ?educationLabel ?orcid ?short_iri ?authorLabel ?countryLabel ?occupationLabel (COUNT(distinct ?work) AS ?works) WHERE {
                BIND(<http://www.wikidata.org/entity/[[VAR]]> as ?author)
                OPTIONAL {?author wdt:P27 ?country.}
                OPTIONAL {?author wdt:P496 ?orcid.}
                OPTIONAL {?author wdt:P21 ?gender.}
                OPTIONAL {?author wdt:P569 ?date_dt.}
                BIND(CONCAT(STR(DAY(?date_dt)), "/", STR(MONTH(?date_dt)), "/", STR(YEAR(?date_dt))) as ?date ) .
                OPTIONAL {?author wdt:P108 ?employer.}
                OPTIONAL {?author wdt:P69 ?education}
                OPTIONAL {?author wdt:P106 ?occupation.}
                OPTIONAL {?work wdt:P50 <http://www.wikidata.org/entity/[[VAR]]> .}
                SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
            }
            GROUP BY ?author ?genderLabel ?dateLabel ?employerLabel ?educationLabel ?orcid ?short_iri ?authorLabel ?countryLabel ?occupationLabel
            LIMIT 500
            `
          ],
          "text_mapping": {},
          "links": {
            "orcid": {"field":"orcid","prefix":"https://orcid.org/"}
          },

          "contents": {
            "header": [
                {"classes":["40px"]},
                {"fields": ["authorLabel"], "classes":["header-title"]}
            ],
            "details": [
                {"classes":["20px"]},
                {"fields": ["FREE-TEXT","orcid"], "values": ["Author ORCID: ",null]},
                {"fields": ["FREE-TEXT","genderLabel"], "values": ["Gender: ",null], "respects":[[],[not_unknown]]},
                //{"fields": ["FREE-TEXT","dateLabel"], "values": ["Date of birth: ",null]},
                {"fields": ["FREE-TEXT","educationLabel"], "values": ["Educated at: ",null], "respects":[[],[not_unknown]]},
                {"fields": ["FREE-TEXT","occupationLabel"], "values": ["Occupation: ",null], "respects":[[],[not_unknown]]},
                {"fields": ["FREE-TEXT","employerLabel"], "values": ["Employer at: ",null], "respects":[[],[not_unknown]]},
            ],
            "metrics": [
                {"classes":["30px"]},
                {"fields": ["FREE-TEXT"], "values": ["Metrics"], "classes": ["metrics-title"]},
                {"classes":["25px"]},
                {"fields": ["FREE-TEXT","works","FREE-TEXT"], "values": ["Author of ",null," documents"], "classes": ["metric-entry","imp-value"]},
                {"classes":["10px"]},
                //{"fields": ["FREE-TEXT","in_cits_docs","FREE-TEXT"], "values": ["Cited by ",null," different documents"], "classes": ["metric-entry","imp-value","metric-entry"]}


            ],
            "oscar_conf": {
                "progress_loader":{
                          "visible": false,
                          "spinner": false,
                          "title":"Loading the list of Documents ...",
                          //"subtitle":"Be patient - this might take several seconds!"
                          //"abort":{"title":"Abort", "href_link":""}
                        },
                "timeout":{
                  "value": 90000,
                  "link": "/search"
                }
            },
            "oscar": [
              {
                "query_text": "author",
                "rule": "author_works",
                "label":"Author's documents",
                "config_mod" : [
                  {"key":"categories.[[name,document]].extra_elems" ,"value":[]},
                  {"key":"page_limit_def" ,"value":30},
                  {"key":"categories.[[name,document]].fields.[[title,Cited]].sort.default" ,"value":{"order": "desc"}},
                  {"key":"progress_loader.visible" ,"value":false}
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

function not_unknown(val){
  return (val != 'unknown')
}

function convert_date_time(dt_val) {
  return dt_val.toString();
}
