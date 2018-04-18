var browser_conf = {
  "sparql_endpoint": "http://localhost:8080/index/coci/sparql",

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
                  "BIND(<https://w3id.org/oc/index/coci/[[VAR]]> as ?iri) .",
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

          "text_mapping": {
              "citing_doi":[
                  {"func": [decodeURIStr]}
              ],
              "cited_doi":[
                  {"func": [decodeURIStr]}
              ],
              "timespan":[
                  {"func": [timespan_translate]}
              ]
          },

          "contents": {
            //define this
            /*"extra": {
                "browser_view_switch":{
                    "labels":["ldd","Browser"],
                    "values":["short_iri","short_iri"],
                    "regex":["w3id.org\/oc\/corpus\/br\/.*","w3id.org\/oc\/browser\/br\/.*"],
                    "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/corpus[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/corpus[[VAR]]> as ?resource)}"]],
                    "links":["https://w3id.org/oc/corpus[[VAR]]","https://w3id.org/oc/browser[[VAR]]"]
                }
            },*/
            "header": [
                {"classes":["40px"]},
                {"fields": ["citing_doi","FREE-TEXT","cited_doi"], "values":[null," cites ", null], "classes":["header-title text-success","metric-entry text-capitalize mark","header-title text-danger"]},
                //{"fields": ["subtitle"], "classes":["sub-header-title"]},
                {"classes":["10px"]},
                {"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Citing entity: ", "call_crossref_4citation_citing"], "classes": ["subtitle","text-success"]},
                {"classes":["8px"]},
                {"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Cited entity: ", "call_crossref_4citation_cited"], "classes": ["subtitle","text-danger"]}

                //{"fields": ["author"], "concat_style":{"author": "inline"}}
            ],
            "details": [
              {"classes":["20px"]},
              {"fields": ["FREE-TEXT","short_iri"], "values":["OCI : ", null] },
              {"fields": ["FREE-TEXT","creationdate"], "values":["Creation date: ", null] },
              //{"fields": ["FREE-TEXT","short_type"], "values":["Document type: ",null], "concat_style":{"short_type": "last"} }
            ],
            "metrics": [
              {"classes":["30px"]},
              {"fields": ["FREE-TEXT"], "values": ["Metrics"], "classes": ["metrics-title"]},
              {"classes":["15px"]},
              {"fields": ["FREE-TEXT","timespan","FREE-TEXT"], "values": ["The timespan is ",null,""], "classes": ["metric-entry","imp-value",""]}
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
          },
          "ext_data": {
            "call_crossref_4citation_citing": {"name": call_crossref_4citation, "param": {"fields":["citing_doi"],"values":[null]}},
            "call_crossref_4citation_cited": {"name": call_crossref_4citation, "param": {"fields":["cited_doi"],"values":[null]}}
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
        }
   });
   return result_data;
}
function call_crossref_4citation(str_doi){
  var call_crossref_api = "https://citation.crosscite.org/format?doi=";
  var suffix = "&style=apa&lang=en-US";
  var result = "";

  if (str_doi != undefined) {
    var call_url =  call_crossref_api+str_doi+suffix;
    //var result_data = "...";
    $.ajax({
          url: call_url,
          type: 'GET',
          async: false,
          success: function( res ) {
            result = res;
          }
     });
  }
  return result;
}
function decodeURIStr(str) {
  return decodeURIComponent(str);
}
function timespan_translate(str) {
  var new_str = "";
  var years = 0;
  var months = 0;
  var days = 0;

  let reg = /(\d{1,})Y/g;
  let match;
  while (match = reg.exec(str)) {
    if (match.length >= 2) {
      years = parseInt(match[1]);
      var suffix = " Years ";
      if (years == 1) {
        suffix = " Year ";
      }
      new_str = new_str + String(years) +suffix;
    }
  }

  reg = /(\d{1,})M/g;
  while (match = reg.exec(str)) {
    if (match.length >= 2) {
      months = parseInt(match[1]);
      var suffix = " Months ";
      if (months == 1) {
        suffix = " Month ";
      }
      new_str = new_str + String(months) +suffix;
    }
  }

  reg = /(\d{1,})D/g;
  while (match = reg.exec(str)) {
    if (match.length >= 2) {
      days = parseInt(match[1]);
      var suffix = " Days ";
      if (days == 1) {
        suffix = " Day ";
      }
      new_str = new_str + String(days) +suffix;
    }
  }

  return new_str;
}

//Heuristics
function more_than_zero(val){
  return parseInt(val) > 0
}
