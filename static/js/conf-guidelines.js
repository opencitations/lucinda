var browser_conf = {
  "sparql_endpoint": "https://w3id.org/oc/index/sparql",

  "prefixes": [
    ],

    "categories":{

        "document": {
              "rule": "(10.\\d{4,9}\/[-._;()/:A-Za-z0-9][^\\s]+)",
              "heuristics": [lower_case],
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
                    //A symbolic name
                    'name': 'crossref',
                    //The label value used in case the source is visualized in the page
                    'label': 'Crossref',
                    //A unique id
                    'id': 'crossref_doi_title',
                    //The url call with a SPARQL var identified as [[?<VAR>]]
                    'call': 'https://api.crossref.org/works/[[?doi]]',
                    //The dat format of the results
                    'format': 'json',
                    //The function which handles the results retrieved after the end of the call
                    'handle': crossref_handle_title,
                    //The container id to show the final results, this value could be repeated by other calls
                    'targets': 'header.[[title_val]]',
                    //The wanted fields from the call results, in case not specified all the original results are taken
                    'fields': ['message.title'],
                    //The functions which tests whether the call results are valid to be further elaborated and taken in consideration
                    'valid_data':[not_empty,not_undefined]
                  }
              ],

              "contents":{
                  "header": [
                      {"classes":["40px"]},
                      {
                        "fields": ["EXT-VAL"],
                        "values": ["Loading ..."],
                        "id":["title_val"],
                        "classes": ["header-title text-success"],
                        //The type of data to show in this container
                        //  ONE-VAL: visualize only one textual value
                        //  MULTI-VAL: visualize multi textual values, the source of each value could be also visualized
                        //  X_AND_Y: a chart, the style of the chart is defined in the 'style' attribute
                        "param":[{'data_param': {'format':'MULTI-VAL','show_source':true}}],
                        'transform': [[title_transform]],
                        'respects':[[not_undefined,not_unknown]]
                      },
                      {
                        "fields": ["FREE-TEXT", "EXT-VAL"],
                        "values": ["Author(s): ", "Loading ..."],
                        "id":[null,"crossref_authors_val"],
                        "classes": ["subtitle","subtitle text-success"],
                        "param":[null,{'data_param': {'format':'ONE-VAL'}}],
                        'respects':[[],[not_undefined,not_unknown]]
                      },
                      {"classes":["8px"]},
                      {
                        "fields": ["doi"],
                        "values":[null],
                        "classes":["subtitle browser-a"],
                        'respects':[[]]
                      },

                  ],
                  "details": [
                      {"classes":["15px"]},
                      {
                        "fields": ["FREE-TEXT", "EXT-VAL"],
                        "values": ["Number of citations in Crossref (including the closed): ", "Loading ..."],
                        "id":[null,"close_cits_dom"],
                        "classes": [""," text-success"],
                        "param":[null,{'data_param': {'format':'ONE-VAL'}}],
                        'respects':[[],[not_undefined,not_unknown]]
                      },
                      {
                        "fields": ["FREE-TEXT", "EXT-VAL"],
                        "values": ["Number of citations in Wikidata: ", "Loading ..."],
                        "id":[null,"cits_in_wikidata_dom"],
                        "classes": [""," text-success"],
                        "param":[null,{'data_param': {'format':'ONE-VAL'}}],
                        'respects':[[],[not_undefined,not_unknown]]
                      },
                      {"classes":["20px"]},
                      {
                        "fields": ["FREE-TEXT", "EXT-VAL"],
                        "values": ["Number of citations (COCI dataset): ", "Loading ..."],
                        "id":[null,"cits_in_coci_dom"], "classes": [""," text-success"],
                        "param":[null,{'data_param': {'format':'ONE-VAL'}}],
                        'respects':[[],[not_undefined,not_unknown]]
                      },
                  ],
                  "view": [
                              {
                                  'type': 'chart',
                                  'id': 'coci_cits_in_time',
                                  'class': 'coci-cits-in-time',
                                  'style': 'bars',
                                  'label': 'Number of Citations (COCI dataset)',
                                  'data_param': {'format':'X_AND_Y','operation':{'sort':true}},
                                  'background_color': 'random',
                                  'border_color': 'random',
                                  'borderWidth': 1,
                                  'respects':[is_x_and_y_defined],
                                  //'width': "40px",
                                  //'height': "30px"
                              },
                              {
                                  'type': 'chart',
                                  'id': 'self_citation',
                                  'class': 'slef-citation',
                                  'style': 'horizontalbars',
                                  'label': 'Self Citations',
                                  'data_param': {'format':'X_AND_Y'},
                                  'background_color': 'random',
                                  'border_color': 'random',
                                  'borderWidth': 1,
                                  //'respects':[is_x_and_y_defined],
                                  //'width': "40px",
                                  //'height': "30px"
                              }
                  ]
              }
        }
    }
}



/*--------------------------------------------*/
/* External calls handling functions */
/*--------------------------------------------*/

//function <HANDLE-FUNC-NAME>(param) {

    /*---------*/
    // Here you can write all the code to elaborate the data retrieved after the call execution ended

    /*---------*/
    //<DATA>: an object with 2 keys: 'value'; 'source'
    //    <DATA>[value]: is the new value (generated through this function) to visualize in the final interface;
    //    Note: the HTML contents that wish to add this value should be carefull on the data-format stored in this attribute.
    //    <DATA>[source]: the external call label to visualize in the final interface.
    //    Note: this value could be visualized if requested by a related content ('show_source':true)
    /*---------*/
    //browser.target_ext_call(param.call_param, <DATA>)
//}

/*---------*/
//Example
function coci_handle_title(param) {
  var str_title = null;
  if (param.data[0] != undefined ) {
    var title = param.data[0]['title'];
    if (title != undefined) {
      str_title = title;
    }
  }

  var data = {'value':str_title,'source':param.call_param['label']};


  browser.target_ext_call(param.call_param,{'title_lbl':data});

}
