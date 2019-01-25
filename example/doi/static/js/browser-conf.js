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
              "links": {},
              "group_by": {},
              "none_values": {},
              "ext_sources": [
                  {
                    'name': 'oc_ramose',
                    'id': 'cits_in_time',
                    'call': 'http://opencitations.net/index/coci/api/v1/citations/[[?doi]]',
                    'format': 'json',
                    'handle': oc_ramose_handle_dates,
                    'targets': 'view.[[coci_cits_in_time]]'
                    //'fields': [],
                    //"respects": []
                  },
              ],

              "contents":{
                  "header": [
                      {"classes":["40px"]},
                      {"fields": ["doi"], "values":[null], "classes":["header-title text-success"]},
                      {"classes":["8px"]},
                      {"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Reference: ", "crossref_ref"], "classes": ["subtitle","text-success"]},
                  ],
                  "view": [
                              {
                                  'type': 'chart',
                                  'id': 'coci_cits_in_time',
                                  'class': 'coci-cits-in-time',
                                  'style': 'bars',
                                  'label': 'Number of Citations in COCI',
                                  'data': {'x':'date', 'y':'count'},
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

  //sort the data
  sorted_all_data = {}
  Object.keys(all_data)
      .sort()
      .forEach(function(v, i) {
          sorted_all_data[v] = all_data[v];
       });

  console.log(sorted_all_data);


  //the end of each handle function calls browser view again
  var data = {'x':[],'y':[]}
  for (var key_date in sorted_all_data) {
    data.x.push(key_date);
    data.y.push(sorted_all_data[key_date]);
  }

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

function call_coci_ramose(str_doi, field) {
  var call_ramose_api_metadata = "http://opencitations.net/index/coci/api/v1/metadata/";
  var call_full = call_ramose_api_metadata + encodeURIComponent(str_doi);
  var result_data = "";
  $.ajax({
        dataType: "json",
        url: call_full,
        type: 'GET',
        async: false,
        success: function( res_obj ) {
            if (field == 1) {
              result_data = res_obj[0];
            }else {
              if (!b_util.is_undefined_key(res_obj[0],field)) {
                result_data = b_util.get_obj_key_val(res_obj[0],field);
              }
            }
        }
   });
   return result_data;

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
