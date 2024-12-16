class Lucinda_util {

      static parse_hf_content(content) {

        const lines = content.split('\n'); // Split content into lines
        const parsedData = [];
        let currentBlock = null;

        for (let line of lines) {
            line = line.trim(); // Remove extra whitespace

            if (!line || line.startsWith('#') === false) {
                continue; // Skip empty lines or non-comment lines
            }

            if (line.startsWith('#id')) {
                // New block starts
                if (currentBlock) {
                    parsedData.push(currentBlock); // Save the previous block
                }
                currentBlock = { id: line.replace('#id', '').trim() }; // Start a new block
            } else if (currentBlock) {
                if (line.startsWith('#sparql')) {
                    // Concatenate sparql lines until empty line or new # key
                    currentBlock.sparql = currentBlock.sparql || '';
                    currentBlock.sparql += line.replace('#sparql', '').trim() + '\n';
                } else {
                    // Generic key-value pair
                    const [key, ...valueParts] = line.slice(1).split(' '); // Remove '#' and split
                    const value = valueParts.join(' ').trim();
                    if (key in currentBlock) {
                      currentBlock[key] = [currentBlock[key]].push(value);
                    }else {
                      currentBlock[key] = value;
                    }
                }
            }
        }

        // Push the last block if it exists
        if (currentBlock) {
            parsedData.push(currentBlock);
        }

        // Trim any excess newline characters from sparql blocks
        parsedData.forEach(block => {
            if (block.sparql) {
                block.sparql = block.sparql.trim();
            }
        });

        return parsedData;
    };


      static extract_url_params(path, pattern) {
          const regex = new RegExp( pattern.replace(/{([^}]+)}/g, '(.*)') );
          const match = path.match(regex);
          if (match != null) {
              const keys = pattern.match(/{([^}]+)}/g).map(key => key.replace(/[{}]/g, '')); // Extract the keys (type, id)
              const result = {};
              keys.forEach((key, index) => {
                  if (match[index + 1] != undefined) {
                    result[key] = match[index + 1]; // match[0] is the full string, so use index + 1 for captured values
                  }else {
                    result[key] = null;
                  }
              });
              return result;
          } else {
              return null;
          }
      }

      static replace_placeholders(str, values) {
          return str.replace(/\[\[([^\]]+)\]\]/g, (match, key) => {
              // key is the part inside [[ ]]
              return key in values ? values[key] : match; // Replace or keep the original placeholder if not found
          });
      }

      static replace_lucinda_placeholders(index_placeholders,content) {
        var converted_content = content;
        for (const placeholder in index_placeholders) {
          converted_content = converted_content.replaceAll(
            placeholder,
            index_placeholders[placeholder]
          )
        }
        return converted_content;
      }

      static extract_lucinda_placeholders(text) {
          const regex = /\[\[Lucinda:(\w+)\((.*?)\)\]\]/g;
          var matches = {};
          let match;
          while ((match = regex.exec(text)) !== null) {
            matches[match[0]] = {
              type: match[1],
              value: match[2].split(",").map(arg => arg.trim())
            };
          }
          return matches;
      }
}


class Lucinda_view {

  constructor(data) {
    this.data = data;
    this.pending_html = {};
  }

  /*returns true if <l_att> are all ready in <this.data>*/
  is_ready(l_att){
    let all_ready = true;
    for (let i = 0; i < l_att.length; i++) {
      all_ready &= (this.get_nested_value(l_att[i]) != undefined);
    }
    return all_ready;
  }

  /*get get_nested_value from <this.data>*/
  get_nested_value(_path) {
    const keys = _path.split('.');
    let current = this.data;
    for (const key of keys) {
      if (current[key] === undefined) {
        return undefined; // Return undefined if any key is not found
      }
      current = current[key];
    }
    return current;
  }

  /*sets a new <k> in <this.data> with a corresponding value <v>*/
  set_new_data_entry(k, v) {
    console.log("Set in LV, new data entry:",k,v);
    const keys = k.split(".");
    let current = this.data;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {}; // Create nested object if it doesn't exist
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = v; // Set the final value
  }

  /*sets a new <k> in <this.data> with a corresponding value <v>*/
  set_new_pending_html_entry(k,v){
    v = Array.isArray(v) ? v : [v];
    this.pending_html[k] = v;
  }

