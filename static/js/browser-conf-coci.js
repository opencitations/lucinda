var browser_conf = {
  "sparql_endpoint": "http://localhost:8080/sparql/coci",

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

  "categories":{
    "citation": {
          "rule": "ci\/.*",
          "query": [
            "SELECT DISTINCT ?iri ?short_iri ?shorter_coci ?citing_doi ?citing_doi_iri ?cited_doi ?cited_doi_iri ?creationdate ?timespan",
                "WHERE  {",
                  "BIND(<VAR> as ?iri) .",
                  "OPTIONAL {",
                    "BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/index/coci/ci/', '', 'i') as ?short_iri) .",
                    "?iri cito:hasCitingEntity ?citing_doi_iri .",
                    "BIND(REPLACE(STR(?citing_doi_iri), 'http://dx.doi.org/', '', 'i') as ?citing_doi) .",
                    "?iri cito:hasCitedEntity ?cited_doi_iri .",
                    "BIND(REPLACE(STR(?cited_doi_iri), 'http://dx.doi.org/', '', 'i') as ?cited_doi) .",
                    "?iri cito:hasCitationCreationDate ?creationdate .",
                    "?iri cito:hasCitationTimeSpan ?timespan .",
                  "}",
                "}"
          ],
          "links": {
            "short_iri": {"field":"iri","prefix":""}
          },
          //"none_values": {"subtitle": "", "author": "No authors", "title": "Document without title"},

          //"text_mapping": {
          //    "short_type":[
          //        {"regex": /Expression/g, "value":"Document"},
          //        {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          //    ]
          //},

          "contents": {
            //define this
            "extra": {
                "browser_view_switch":{
                    "labels":["ldd","Browser"],
                    "values":["short_iri","short_iri"],
                    "regex":["w3id.org\/oc\/corpus\/br\/.*","w3id.org\/oc\/browser\/br\/.*"],
                    "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/corpus[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/corpus[[VAR]]> as ?resource)}"]],
                    "links":["https://w3id.org/oc/corpus[[VAR]]","https://w3id.org/oc/browser[[VAR]]"]
                }
            },
            "header": [
                {"classes":["40px"]},
                {"fields": ["citing_doi","FREE-TEXT","cited_doi"], "values":[null," cites ", null], "classes":["header-title","metric-entry","header-title"]},
                //{"fields": ["subtitle"], "classes":["sub-header-title"]},
                {"classes":["10px"]},
                //{"fields": ["author"], "concat_style":{"author": "inline"}}
            ],
            "details": [
              {"classes":["20px"]},
              {"fields": ["FREE-TEXT","short_iri"], "values":["COCI ID: ", null] },
              {"fields": ["FREE-TEXT","creationdate"], "values":["Creation date: ", null] },
              //{"fields": ["FREE-TEXT","short_type"], "values":["Document type: ",null], "concat_style":{"short_type": "last"} }
              /*{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]}*/
            ],
            "metrics": [
            ],

            "oscar": [
              /*{
                "query_text": "my_iri",
                "rule": "doc_cites_list",
                "label":"References",
                "config_mod" : [
      							//{"key":"categories.[[name,document]].fields.[[title,Publisher]]" ,"value":"REMOVE_ENTRY"},
      							{"key":"page_limit_def" ,"value":30},
      							{"key":"categories.[[name,document]].fields.[[title,Cited by]].sort.default" ,"value":{"order": "desc"}},
      							{"key":"progress_loader.visible" ,"value":false}
      					]
              },
              {
                "query_text": "my_iri",
                "rule": "doc_cites_me_list",
                "label":"Citations",
                "config_mod" : [
      							//{"key":"categories.[[name,document]].fields.[[title,Publisher]]" ,"value":"REMOVE_ENTRY"},
      							{"key":"page_limit_def" ,"value":30},
                    //{"key":"categories.[[name,document]].fields.[[title,Cited by]].sort.default" ,"value":"REMOVE_ENTRY"},
      							{"key":"categories.[[name,document]].fields.[[title,Year]].sort.default" ,"value":{"order": "asc"}},
      							{"key":"progress_loader.visible" ,"value":false}
      					]
              }*/
            ]
          }
          /*,
          "ext_data": {
            "crossref4doi": {"name": call_crossref, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}}
          },*/
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
        }
   });
   return result_data;
}


//Heuristics
function more_than_zero(val){
  return parseInt(val) > 0
}
