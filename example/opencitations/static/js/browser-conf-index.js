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
    "coci_citation": {
          "rule": "coci\/ci\/.*",
          "query": `
            SELECT DISTINCT ?iri ?short_iri ?citing_doi ?citing_doi_iri ?cited_doi ?cited_doi_iri ?creationdate ?timespan ?isJSelfCitation ?isASelfCitation
                WHERE  {
                  GRAPH <https://w3id.org/oc/index/coci/> {
                    BIND(<https://w3id.org/oc/index/[[VAR]]> as ?iri) .
                    OPTIONAL {
                      BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/index/coci/ci/', '', 'i') as ?short_iri) .
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
          `,
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
                {"fields": ["citing_doi","FREE-TEXT","cited_doi"], "values":[null," cites ", null], "classes":["header-title text-success","metric-entry text-capitalize","header-title text-info"]},

                {"classes":["10px"]},

                {
                  "fields": ["FREE-TEXT", "EXT-VAL"],
                  "values": ["Citing entity: ", "Loading ..."],
                  "id":[null,"citing_val"],
                  "classes": ["subtitle","subtitle text-success"],
                  "param":[null,{'data_param': {'format':'ONE-VAL'}}],
                  'respects':[[],[not_undefined,not_unknown]]
                },

                {"classes":["8px"]},

                {
                  "fields": ["FREE-TEXT", "EXT-VAL"],
                  "values": ["Cited entity: ", "Loading ..."],
                  "id":[null,"cited_val"],
                  "classes": ["subtitle","subtitle text-info"],
                  "param":[null,{'data_param': {'format':'ONE-VAL'}}],
                  'respects':[[],[not_undefined,not_unknown]]
                }
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
                "query_text": "citing_doi_iri",
                "rule": "citingdoi",
                "label":"All References",
                "config_mod" : [
                    {"key":"page_limit_def" ,"value":30},
                    //{"key":"categories.[[name,document]].fields.[[title,Cited by]].sort.default" ,"value":{"order": "desc"}},
                    {"key":"categories.[[name,citation]].fields.[[title,Cited reference]].column_width" ,"value":"40%"},
                    {"key":"categories.[[name,citation]].fields.[[title,Citing reference]]" ,"value":"REMOVE_ENTRY"},
                    {"key":"categories.[[name,citation]].fields.[[title,Citing DOI]]" ,"value":"REMOVE_ENTRY"},
                    {"key":"progress_loader.visible" ,"value":false}
                ]
              },
              {
                "query_text": "cited_doi_iri",
                "rule": "citeddoi",
                "label":"All Citations",
                "config_mod" : [
                    {"key":"page_limit_def" ,"value":30},
                    //{"key":"categories.[[name,citation]].fields.[[title,Cited DOI]]" ,"value":"REMOVE_ENTRY"},
                    {"key":"categories.[[name,citation]].fields.[[title,Citing reference]].column_width" ,"value":"40%"},
                    {"key":"categories.[[name,citation]].fields.[[title,Cited reference]]" ,"value":"REMOVE_ENTRY"},
                    {"key":"categories.[[name,citation]].fields.[[title,Cited DOI]]" ,"value":"REMOVE_ENTRY"},
                    //{"key":"categories.[[name,document]].fields.[[title,Year]].sort.default" ,"value":{"order": "asc"}},
                    {"key":"progress_loader.visible" ,"value":false}
                ]
              }
            ]
          },
          "ext_sources": [
              {
                //A symbolic name
                'name': 'coci',
                //The label value used in case the source is visualized in the page
                'label': 'COCI',
                //A unique id
                'id': 'coci_metadata_citing',
                //The url call with a SPARQL var identified as [[?<VAR>]]
                'call': 'http://opencitations.net/index/coci/api/v1/metadata/[[?citing_doi]]',
                //The dat format of the results
                'format': 'json',
                //The function which handles the results retrieved after the end of the call
                'handle': index_handle_title,
                //The container id to show the final results, this value could be repeated by other calls
                'targets': 'header.[[citing_val]]',
                //The functions which tests whether the call results are valid to be further elaborated and taken in consideration
                'valid_data':[not_empty,not_undefined]
              },
              {
                //A symbolic name
                'name': 'coci',
                //The label value used in case the source is visualized in the page
                'label': 'COCI',
                //A unique id
                'id': 'coci_metadata_cited',
                //The url call with a SPARQL var identified as [[?<VAR>]]
                'call': 'http://opencitations.net/index/coci/api/v1/metadata/[[?cited_doi]]',
                //The dat format of the results
                'format': 'json',
                //The function which handles the results retrieved after the end of the call
                'handle': index_handle_title,
                //The container id to show the final results, this value could be repeated by other calls
                'targets': 'header.[[cited_val]]',
                //The functions which tests whether the call results are valid to be further elaborated and taken in consideration
                'valid_data':[not_empty,not_undefined]
              }
          ],
    },
    "croci_citation": {
          "rule": "croci\/ci\/.*",
          "query": `
            SELECT DISTINCT ?iri ?short_iri ?citing_doi ?citing_doi_iri ?cited_doi ?cited_doi_iri ?creationdate ?timespan ?isJSelfCitation ?isASelfCitation
                WHERE  {
                  GRAPH <https://w3id.org/oc/index/croci/> {
                      BIND(<https://w3id.org/oc/index/[[VAR]]> as ?iri) .
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
          `,
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
                {"fields": ["citing_doi","FREE-TEXT","cited_doi"], "values":[null,"  cites  ", null], "classes":["header-title text-success","text-capitalize","header-title text-info"]},
                //{"fields": ["subtitle"], "classes":["sub-header-title"]},
                {"classes":["10px"]},

                {
                  "fields": ["FREE-TEXT", "EXT-VAL"],
                  "values": ["Citing entity: ", "Loading ..."],
                  "id":[null,"citing_val"],
                  "classes": ["subtitle","subtitle text-success"],
                  "param":[null,{'data_param': {'format':'ONE-VAL'}}],
                  'respects':[[],[not_undefined,not_unknown]]
                },

                {"classes":["8px"]},

                {
                  "fields": ["FREE-TEXT", "EXT-VAL"],
                  "values": ["Cited entity: ", "Loading ..."],
                  "id":[null,"cited_val"],
                  "classes": ["subtitle","subtitle text-info"],
                  "param":[null,{'data_param': {'format':'ONE-VAL'}}],
                  'respects':[[],[not_undefined,not_unknown]]
                }
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
            "oscar": [
              {
                "query_text": "citing_doi_iri",
                "rule": "citingdoi",
                "label":"All References",
                "config_mod" : [
                    {"key":"page_limit_def" ,"value":30},
                    //{"key":"categories.[[name,document]].fields.[[title,Cited by]].sort.default" ,"value":{"order": "desc"}},
                    {"key":"categories.[[name,citation]].fields.[[title,Cited reference]].column_width" ,"value":"40%"},
                    {"key":"categories.[[name,citation]].fields.[[title,Citing reference]]" ,"value":"REMOVE_ENTRY"},
                    {"key":"categories.[[name,citation]].fields.[[title,Citing DOI]]" ,"value":"REMOVE_ENTRY"},
                    {"key":"progress_loader.visible" ,"value":false}
                ]
              },
              {
                "query_text": "cited_doi_iri",
                "rule": "citeddoi",
                "label":"All Citations",
                "config_mod" : [
                    {"key":"page_limit_def" ,"value":30},
                    //{"key":"categories.[[name,citation]].fields.[[title,Cited DOI]]" ,"value":"REMOVE_ENTRY"},
                    {"key":"categories.[[name,citation]].fields.[[title,Citing reference]].column_width" ,"value":"40%"},
                    {"key":"categories.[[name,citation]].fields.[[title,Cited reference]]" ,"value":"REMOVE_ENTRY"},
                    {"key":"categories.[[name,citation]].fields.[[title,Cited DOI]]" ,"value":"REMOVE_ENTRY"},
                    //{"key":"categories.[[name,document]].fields.[[title,Year]].sort.default" ,"value":{"order": "asc"}},
                    {"key":"progress_loader.visible" ,"value":false}
                ]
              }
            ]
          },

          "ext_sources": [
              {
                //A symbolic name
                'name': 'croci',
                //The label value used in case the source is visualized in the page
                'label': 'CROCI',
                //A unique id
                'id': 'croci_metadata_citing',
                //The url call with a SPARQL var identified as [[?<VAR>]]
                'call': 'http://opencitations.net/index/croci/api/v1/metadata/[[?citing_doi]]',
                //The dat format of the results
                'format': 'json',
                //The function which handles the results retrieved after the end of the call
                'handle': index_handle_title,
                //The container id to show the final results, this value could be repeated by other calls
                'targets': 'header.[[citing_val]]',
                //The functions which tests whether the call results are valid to be further elaborated and taken in consideration
                'valid_data':[not_empty,not_undefined]
              },
              {
                //A symbolic name
                'name': 'croci',
                //The label value used in case the source is visualized in the page
                'label': 'CROCI',
                //A unique id
                'id': 'croci_metadata_cited',
                //The url call with a SPARQL var identified as [[?<VAR>]]
                'call': 'http://opencitations.net/index/croci/api/v1/metadata/[[?cited_doi]]',
                //The dat format of the results
                'format': 'json',
                //The function which handles the results retrieved after the end of the call
                'handle': index_handle_title,
                //The container id to show the final results, this value could be repeated by other calls
                'targets': 'header.[[cited_val]]',
                //The functions which tests whether the call results are valid to be further elaborated and taken in consideration
                'valid_data':[not_empty,not_undefined]
              }
          ]
    }
  }
}


