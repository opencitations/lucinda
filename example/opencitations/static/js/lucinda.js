class Lucinda_util {

      static parse_hf_content(content) {

        const lines = content.split('\n'); // Split content into lines
        var issparql = false;
        const parsedData = [];
        let currentBlock = null;

        for (let line of lines) {
            line = line.trim(); // Remove extra whitespace

            if (!line || line.startsWith('#') === false) {
              if (issparql) {
                currentBlock.sparql += line.trim() + '\n';
              }
              continue; // Skip empty lines or non-comment lines
            }

            issparql = false;

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
                    issparql = true;
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

      // static extract_lucinda_placeholders(text) {
      //     const regex = /\[\[Lucinda:(\w+)\((.*?)\)\]\]/g;
      //     var matches = {};
      //     let match;
      //     while ((match = regex.exec(text)) !== null) {
      //       matches[match[0]] = {
      //         type: match[1],
      //         value: match[2].split(",").map(arg => arg.trim())
      //       };
      //     }
      //     return matches;
      // }

      static extract_lucinda_placeholders(text) {
          const regex = /\[\[Lucinda:([\s\S]*?)\]\]/g;
          var matches = {};
          let match;
          while ((match = regex.exec(text)) !== null) {
            matches[match[0]] = this.extract_anyfun_placeholders(match[1]);
          }
          return matches;
      }

      // static extract_anyfun_placeholders(text) {
      //     const regex = /(\w+)\((.*?)\)\s{0,}$/g;
      //     let match;
      //     while ((match = regex.exec(text)) !== null) {
      //       return {
      //         fun: match[1],
      //         param: match[2].split(",").map(arg => arg.trim())
      //       };
      //     }
      //     return null;
      // }

      static extract_anyfun_placeholders(input) {
          const regex = /(\w+)\(([\s\S]*?)\)\s{0,}$/; // Match the function name and arguments inside parentheses.

          function parse(call) {
              const match = call.match(regex);
              if (!match) return call.trim(); // If no match, return as-is (base case).

              const funcName = match[1]; // Function name
              const rawArgs = match[2]; // Raw arguments string

              // Split arguments by commas while respecting nested parentheses
              const args = [];
              let currentArg = '';
              let depth = 0;

              for (let char of rawArgs) {
                  if (char === ',' && depth === 0) {
                      args.push(currentArg.trim());
                      currentArg = '';
                  } else {
                      if (char === '(') depth++;
                      if (char === ')') depth--;
                      currentArg += char;
                  }
              }
              if (currentArg) args.push(currentArg.trim()); // Add the last argument.

              // Recursively parse arguments
              const parsedArgs = args.map(arg => parse(arg));

              return {
                  fun: funcName,
                  param: parsedArgs
              };
          }

          return parse(input);
      }

      static command_vars(s) {
        const regex = /([\w.]+)\s*(==|!=|>=|=<|>|<)\s*([\w\d.]+)|\(|\)|&&|\|\|/g;
        // Replace variables with their values and parse logical operators
        var vars = [];
        let parsedExpression = s.replace(regex, (match, variable, operator, value) => {
          if (variable) {
            vars.push(variable);
          }
        });
        return vars;
      }

      static create_unique_id(s) {
        const sanitizedString = s
          .replace(/[^a-zA-Z0-9]/g, '_')
          .toLowerCase()
          .replace(/_+/g, '_');
        return sanitizedString;
      }

}


class Lucinda_view {

  constructor(data) {
    this.data = data;
    this.pending_html = {};
    this.terminal_fun = [
      "htmlcontent",
      "val"
    ];
    this.command_fun = [
      "ifcond"
    ];
    this.fun_re = /([^"]+)\(([^"]+)\)/;
  }

  /*returns true if <l_att> are all ready in <this.data>*/
  is_ready(view_fun, l_k_att, params_not_ready = []){

      for (let i = 0; i < l_k_att.length; i++) {
        const a_param = l_k_att[i];

        if (typeof a_param === 'object') {
          params_not_ready.concat( this.is_ready(a_param["fun"], a_param["param"]) );
        }else {
          if (this.terminal_fun.includes(view_fun)) {
            continue;
          }else {

            if ((this.command_fun.includes(view_fun)) && (i == 0)) {
              const command_vars = Lucinda_util.command_vars(a_param);
              for (let j = 0; j < command_vars.length; j++) {
                if (this.get_nested_value(command_vars[j]) === undefined) {
                  params_not_ready.push(command_vars[j]);
                }
              }
              continue
            }

            if (this.get_nested_value(a_param) === undefined) {
              params_not_ready.push( a_param );
            }
          }
        }
      }
      return params_not_ready;
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
    //console.log("Set in LV, new data entry:",k,v);
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
      const params = this.pending_html[id];
      //console.log("Check:",id,fields," in data:",this.data);
      var params_to_be_ready = params.length;
      for (let i = 0; i < params.length; i++) {
        let _p = params[i];
        if (this.get_nested_value(_p) != undefined){
            params_to_be_ready -= 1;
        }
      }
      if (params_to_be_ready == 0) {
        htmls_ready.push(id);
      }
    }

    // Remove keys where the value is greater than 2
    Object.keys(this.pending_html).forEach(key => {
      if (htmls_ready.includes(key)) {
        delete this.pending_html[key];
      }
    });

    return htmls_ready;
  }

  genval(view_fun, l_k_att, att_vals =[]){

    //console.log("To execute",view_fun," with params",l_k_att);

    for (let i = 0; i < l_k_att.length; i++) {
      const a_param = l_k_att[i];

      if (typeof a_param === 'object') {
        att_vals.push( this.genval(a_param["fun"], a_param["param"]) );
      }else {

        if ((this.command_fun.includes(view_fun)) && (i == 0)) {
          att_vals.push( this.eval_command(a_param) );
          continue;
        }
        else if (this.terminal_fun.includes(view_fun)) {
          att_vals.push( a_param );
        }else {
          att_vals.push( this.get_nested_value(a_param) );
        }
      }
    }
    let val = this[view_fun](...att_vals);
    if (!(this.terminal_fun.includes(view_fun))) {
      return "<span class='lucinda-"+view_fun+"'>"+val+"</span>";
    }
    return val;
  }

  eval_command(s) {

    let lv_instance = this;

    const regex = /([\w.]+)\s*(==|===|!=|!==|>=|=<|>|<)\s*([\w\d.]+)|\(|\)|&&|\|\|/g;
    let parsedExpression = s.replace(regex, (match, variable, operator, value) => {
      if (variable && operator && value) {
        const var_value = lv_instance.get_nested_value(variable);
        return ___evaluate_opr(var_value, operator, value);
      }
      return match; // Keep parentheses and logical operators
    });
    return eval(parsedExpression);

    function ___evaluate_opr(var_value, operator, value) {
      const val = isNaN(value) ? var_value : parseFloat(value);
      if (val == "null") {
        val = null;
      }
      if (val == "undefined") {
        val = undefined;
      }
      switch (operator) {
        case ">": return var_value > val;
        case "<": return var_value < val;
        case ">=": return var_value >= val;
        case "=<": return var_value <= val;
        case "==": return var_value == val;
        case "===": return var_value === val;
        case "!=": return var_value != val;
        case "!==": return var_value !== val;
        default: return false;
      }
    }
  }




  /** VIEW FUNCTIONS
  * each function takes only one @param:
  * <args>: a list of keys that are inside <this.data>
  */

  /*Terminal function view*/
  htmlcontent(...args){
    try {
      return args.join("");
    } catch (e) {
      return "";
    }
  }

  /*Returns just the text*/
  text(...args){
    try {
      return args.join(", ");
    } catch (e) {
      return "";
    }
  }

  /*Returns just the text*/
  val(...args){
    let values = [];
    try {
      for (let i = 0; i < args.length; i++) {
        values.push(JSON.parse(args[i]));
      }
      return values;
    } catch (e) {
      return [];
    }
  }

  /*Returns just the text*/
  table(...args){
    let htmltab = "";
    try {
      if (args.length > 0) {
        if (typeof Array.isArray(args[0])){
          const val = args[0];
          htmltab += "<table>";

          if (args[1] != undefined) {
            var val_row = args[1];
            if (!(Array.isArray(val_row))){
              val_row = [val_row];
            }
            htmltab += "<thead><tr>";
            for (let j = 0; j < val_row.length; j++) {
              htmltab += "<th>"+val_row[j]+"</th>";
            }
            htmltab += "</tr></thead>";
          }

          htmltab += "<tbody>";

          for (let i = 0; i < val.length; i++) {
            var val_row = val[i];
            if (!(Array.isArray(val_row))){
              val_row = [val_row];
            }
            htmltab += "<tr>";
            for (let j = 0; j < val_row.length; j++) {
              htmltab += "<td>"+val_row[j]+"</td>";
            }
            htmltab += "</tr>";
          }
          htmltab += "</tbody></table>";
        }
      }
    } catch (e) {
      return "";
    }
    return htmltab;
  }

  concat(...args){
    try {
      return args.join("");
    } catch (e) {
      return "";
    }
  }

  /*command functions*/
  /*args[0] is always a True/False*/
  ifcond(...args){
    try {
      if (args[0] == true) {
        return args[1];
      }else {
        if (args[2] != undefined) {
          return args[2];
        }
      }
    } catch (e) {
      return "";
    }
    return "";
  }

}


