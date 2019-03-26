var browser_conf = {
  "sparql_endpoint": "https://w3id.org/oc/index/sparql",

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
          "query": [`
            SELECT DISTINCT ?iri ?short_iri ?shorter_coci ?citing_doi ?citing_doi_iri ?cited_doi ?cited_doi_iri ?creationdate ?timespan ?isJSelfCitation ?isASelfCitation
                WHERE  {
                  GRAPH <https://w3id.org/oc/index/croci/> {
                      BIND(<https://w3id.org/oc/index/croci/[[VAR]]> as ?iri) .
                      OPTIONAL {
                        BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/index/croci/ci/', '', 'i') as ?short_iri) .
                        ?iri cito:hasCitingEntity ?citing_doi_iri .
                        BIND(REPLACE(STR(?citing_doi_iri), 'http://dx.doi.org/', '', 'i') as ?citing_doi) .
                        ?iri cito:hasCitedEntity ?cited_doi_iri .
                        BIND(REPLACE(STR(?cited_doi_iri), 'http://dx.doi.org/', '', 'i') as ?cited_doi) .
                        ?iri cito:hasCitationCreationDate ?creationdate .
                        ?iri cito:hasCitationTimeSpan ?timespan .
                      }

                      OPTIONAL{
                               ?iri a cito:JournalSelfCitation .
                               BIND('True' as ?isJSelfCitation).
                          }

                      OPTIONAL{
                               ?iri a cito:AuthorSelfCitation .
                               BIND('True' as ?isASelfCitation).
                          }
                  }
                }
          `],
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
              ],
              "isJSelfCitation":[
                  {"func": [make_it_empty]}
              ],
              "isASelfCitation":[
                  {"func": [make_it_empty]}
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
                {"fields": ["citing_doi","FREE-TEXT","cited_doi"], "values":[null," cites ", null], "classes":["header-title text-success","metric-entry text-capitalize mark","header-title text-info"]},
                //{"fields": ["subtitle"], "classes":["sub-header-title"]},
                {"classes":["10px"]},
                {"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Citing entity: ", "call_crossref_4citation_citing"], "classes": ["subtitle","text-success"]},
                {"classes":["8px"]},
                {"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Cited entity: ", "call_crossref_4citation_cited"], "classes": ["subtitle","text-info"]}

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
              {"fields": ["FREE-TEXT","timespan","FREE-TEXT"], "values": ["The timespan is ",null,""], "classes": ["metric-entry","imp-value",""]},
              {"classes":["5px"]},
              {"fields": ["FREE-TEXT","isJSelfCitation"], "values":["Is a Journal Self Citation",null], "respects":[[],[not_unknown]], "classes": ["imp-value"]},
              {"fields": ["FREE-TEXT","isASelfCitation"], "values":["Is an Author Self Citation",null], "respects":[[],[not_unknown]], "classes": ["imp-value"]}
            ],
            "graphics": {
              "citations_in_time":{
              }
            },
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
    },

    //new category
    "br_stats": {
      "rule":"(10.\\d{4,9}\/[-._;()/:A-Za-z0-9][^\\s]+)",
      "query": [`
        SELECT ?doi_iri ?doi
        WHERE  {
            BIND(STR("[[VAR]]") as ?doi) .
            BIND(<http://dx.doi.org/[[VAR]]> as ?doi_iri) .
        }
        `
      ],
      "links": {
        "doi_iri": {"field":"doi_iri","prefix":""}
      },
      "ext_data": {
        "crossref_ref": {"name": call_crossref_4citation, "param": {"fields":["doi"],"values":[null]}}
      },
      "contents":{
          "header": [
              {"classes":["40px"]},
              {"fields": ["doi"], "values":[null], "classes":["header-title text-success"]},
              {"classes":["8px"]},
              {"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Reference: ", "crossref_ref"], "classes": ["subtitle","text-success"]},
          ],
          "oscar":{},

          "view": {
            "citations_in_time": {

                      "source":{
                          "name": "oscar",
                          "param": {
                              "query_text": 'search?text=[[?doi]]&rule=cits_stats',
                          }
                        },

                        "fields":["date","type","count"],
                        "respects": [{"func":is_in_cits,"param":"type"}],
                        "graph": {
                          'style': 'bars',
                          'label': 'Number of Citations',
                          'data': {'x':'date', 'y':'count'},
                          'background_color': 'random',
                          'border_color': 'random',
                          'borderWidth': 1
                        }

            }
      }
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

function is_in_cits(val){
  return val == "cits_in" ;
}

function not_unknown(val){
  return (val != 'unknown')
}

function not_empty(val){
  return (val != '')
}

function make_it_empty(val){
  if (val == 'True') {
    return '';
  }
}