function index_handle_title(param) {
  var str_title = null;
  if (param.data[0] != undefined ) {
    var title = param.data[0]['title'];
    if (title != undefined) {
      str_title = "<a href='http://dx.doi.org/"+param.data[0]['doi']+"' target='_blank'>"+title +"</a>";
    }
  }

  var data = {'value':str_title,'source':param.call_param['label']};
  browser.target_ext_call(param.call_param,{'title_lbl':data});
}


//Mapping functions
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

function not_undefined(val){
  return (val != undefined)
}

function not_in_loading(val){
  return (val != 'Loading ...');
}

function test_this(val){
  return (val != '0');
}

function is_x_and_y_defined(val) {
  if ((val == undefined) || (Object.keys(val).length == 0)){
    return false;
  }
  if ((val.x == undefined) || (val.x == null) || (val.x.length == 0)){
    return false;
  }
  if ((val.y == undefined) || (val.y == null) || (val.y.length == 0)){
    return false;
  }
  return true;
}


function not_empty(val){
  return (val != '')
}

function make_it_empty(val){
  if (val == 'True') {
    return '';
  }
}

function title_transform(val) {
  if ((val == undefined) || (val == null) || (val == 'unknown')) {
    return "Element not found"
  }
  return val;
}

function lower_case(str){
  return str.toLowerCase();
}