class Lucinda {
    static conf = {
      resource: window.location.href,
      templates_url: "/",
      templates: [],
      html_error_template: null,
      local_test: false,

      endpoint: [
          {
            id: "*",
            requests: {
              get: {
                query_preprocess: "encodeURIComponent",
                url_param: "?query=[[sparql]]&format=json",
                args:{
                  "method": "GET"
                },
                success_controller: "reqhandler_spqrqljson"
              },
              post: {
                args:{
                  headers:{
                    "Accept": "application/json",
                    "Content-Type": "application/sparql-query",
                  },
                  method: "POST"
                },
                success_controller: "reqhandler_spqrqljson"
              }
            }
          }
      ]
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

    static add_endpoint_handler(endpoint_conf) {
      Lucinda.conf.endpoint.push(endpoint_conf);
    }

    static run( c = 0, templates = {} ) {

      // when all templates have been scanned, work on the suitable potential templates
      if (c >= Lucinda.conf.templates.length) {

        const potential_templates = _get_potential_templates(templates);
        //console.log("The potential templates are:",potential_templates);

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
          Lucinda.data[cr_query_block.id] = undefined;
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
                "pub_date": "2009",
                "author": [
                  "Franco",
                  "Pippo",
                  "Patrik",
                  "Stefano"
                ]
            }
        ];
        Lucinda.data[cr_query_block.id] = _postprocess(data, cr_query_block);
        if (Object.values(Lucinda.data).every(value => value !== undefined)) {
          Lucinda.build_success_html_page();
        }

      }else {

        const endpoint = cr_query_block.endpoint;
        if (endpoint == undefined) {
          return null;
        }

        // Search in Lucinda.endpoint the object with this endpoint name
        // if not there take default one "*"
        let endpoint_conf = Lucinda.conf.endpoint.find((item) => item.id === endpoint);
        if (!(endpoint_conf)) {
          endpoint_conf = Lucinda.conf.endpoint.find((item) => item.id === "*");
        }

        // build query and call query_preprocess if in conf
        let _query = Lucinda_util.replace_placeholders(cr_query_block.sparql, Lucinda.current_resource.param);
        if ("query_preprocess" in endpoint_conf) {
          _query = window[endpoint_conf["query_preprocess"]](_query);
        }

        const req_conf = endpoint_conf.requests[cr_query_block.method]
        let url_query = "";
        if ("url_param" in req_conf) {
          url_query = req_conf["url_param"].replace(/\[\[sparql\]\]/, _query);
        }
        const endpoint_call = endpoint+url_query;
        const args = req_conf.args
        if (cr_query_block.method == "post") {
          args["body"] = _query;
        }

        console.log("Call endpoint:",endpoint_call," with Args:", args);
        fetch(endpoint_call,args)
          .then(response => response.json())
          .then(data => {

            const fun_success_controller = req_conf.success_controller;
            let resource_normal = Lucinda[fun_success_controller](data);
            if (resource_normal == null) {
              Lucinda.build_error_html_page();
            }else {
              Lucinda.data[cr_query_block.id] = _postprocess(resource_normal, cr_query_block);
              // when all pending queries are done build the HTML page
              if (Object.values(Lucinda.data).every(value => value !== undefined)) {
                Lucinda.build_success_html_page();
              }
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
    }

    static build_success_html_page(){
      //console.log("Building HTML success page!");

      Lucinda.lv = new Lucinda_view( Lucinda.data );
      const template = Lucinda.current_resource.template;
      fetch(Lucinda.conf.templates_url+template+`.html?rand=${Math.random()}`)
          .then(response => response.text())
          .then(html_content => {
            const fields = Lucinda_util.extract_lucinda_placeholders(html_content);
            //console.log("All lucinda placeholders in the html:", fields);
            // apply Lucinda view
            var html_index  = {};
            if (fields) {
              for (const placeholder in fields) {
                const fun = fields[placeholder]["fun"];
                const param = fields[placeholder]["param"];
                const params_not_ready = Lucinda.lv.is_ready(fun,param);

                if (params_not_ready.length == 0) {
                  html_index[placeholder] = Lucinda.lv.genval(fun,param);
                }else {
                  const uniqueid = Lucinda_util.create_unique_id(placeholder);
                  html_index[placeholder] = "<span class='lucinda-pendinghtml:"+uniqueid+" loading-dots'><span>.</span><span>.</span><span>.</span> </span>";
                  Lucinda.lv.set_new_pending_html_entry( placeholder , params_not_ready );
                }
              }
            }
            //console.log("External fields are:",Lucinda.extdata);
            //console.log("Pending html DOMs are:",Lucinda.lv.pending_html);
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

      //console.log("Lucinda data view is now:",Lucinda.lv.data);

      const html_ready_placeholders = Lucinda.lv.check_pending_html();

      //console.log("Pending HTML to build now:",html_ready_placeholders);

      for (let i = 0; i < html_ready_placeholders.length; i++) {
        const fields = Lucinda_util.extract_lucinda_placeholders(html_ready_placeholders[i]);
        for (const placeholder in fields) {
          const fun = fields[placeholder]["fun"];
          const param = fields[placeholder]["param"];
          const view = Lucinda.lv.genval(fun,param);

          const uniqueid = Lucinda_util.create_unique_id(placeholder);
          const loading_placeholder = document.getElementsByClassName('lucinda-pendinghtml:'+uniqueid);
          for (const element of loading_placeholder) {
            element.innerHTML = view;
            element.className = 'lucinda-pendinghtml-loaded';
            //element.parentNode.replaceChild( document.createTextNode(view), element );
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
          //if (field_id in Lucinda.extdata) {
          const call_extfun = _extfun(ext_fun);
          window[call_extfun]();
          //}
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
      if (Lucinda.conf.html_error_template != null) {
        fetch(Lucinda.conf.templates_url+Lucinda.conf.html_error_template+`.html?rand=${Math.random()}`)
            .then(response => response.text())
            .then(html_content => {
              document.getElementById('__lucinda__').innerHTML = html_content;
            })
            .catch(error => {console.error('Error loading the HTML file:', error);});

      }else {
          document.getElementById('__lucinda__').innerHTML = "<html><head></head><body><h1>Error while loading the desired resource!</h1></body></html>";
      }
    }

    /*
    Requests Handlers
    Each requests handler takes the request result (<data>) and must return an object like:
    {
      "id": "ID-VAL",
      "title": "TITLE-VAL",
      "pub_date": A-YEAR,
      "author": ["NAME-1","NAME-2",...],
    ...}
    */
    static reqhandler_spqrqljson(data){
        if (data.results.bindings.length > 0) {
          // Initialize resource_normal object with empty values for each variable in head.vars
          const resource_normal = data.head.vars.reduce((acc, varName) => {
              acc[varName] = null;
              return acc;
          }, {});

          // Loop through bindings and update resource_normal with actual values where available
          [data.results.bindings[0]].forEach((binding) => {
              Object.keys(binding).forEach((key) => {
                  if (binding[key].value !== undefined) {
                      resource_normal[key] = binding[key].value; // Assign the value if exists
                  }
              });
          });
          return resource_normal;
      }
      return null;
    }
}