  check_pending_html(){
    var htmls_ready = [];
    for (const id in this.pending_html) {
      const fields = this.pending_html[id];
      console.log("Check:",id,fields," in data:",this.data);
      if (this.is_ready(fields)) {
        htmls_ready.push(id);
      }
    }
    return htmls_ready;
  }

  genval(view_fun, l_k_att){
    let att_vals = [];
    for (let i = 0; i < l_k_att.length; i++) {
      att_vals.push(this.get_nested_value(l_k_att[i]));
    }
    return this[view_fun](...att_vals);
  }

  /** VIEW FUNCTIONS
  * each function takes only one @param:
  * <args>: a list of keys that are inside <this.data>
  */

  /*Returns just the text*/
  text(...args){
    try {
      return args.join(", ");
    } catch (e) {
      return "";
    }
  }

}


class Lucinda {
    static conf = {
      resource: window.location.href,
      templates_url: "/",
      templates: [],
      addon: null,
      html_error: null,
      local_test: false
    }
    static current_resource = [];
    static data = {};
    static extdata = {};
    static lv = null;

    static init(_conf) {
      for (const _k in _conf) {
        if (Lucinda.conf.hasOwnProperty(_k)) {
          Lucinda.conf[_k] = _conf[_k];
        }
      }
    }

    static run( c = 0, templates = {} ) {

      // when all templates have been scanned, work on the suitable potential templates
      if (c >= Lucinda.conf.templates.length) {

        const potential_templates = _get_potential_templates(templates);
        console.log("The potential templates are:",potential_templates);

        _set_template(potential_templates);
        console.log("The selected template is:",Lucinda.current_resource);

        return true;
      }


      const k_template = Lucinda.conf.templates[c];
      fetch(Lucinda.conf.templates_url + k_template + `.hf?rand=${Math.random()}`)
          .then(response => response.text())
          .then(hf_content => {
              if (hf_content) {
                  templates[k_template] = Lucinda_util.parse_hf_content(hf_content);
              }
              Lucinda.run( c+1, templates );
          })
          .catch(error => {console.error('Error loading the HF file:', error);});

      function _get_potential_templates(_templates) {
          var potential_templates = [];
          const href_path = Lucinda.conf.resource;
          for (const _k in _templates) {
            // the main block is always the first one
            const main_block = _templates[_k][0];
            const url_params = Lucinda_util.extract_url_params( href_path, main_block["url"] );
            if (url_params != null) {
              potential_templates.push({
                "template": _k,
                "param": url_params,
                "hfconf": _templates[_k]
              });
            }
          }
          if (potential_templates.length > 0) {
            // returned sorted according to template name and the main block definition

            potential_templates = potential_templates.sort((a, b) => {
                // Check if both or neither have the "query" key
                const hasQueryA = 'sparql' in a.hfconf[0];
                const hasQueryB = 'sparql' in b.hfconf[0];
                if (hasQueryA && !hasQueryB) return -1;
                if (!hasQueryA && hasQueryB) return 1;
                return a.template.localeCompare(b.template);
            });
          }
          return potential_templates;
      }
      function _set_template(potential_templates, c=0) {

        if (potential_templates.length == 0) {
          return null;
        }

        if (c <= potential_templates.length - 1) {

          const pa = potential_templates[c];
          console.log("Now is:",potential_templates[c], " with c=",c);
          if (c == potential_templates.length - 1) {
            __template_found(pa);
          }

          const main_block = pa.hfconf[0];
          if (!("sparql" in main_block)) {
            return pa;
          }else {
            if (Lucinda.conf.local_test) {
              if (Math.random() < 0.5){
                __template_found(pa);
              }else {
                return _set_template(potential_templates, c + 1);
              }
            }else {
              /*ASK Sparql*/
              const endpoint_call = main_block.endpoint + "?query=" + encodeURIComponent(main_block.sparql);
              fetch(endpoint_call, { headers: {"Accept": "application/sparql-results+json"}})
                .then(response => {
                  if (!response.ok) {throw new Error("SPARQL query failed: " + response.statusText);}
                  return response.json();
                })
                .then(data => {
                  if (data.boolean === true) {
                    __template_found(pa);
                  }else {
                    return _set_template(potential_templates, c + 1);
                  }
                })
                .catch(error => {console.error("Error during SPARQL query execution:", error);});

            }
          }
        }

        function __template_found(_pa) {
          console.log("Execute template:",_pa);
          Lucinda.current_resource = _pa;
          return _do_queries();
        }

      }
      function _do_queries( ) {

        const current_resource_hfconf = Lucinda.current_resource["hfconf"];
        if (current_resource_hfconf.length <= 1) {
          console.log("Warning: no queries are specified");
          return null;
        }

        for (let i = 1; i < current_resource_hfconf.length; i++) {
          const cr_query_block = current_resource_hfconf[i];
          if (cr_query_block.id == undefined) {
            console.log("Error: id field must be specified to define a query");
            return null;
          }
          Lucinda.data[cr_query_block.id] = null;
        }

        for (let i = 1; i < current_resource_hfconf.length; i++) {
            const cr_query_block = current_resource_hfconf[i];
            if ( (cr_query_block.id == undefined) || (cr_query_block.endpoint == undefined) || (cr_query_block.sparql == undefined) || (cr_query_block.method == undefined) ) {
              console.log("Error: some mandatory fields (id, endpoint, sparql, method) are not defined");
              return null;
            }

            Lucinda.query_endpoint( cr_query_block );

        }

      }
    }

