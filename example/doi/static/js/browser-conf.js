var browser_conf = {
  "sparql_endpoint": "https://w3id.org/oc/index/coci/sparql",

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
              "rule": "(10.\\d{4,9}\/[-._;()/:A-Za-z0-9][^\\s]+)",
              "query": [
                `
                SELECT ?doi_iri ?doi
                WHERE  {
                    BIND(STR("[[VAR]]") as ?doi) .
                    BIND(<http://dx.doi.org/[[VAR]]> as ?doi_iri) .
                }
                `
              ],
              "links": {
                "doi": {"field":"doi_iri","prefix":""}
              },
              "group_by": {},
              "none_values": {},
              "ext_sources": [
                  {
                    'name': 'crossref',
                    'label': 'Crossref',
                    'id': 'crossref_doi_title',
                    'call': 'https://api.crossref.org/works/[[?doi]]',
                    'format': 'json',
                    'handle': crossref_handle_title,
                    'targets': 'header.[[crossref_title_val]]',
                    'fields': ['message.title'],
                    //"respects": []
                  },
                  {
                    'name': 'oc_ramose',
                    'label': '',
                    'id': 'cits_in_time',
                    'call': 'http://opencitations.net/index/coci/api/v1/citations/[[?doi]]',
                    'format': 'json',
                    'handle': oc_ramose_handle_dates,
                    'targets': 'view.[[coci_cits_in_time]]'
                    //'fields': [],
                    //"respects": []
                  },
                  {
                    'name': 'coci_ramose',
                    'label': 'COCI',
                    'id': 'coci_doi_title',
                    'call': 'https://w3id.org/oc/index/coci/api/v1/metadata/[[?doi]]',
                    'format': 'json',
                    'handle': coci_handle_title,
                    'targets': 'header.[[crossref_title_val]]'
                  },
                  {
                    'name': 'crossref',
                    'label': '',
                    'id': 'crossref_authors',
                    'call': 'https://api.crossref.org/works/[[?doi]]',
                    'format': 'json',
                    'handle': crossref_handle_author,
                    'targets': 'header.[[crossref_authors_val]]',
                    'fields': ['message.author'],
                    //"respects": []
                  }
              ],

              "contents":{
                  "header": [
                      {"classes":["40px"]},
                      {"fields": ["FREE-TEXT"], "values": ["Loading ..."], "id":["crossref_title_val"], "classes": ["header-title text-success"]},
                      {"fields": ["FREE-TEXT", "FREE-TEXT"], "values": ["Author(s): ", "Loading ..."], "id":[null,"crossref_authors_val"], "classes": ["subtitle","subtitle text-success"]},
                      {"classes":["8px"]},
                      {"fields": ["doi"], "values":[null], "classes":["subtitle browser-a"]},
                  ],
                  "view": [
                              {
                                  'type': 'chart',
                                  'id': 'coci_cits_in_time',
                                  'class': 'coci-cits-in-time',
                                  'style': 'bars',
                                  'label': 'Number of Citations in COCI',
                                  'data_param': {'format':'X_AND_Y','operation':{'sort':true}},
                                  'background_color': 'random',
                                  'border_color': 'random',
                                  'borderWidth': 1,
                                  //'width': "40px",
                                  //'height': "30px"
                              }
                  ]
              }
        }
    }
}

function crossref_handle_author(param) {
  var list_authors = param.data['message.author'];

  var str_authors = "";
  if (list_authors != undefined) {
    for (var i = 0; i < list_authors.length; i++) {
      var a_author = list_authors[i];
      var flag_found = false;
      if ('given' in a_author) {
        str_authors = str_authors + a_author['given'] + " ";
        flag_found = true;
      }
      if ('family' in a_author) {
        str_authors = str_authors + a_author['family'];
        flag_found = true;
      }
      if ((flag_found) && (i < list_authors.length-1)) {
        str_authors = str_authors + ", ";
      }
    }
  }
  var data = {'value': str_authors};
  browser.target_ext_call(param.call_param,data);
}

function crossref_handle_title(param) {
  var title = param.data['message.title'];
  var str_title = "";
  if (title != undefined) {
    str_title = title[0];
  }

  var data = {'value': str_title};
  browser.target_ext_call(param.call_param,data);
}

function coci_handle_title(param) {
  var title = param.data[0]['title'];

  var str_title = null;
  if (title != undefined) {
    str_title = title;
  }

  var data = {'value': str_title};
  browser.target_ext_call(param.call_param,data);
}

function oc_ramose_handle_dates(param) {
  console.log(param);

  //Create the type of data according to the view you want to build
  var all_data = {};
  for (var i = 0; i < param.data.length; i++) {
    var year = -1
    if (param.data[i].creation != undefined) {
      if ((param.data[i].creation != null) && (param.data[i].creation != "")){
        parts = String(param.data[i].creation).split('-');
        year = parts[0];
      }
    }
    if (year != -1) {
      if (!(year in all_data)) {
        all_data[year] = 0;
      }
      all_data[year] += 1;
    }
  }

  var data = {}
  for (var key_date in all_data) {
    data[key_date] = {'y': all_data[key_date], 'label': ""};
  }

  // in this case the format needed
  // {<x-val>:<corresponding_json_obj>}
  // <corresponding_json_obj> = {y:<y-val>, ...}
  browser.target_ext_call(param.call_param,data);
}

function call_coci_oscar(param, fun_view_callbk) {
  var call_url = "file:///Users/ivan.heibi/opencitations/oscar/search-coci.html?text="+encodeURIComponent(param["str_doi"])+"&rule="+encodeURIComponent(param["rule_name"]);
  var result_data = "";
  $.ajax({
        dataType: "json",
        url: call_url,
        type: 'GET',
        async: false,
        success: function( res_obj ) {
            result_data = res_obj;
        }
   });
   console.log(result_data);
   return result_data;
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