    static query_endpoint( cr_query_block ) {

      _preprocess( cr_query_block );

      if (Lucinda.conf.local_test) {
        const data = [
            {
                "id": "doi:10.1007/978-1-4020-9632-7 omid:br/0612058700",
                "title": "Adaptive Environmental Management",
                "pub_date": "2009"
            }
        ];
        Lucinda.data[cr_query_block.id] = _postprocess(data, cr_query_block);
        if (Object.values(Lucinda.data).every(value => value !== null)) {
          Lucinda.build_success_html_page();
        }

      }else {

        const endpoint = cr_query_block.endpoint;
        if (endpoint == undefined) {
          return null;
        }

        const method = cr_query_block.method;
        var call_method = "GET";
        if (method) {
          call_method = method.toUpperCase();
        }

        const url_query = `query=${encodeURIComponent(_build_sparql_query())}&format=json`;
        var endpoint_call = endpoint+"?"+url_query;

        var args = {method: call_method};
        if (call_method == "POST") {
          endpoint_call = endpoint;
          args["headers"] = {
            'CONTENT_TYPE': 'application/sparql-query',
          };
          args["data"] = url_query;
        }

        fetch(endpoint_call,args)
          .then(response => response.json())
          .then(data => {
            Lucinda.data[cr_query_block.id] = _postprocess(data, cr_query_block);

            // when all pending queries are done build the HTML page
            if (Object.values(Lucinda.data).every(value => value !== null)) {
              Lucinda.build_success_html_page();
            }
          })
          .catch(error => {
            console.error('Error:', error);
            Lucinda.build_error_html_page();
          });
      }

      function _preprocess( cr_query_block ) {

        const param = Lucinda.current_resource.param;
        if (!("preprocess" in cr_query_block)) {
          return false;
        }

        const f_call = cr_query_block["preprocess"];
        const match = f_call.match(/^(\w+)\((.*?)\)$/);
        if (!match) {
          throw new Error(`Invalid function call syntax in HF file: ${f_call}`);
        }

        const [_, functionName, args] = match;
        if (typeof window[functionName] !== 'function') {
            throw new Error(`Preprocess function not found: ${functionName}`);
        }

        // Process the arguments using `param` for mapping
        const arg_list = args
            .split(',')
            .map(arg => arg.trim())
            .filter(arg => arg !== "")
            .map(arg => param[arg] !== undefined ? param[arg] : arg);

        var res = window[functionName](...arg_list);
        if ((res != undefined) && (res != null) && (typeof res === 'object')){
          for (const _k in res) {
            if (_k in Lucinda.current_resource.param) {
              Lucinda.current_resource.param[_k] = res[_k];
            }
          }
        }
        return Lucinda.current_resource.param;
      }

      function _postprocess(data, cr_query_block) {

        if (!("postprocess" in cr_query_block)) {
          return false;
        }

        const f_call = cr_query_block["postprocess"];
        const match = f_call.match(/^(\w+)\((.*?)\)$/);
        if (!match) {
          throw new Error(`Invalid function call syntax in HF file: ${f_call}`);
        }

        const [_, functionName, args] = match;
        if (typeof window[functionName] !== 'function') {
            throw new Error(`Postprocess function not found: ${functionName}`);
        }

        return window[functionName](data);
      }

      function _build_sparql_query() {

        if (Lucinda.current_resource.hfconf.sparql != undefined) {
          return Lucinda_util.replace_placeholders(
            Lucinda.current_resource.hfconf.sparql,
            Lucinda.current_resource.param)
        }
        return null;

      }
    }

    static build_success_html_page(){
      console.log("Building HTML success page!");

      Lucinda.lv = new Lucinda_view( Lucinda.data );
      const template = Lucinda.current_resource.template;
      fetch(Lucinda.conf.templates_url+template+`.html?rand=${Math.random()}`)
          .then(response => response.text())
          .then(html_content => {
            const fields = Lucinda_util.extract_lucinda_placeholders(html_content);
            // apply Lucinda view
            var html_index  = {};
            if (fields) {
              for (const placeholder in fields) {
                const type = fields[placeholder]["type"];
                const value = fields[placeholder]["value"];
                if (Lucinda.lv.is_ready(value)) {
                  html_index[placeholder] = Lucinda.lv.genval(type,value);
                }else {
                  html_index[placeholder] = "<span class='pending_html:"+placeholder+" loading-dots'><span>.</span><span>.</span><span>.</span></span>";
                  Lucinda.lv.set_new_pending_html_entry( placeholder , value );
                  // check which value is not ready
                  for (let i = 0; i < value.length; i++) {
                    if (! (Lucinda.lv.is_ready([value[i]])) ) {
                      Lucinda.extdata[value] = null;
                    }
                  }
                }
              }
            }
            console.log("External fields are:",Lucinda.extdata);
            console.log("Pending html DOMs are:",Lucinda.lv.pending_html);
            // ---
            const html_body = Lucinda_util.replace_lucinda_placeholders(html_index, html_content);
            document.getElementById('__lucinda__').innerHTML = html_body;
            Lucinda.run_extdata();
          })
          .catch(error => {console.error('Error loading the HTML file:', error);});
    }

    static build_extdata_view(...args){
      var id = args[0];
      id = Array.isArray(id) ? id : [id];

      const value = args[1];
      for (let i = 0; i < id.length; i++) {
        Lucinda.extdata[id[i]] = value;
        Lucinda.lv.set_new_data_entry(id[i],value);
      }

      const html_ready_placeholders = Lucinda.lv.check_pending_html();
      console.log(html_ready_placeholders);

      for (let i = 0; i < html_ready_placeholders.length; i++) {
        const fields = Lucinda_util.extract_lucinda_placeholders(html_ready_placeholders[i]);
        for (const placeholder in fields) {
          const type = fields[placeholder]["type"];
          const value = fields[placeholder]["value"];
          const view = Lucinda.lv.genval(type,id);
          console.log(view);

          const loading_placeholder = document.getElementsByClassName('pending_html:'+placeholder);
          for (const element of loading_placeholder) {
            element.parentNode.replaceChild( document.createTextNode(view), element );
          }
        }
      }
    }

    static run_extdata(){
      const main_block = Lucinda.current_resource.hfconf[0];
      if ("extdata" in main_block) {
        var ext_data = main_block["extdata"];
        ext_data = Array.isArray(ext_data) ? ext_data : [ext_data];

        for (let i = 0; i < ext_data.length; i++) {
          var [field_id, ext_fun] = ext_data[i].split(":");
          field_id = main_block["id"]+"."+field_id;
          if (field_id in Lucinda.extdata) {
            const call_extfun = _extfun(ext_fun);
            window[call_extfun]();
          }
        }
      }

      function _extfun(data_extfun) {
        const match = data_extfun.match(/^(\w+)\((.*?)\)$/);
        if (!match) {
          throw new Error(`Invalid external function call syntax: ${data_extfun}`);
        }

        const [_, functionName, args] = match;
        if (typeof window[functionName] !== 'function') {
            throw new Error(`Postprocess function not found: ${functionName}`);
        }
        return functionName;
      }
    }

    static build_error_html_page(){
      console.log("Building HTML error page!");
      document.getElementById('__lucinda__').innerHTML = "<html><head></head><body><h1>Error while loading the desired resource!</h1></body></html>";
    }
}
