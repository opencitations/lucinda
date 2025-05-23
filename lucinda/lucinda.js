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
                      currentBlock[key] = [currentBlock[key]];
                      currentBlock[key].push(value);
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

      static extract_lucinda_placeholders(text,lv) {
          // Remove all HTML comments
          const noComments = text.replace(/<!--[\s\S]*?-->/g, '');

          // Now apply your Lucinda placeholder regex
          const regex = /\[\[Lucinda:([\s\S]*?)\]\]/g;
          var matches = {};
          let match;
          while ((match = regex.exec(noComments)) !== null) {
              matches[match[0]] = this.extract_anyfun_placeholders(match[1],lv);
          }
          return matches;
      }

      static extract_anyfun_placeholders(input,lv) {
          const regex = /(\w+)\(([\s\S]*?)\)\s{0,}$/; // Match the function name and arguments inside parentheses.

          function parse(call) {
              const match = call.match(regex);
              if (!match) return call.trim(); // If no match, return as-is (base case).

              const funcName = match[1]; // Function name
              const rawArgs = match[2]; // Raw arguments string

              let parsedArgs = [rawArgs];
              // Only NON terminal functions must be processed in depth
              if (!(lv.terminal_fun.includes(funcName))) {
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
                parsedArgs = args.map(arg => parse(arg));
              }

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

      static sort_by_key(array, key, type = 'string', ascending = true) {
        return array.sort((a, b) => {
          let valA = a[key];
          let valB = b[key];

          // Convert values based on specified type
          if (type === 'number') {
            valA = Number(valA);
            valB = Number(valB);
          } else if (type === 'date') {
            valA = new Date(valA);
            valB = new Date(valB);
          } else {
            valA = String(valA);
            valB = String(valB);
          }

          // Compare values
          if (valA < valB) return ascending ? -1 : 1;
          if (valA > valB) return ascending ? 1 : -1;
          return 0;
        });
      }

      static merge_data(original, update) {
          const originalHeader = original[0];
          const updateHeader = update[0];

          const allHeaders = Array.from(new Set([...originalHeader, ...updateHeader]));
          const headerIndexMap = allHeaders.map(h => ({
            key: h,
            originalIdx: originalHeader.indexOf(h),
            updateIdx: updateHeader.indexOf(h)
          }));

          const mergedRows = [];

          // Add merged header
          mergedRows.push(allHeaders);

          for (let i = 1; i < original.length; i++) {
            const originalRow = original[i];
            const updateRow = update[i];

            const mergedRow = headerIndexMap.map(({ originalIdx, updateIdx }) => {
              if (updateIdx !== -1 && updateRow[updateIdx] !== undefined) {
                return updateRow[updateIdx];
              } else if (originalIdx !== -1 && originalRow[originalIdx] !== undefined) {
                return originalRow[originalIdx];
              } else {
                return null;
              }
            });

            mergedRows.push(mergedRow);
          }

          return mergedRows;
      }

      static obj2matrix(obj) {
        const keys = Object.keys(obj);
        const values = Object.values(obj);

        const maxLen = Math.max(
          ...values.map(v => Array.isArray(v) ? v.length : 1)
        );

        // Normalize values: make all arrays the same length
        const normalized = values.map(value => {
          if (Array.isArray(value)) {
            if (value.length < maxLen) {
              const last = value[value.length - 1];
              return [...value, ...Array(maxLen - value.length).fill(last)];
            }
            return value;
          } else {
            return Array(maxLen).fill(value);
          }
        });

        // Transpose to get row-wise format
        const matrix = Array.from({ length: maxLen }, (_, i) =>
          normalized.map(col => col[i])
        );

        // Prepend header
        matrix.unshift(keys);

        return matrix;
      }

      static matrix2obj(data) {

        let header = this.lucinda_unformat(data).getHeader();
        let rows = this.lucinda_unformat(data).getData();
        return rows.map(row =>
          Object.fromEntries(header.map((key, i) => [key, row[i]]))
        );
      }

      static isobject(val) {
        return val !== null && typeof val === 'object' && !Array.isArray(val);
      }

      static getCol(matrix, headerName) {

          if (!Array.isArray(matrix) || matrix.length === 0) return [];

          const header = matrix[0];
          const colIndex = header.indexOf(headerName);

          if (colIndex === -1) return [headerName]; // return header anyway if not found

          return [headerName, ...matrix.slice(1).map(row => row[colIndex])];
      }

      static arrObj2matrix(header,rows, val_key = undefined){

        let res_normal = [];
        res_normal.push(header);

        if (rows.length > 0) {
            rows.forEach((binding) => {
              let row = [];
              for (let i = 0; i < header.length; i++) {
                let v_binding = binding[header[i]];
                if (v_binding == undefined) {
                  row.push(null);
                }else {
                  if (val_key) {
                    row.push(v_binding[val_key]);
                  }else {
                    row.push(v_binding);
                  }
                }
              }
              res_normal.push(row);
            });
        }
        return res_normal;
      }

      static lucinda_format(val, header = null) {
        let res = [];

        if (typeof val === "string") {
            // Single value string
            res.push(header ? header : [1]);
            res.push([val]);
        } else if (Array.isArray(val) && val.every(item => typeof item === "string")) {
            // Array of strings
            res.push(header ? header : val.map((_, i) => i + 1));
            res.push(val);
        } else if (Array.isArray(val) && val.every(item => Array.isArray(item))) {
            // Array of arrays (matrix)
            res.push(header ? header : val[0].map((_, i) => i + 1));
            res.push(...val);
        } else {
            throw new Error("Unsupported data format for 'val'");
        }

        return res;
    }

      static lucinda_unformat(formatted) {
        if (!Array.isArray(formatted) || formatted.length === 0) {
          return {
            header: [],
            data: [],
            getHeader() {
              return [];
            },
            getData() {
              return [];
            }
          };
        }

        const [header, ...data] = formatted;

        return {
          header: Array.isArray(header) ? header : [],
          data: Array.isArray(data) ? data : [],
          getHeader() {
            return Array.isArray(header) ? header : [];
          },
          getData() {
            return Array.isArray(data) && data.length > 0 ? data : [];
          }
        };
      }

}

class Lucinda_view {

  constructor(data) {
    this.data = data;
    this.pending_html = {};

    // Terminal functions are functions that:
    // > Cannot take other functions as arguments
    // > Can take only one argument
    // > Have only arguments ready (already with values)
    this.terminal_fun = [
      "htmlcontent",
      "fun_",
      "data_"
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
          params_not_ready = params_not_ready.concat( this.is_ready(a_param["fun"], a_param["param"]) );
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

    let l_res = {};

    const l_vars = _path.split(";").map(s => s.trim());
    for (let i = 0; i < l_vars.length; i++) {
      let a_var = l_vars[i];
      l_res[a_var] = [];

      const keys = a_var.split('.');
      let current = this.data;
      for (const key of keys) {
        if (current[key] === undefined) {
          if (Array.isArray(current)) {
            if (current.length > 0) {
              current = Lucinda_util.getCol(current,key);
              current = current.slice(1);
              break;
            }
          }else {
            if (!(Lucinda_util.isobject(current))) {
              break;
            }else {
                return undefined;
            }
          }
        }else {
          current = current[key];
        }
      }
      l_res[a_var] = current;
    }

    let f_res = Lucinda_util.obj2matrix(l_res);

    // let f_res_header = f_res[0];
    // let f_res_body = f_res.slice(1);
    // return [f_res_header,f_res_body];
    return f_res;
  }

  /*sets a new <k> in <this.data> with a corresponding value <v>*/
  set_new_data_entry(k, v) {
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
        let var_value = lv_instance.get_nested_value(variable);
        var_value = this.val_(var_value);
        const eval_opr = ___evaluate_opr(var_value, operator, value);
        return eval_opr;
      }
      return match; // Keep parentheses and logical operators
    });
    return eval(parsedExpression);

    function ___evaluate_opr(var_value, operator, value) {
      let val = undefined;
      if (value == "null") {
        val = null;
      }else {
        let val = isNaN(parseFloat(value)) ? String(value) : parseFloat(value);
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

  gen_dom_id(t){
    return t +"_"+ document.getElementsByTagName(t).length + 1;
  }




  /** VIEW FUNCTIONS
  * the data param has two parts 0:header, 1:body
  */

  /*Terminal function view*/
  htmlcontent(...args){
    try {
      return args.join("");
    } catch (e) {
      return "";
    }
  }

  /*Terminal function view*/
  fun_(...args) {
    try {
      if (args[0].includes("(")) {
        return args[0].split("(")[0];
      }
      return args[0];
    } catch (e) {
      return "";
    }
  }

  data_(...args) {
    try {
      let d_val = eval('(' + args[0] + ')');
      return d_val;
    } catch (e) {
      return "";
    }
  }

  /*Returns just the text*/
  val_(...args){
    try {
      let data = Lucinda_util.lucinda_unformat(args[0]).getData();

      if (data.length == 1) {
        return data[0].join(" ");
      }

      if (data.length > 1) {
        let res = [];
        for (let i = 0; i < data.length; i++) {
          res.push(data[i].join(" "));
        }
        return res.join(" ");
      }
      return "";
    } catch (e) {
      return "";
    }
  }

  /*Build link*/
  alink(...args){
    try {
      let data = Lucinda_util.lucinda_unformat(args[0]).getData();
      if (data.length > 0) {
        let e = data[0][0];
        let e_link = data[0][1];
        return "<a href='"+e_link+"'>"+e+"</a>"
      }
      return "";
    } catch (e) {
      return "<span class='lucinda-view-err'>Error!</span>";
    }
  }

  /*takes only one arg = data
  and returns the length of the data*/
  llength(...args){
    let data = Lucinda_util.lucinda_unformat(args[0]).getData();
    return data.length;
  }

  concat(...args){
    try {
      return args.join("");
    } catch (e) {
      return "";
    }
  }

  /**/
  styleHTML(...args){
    try {
      let html_content = args[0];
      let html_style_f = args[1];
      const parser = new DOMParser();
      const html_obj = parser.parseFromString(html_content, 'text/html');
      let new_html_obj = this[html_style_f](html_obj);
      return new_html_obj.body.innerHTML;
    } catch (e) {
      console.log(e);
      return "<span class='lucinda-view-err'>Error!</span>";
    }
  }

  itemlist(...args){

      let dataList = Lucinda_util.matrix2obj(args[0]);

      let row_id = args[1]
      let keyList = args[2];

      let maxRowsPerPage = 20;
      if (args.length > 3) {
        if (args[2]) {
          maxRowsPerPage = args[3];
        }
      }

      let addheader = false;
      if (args.length > 4) {
        if (args[3]) {
          addheader = args[4];
        }
      }

      let style_display = "";

      if (args.length > 5) {
        if (args[5]) {
          const sort = args[5];
          dataList = Lucinda_util.sort_by_key(dataList, sort[0], sort[1], sort[2]);
        }
      }

      const table_container_id = this.gen_dom_id("itemlist");
      let html = `<div class="itemlist-container" id="${table_container_id}">`;
      for (const item of dataList) {
        let data_att = [];
        let html_tds = "";
        for (const key of keyList) {
          data_att.push(`data-${key}="${item[key]}"`);
          html_tds += `<div class="itemlist-att" data-att="${key}" style="${style_display}" > ${item[key] !== undefined ? `<div class="itemlist-att-title">${key}:</div>`+item[key] : ''}</div>`;
        }

        html += `<div class="itemlist-item" id="${item[row_id]}" ${data_att.join(" ")} >${html_tds}</div>`;
      }
      html += '</div>';

      return html;
  }

  /*args[0] Lucinda data frame*/
  /*args[1] Lucinda function*/
  /*args[2] Lucinda data = <string> */
  doforeach(...args){
    try {

      let res = [];

      let header = Lucinda_util.lucinda_unformat(args[0]).getHeader();
      let data = Lucinda_util.lucinda_unformat(args[0]).getData();
      let lv_fun = args[1];
      let splitter = args[2];

      for (let i = 0; i < data.length; i++) {
        let values = [header]
        values.push(data[i]);
        let htmlrow = this[lv_fun](values);
        res.push(htmlrow);
      }

      return res.join(splitter);
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
      verbose: false,

      endpoint: [
          {
            id: "*",
            requests: {
              get: {
                query_preprocess: "encodeURIComponent",
                url_param: "?query=[[sparql]]&format=json",
                args:{
                  headers:{
                    "Accept": "application/sparql-results+json"
                  },
                  method: "GET"
                },
                success_controller: "reqhandler_spqrqljson"
              },
              post: {
                args:{
                  headers:{
                    "Accept": "application/json",
                    "Content-Type": "application/sparql-query"
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
    static lv = new Lucinda_view( {} );

    static init(_conf) {
      for (const _k in _conf) {
        if (Lucinda.conf.hasOwnProperty(_k)) {
          Lucinda.conf[_k] = _conf[_k];
        }
      }
    }

    static get_request_conf(endpoint, method) {
      let endpoint_conf = Lucinda.conf.endpoint.find((item) => item.id === endpoint);
      if (!(endpoint_conf)) {
        endpoint_conf = Lucinda.conf.endpoint.find((item) => item.id === "*");
      }

      return endpoint_conf.requests[method];
    }

    static build_request(req_conf, endpoint, method, sparql_query){

      // build query and call query_preprocess if in conf
      let _query = sparql_query;
      if ("query_preprocess" in req_conf) {
        _query = window[req_conf["query_preprocess"]](_query);
      }

      let url_query = "";
      if ("url_param" in req_conf) {
        url_query = req_conf["url_param"].replace(/\[\[sparql\]\]/, _query);
      }
      const endpoint_call = endpoint+url_query;
      const args = req_conf.args
      if (method == "post") {
        args["body"] = _query;
      }

      return {
        "call": endpoint_call,
        "args": args
      };
    }

    static run( c = 0, templates = {} ) {

      // before starting add a loading banner in __lucinda__
      Lucinda.add_main_loading_banner();

      // when all templates have been scanned, work on the suitable potential templates
      if (c >= Lucinda.conf.templates.length) {

        const potential_templates = _get_potential_templates(templates);
        if(Lucinda.conf.verbose){console.log("The potential templates are:",potential_templates);}

        _set_template(potential_templates);
        if(Lucinda.conf.verbose){console.log("The selected template is:",Lucinda.current_resource);}

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

        if (c == potential_templates.length) {
          Lucinda.build_error_html_page("No template is suitable for the corresponding resource!");
          return null;
        }

        if (c <= potential_templates.length - 1) {

          const pa = potential_templates[c];
          const main_block = pa.hfconf[0];

          if (c == potential_templates.length - 1) {
            if (!("sparql" in main_block)) {
              return __template_found(pa);
            }
          }

          if (!("sparql" in main_block)) {
            return __template_found(pa);
          }else {
            if (Lucinda.conf.local_test) {
              if (Math.random() < 0.5){
                return __template_found(pa);
              }else {
                return _set_template(potential_templates, c + 1);
              }
            }else {
              /*ASK Sparql*/
              let preprocessed_param = Lucinda.preprocess( main_block, pa.param );
              let query = Lucinda_util.replace_placeholders(main_block.sparql, preprocessed_param);
              let req_conf = Lucinda.get_request_conf(main_block.endpoint, "get");
              let ask_call = Lucinda.build_request(req_conf, main_block.endpoint, "get", query);

              if(Lucinda.conf.verbose){console.log("Ask call:",ask_call);}
              fetch(ask_call.call, ask_call.args)
                .then(response => {return response.json();})
                .then(data => {
                  if(Lucinda.conf.verbose){console.log("Ask result is:",data);}
                  if (data.boolean === true) {
                    return __template_found(pa);
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
          // add the main params to Lucinda.data
          Lucinda.data["main"] = {};
          Object.assign(Lucinda.data.main, _pa.param);
          return _do_queries();
        }

      }
      function _do_queries( ) {

        const current_resource_hfconf = Lucinda.current_resource["hfconf"];
        if (current_resource_hfconf.length <= 1) {
          if(Lucinda.conf.verbose){console.log("Warning: no queries are specified");}
          return null;
        }

        for (let i = 1; i < current_resource_hfconf.length; i++) {
          const cr_query_block = current_resource_hfconf[i];
          if (cr_query_block.id == undefined) {
            if(Lucinda.conf.verbose){console.log("Error: id field must be specified to define a query");}
            return null;
          }
          Lucinda.data[cr_query_block.id] = undefined;
        }

        for (let i = 1; i < current_resource_hfconf.length; i++) {
            const cr_query_block = current_resource_hfconf[i];
            if ( (cr_query_block.id == undefined) || (cr_query_block.endpoint == undefined) || (cr_query_block.sparql == undefined) || (cr_query_block.method == undefined) ) {
              if(Lucinda.conf.verbose){console.log("Error: some mandatory fields (id, endpoint, sparql, method) are not defined");}
              return null;
            }

            Lucinda.query_endpoint( cr_query_block );

        }

      }
    }

    static query_endpoint( cr_query_block ) {

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
        Lucinda.data[cr_query_block.id] = Lucinda.postprocess(data, cr_query_block);
        if (Object.values(Lucinda.data).every(value => value !== undefined)) {
          Lucinda.build_success_html_page();
        }

      }else {

        let preprocessed_param = Lucinda.preprocess( cr_query_block, Lucinda.current_resource.param );
        let query = Lucinda_util.replace_placeholders(cr_query_block.sparql, preprocessed_param);
        let req_conf = Lucinda.get_request_conf(cr_query_block.endpoint, cr_query_block.method);
        let query_call = Lucinda.build_request(req_conf, cr_query_block.endpoint, cr_query_block.method, query);

        if(Lucinda.conf.verbose){console.log("Query call:",query_call);}
        fetch(query_call.call,query_call.args)
          .then(response => response.json())
          .then(data => {
            if(Lucinda.conf.verbose){console.log('data retrieved from endpoint:', data);}
            const fun_success_controller = req_conf.success_controller;
            let res_normal = Lucinda[fun_success_controller](data);

            if (res_normal == null) {
              Lucinda.build_error_html_page();
            }else {
              Lucinda.data[cr_query_block.id] = res_normal;
              if(res_normal.length > 0){
                  Lucinda.data[cr_query_block.id] = Lucinda.postprocess(res_normal, cr_query_block);
              }

              // when all pending queries are done build the HTML page
              if (Object.values(Lucinda.data).every(value => value !== undefined)) {
                Lucinda.build_success_html_page();
              }
            }
          })
          .catch(error => {
            if(Lucinda.conf.verbose){console.error('Error:', error);}
            Lucinda.build_error_html_page();
          });
      }
    }

    static preprocess( conf_block, param ) {

      if (!("preprocess" in conf_block)) {
        return param;
      }

      const f_call = conf_block["preprocess"];
      const match = f_call.match(/^(\w+)\((.*?)\)$/);
      if (!match) {
        throw new Error(`Invalid function call syntax in HF file: ${f_call}`);
      }

      const [_, functionName, args] = match;
      if (typeof window[functionName] !== 'function') {
          throw new Error(`Preprocess function not found: ${functionName}`);
      }

      // Process the arguments using `param` for mapping
      const keys = args
        .split(',')
        .map(arg => arg.trim())
        .filter(arg => arg !== "");

      const values = keys.map(key => {
        const value = param[key];
        if (value === undefined) return key;
        return Array.isArray(value) ? value[0] : value;
      });

      var newValues = window[functionName](...values);

      let newValues_obj = {};
      if (Array.isArray(newValues) && newValues != null) {

        for (let i = 0; i < keys.length; i++) {
          newValues_obj[keys[i]] = newValues[i];
        }

        for (const k in param) {
          if (k in newValues_obj) {
            param[k] = newValues_obj[k];
          }
        }
      }

      return param;
    }

    static postprocess(data, conf_block) {

      if (!("postprocess" in conf_block)) {
        return data;
      }

      const f_call = conf_block["postprocess"];
      const match = f_call.match(/^(\w+)\((.*?)\)$/);
      if (!match) {
        throw new Error(`Invalid function call syntax in HF file: ${f_call}`);
      }

      const [_, functionName, args] = match;
      if (typeof window[functionName] !== 'function') {
        throw new Error(`Postprocess function not found: ${functionName}`);
      }

      // Process the arguments using `param` for mapping
      const wanted_keys = args
        .split(',')
        .map(arg => arg.trim())
        .filter(arg => arg !== "");

      const header = data[0];

      // Map each key to its index in the header or -1 if not found
      const indices = wanted_keys.map(key => {
        const idx = header.indexOf(key);
        return idx !== -1 ? idx : null;
      });

      // Build new rows with correct values or nulls for missing columns
      // slice the header
      const filtered_rows = data.slice(1).map(row =>
        indices.map(i => (i !== null ? row[i] : null))
      );
      let values = [wanted_keys, ...filtered_rows];
      var post_data = window[functionName]( values );
      let new_data = Lucinda_util.merge_data(
        data,
        post_data
      );

      console.log(new_data);
      return new_data;
    }

    static build_success_html_page(){
      if(Lucinda.conf.verbose){console.log("Building HTML success page! with data = ",Lucinda.data);}

      Lucinda.lv = new Lucinda_view( Lucinda.data );
      const template = Lucinda.current_resource.template;
      fetch(Lucinda.conf.templates_url+template+`.html?rand=${Math.random()}`)
          .then(response => response.text())
          .then(html_content => {
            const fields = Lucinda_util.extract_lucinda_placeholders(html_content,Lucinda.lv);

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
                  html_index[placeholder] = "<span class='lucinda-pendinghtml-"+uniqueid+" loading-dots'><span>.</span><span>.</span><span>.</span> </span>";
                  Lucinda.lv.set_new_pending_html_entry( placeholder , params_not_ready );
                }
              }
            }

            // ---
            const html_body = Lucinda_util.replace_lucinda_placeholders(html_index, html_content);
            document.getElementById('__lucinda__').innerHTML = html_body;
            Lucinda.run_extdata();
          })
          .catch(error => {console.error('Error loading the HTML file:', error);});
    }

    static build_extdata_view(...args){

      var extdata_id = args[2];
      const data = args[3];

      Lucinda.lv.set_new_data_entry(extdata_id,data);

      const html_ready_placeholders = Lucinda.lv.check_pending_html();

      for (let i = 0; i < html_ready_placeholders.length; i++) {
        const fields = Lucinda_util.extract_lucinda_placeholders(html_ready_placeholders[i],Lucinda.lv);
        for (const placeholder in fields) {
          const fun = fields[placeholder]["fun"];
          const param = fields[placeholder]["param"];
          const view = Lucinda.lv.genval(fun,param);

          const uniqueid = Lucinda_util.create_unique_id(placeholder);
          //const loading_placeholder = document.getElementsByClassName('lucinda-pendinghtml-'+uniqueid);
          const loading_placeholder = document.querySelectorAll(`.lucinda-pendinghtml-${uniqueid}`);
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
          // call the
          _call_extfun(field_id, ext_fun);
        }
      }

      function _call_extfun(field_id, ext_fun) {
        const match = ext_fun.match(/^(\w+)\((.*?)\)$/);
        if (!match) {
          throw new Error(`Invalid external function call syntax: ${ext_fun}`);
        }

        const [_, functionName, args] = match;
        if (typeof window[functionName] !== 'function') {
            throw new Error(`Postprocess function not found: ${functionName}`);
        }

        // Process the arguments using `param` for mapping
        const wanted_keys = args
          .split(',')
          .map(arg => arg.trim())
          .filter(arg => arg !== "");

        const header = wanted_keys;
        let fres = [];
        fres.push(header);

        let _ext_args = {};
        let l_args = args.split(",");
        for (const _k in Lucinda.data[main_block["id"]]) {
          const main_att = _k.trim();
          let arg_val = Lucinda.data[main_block["id"]][main_att];
          if ((arg_val != undefined) && (arg_val != null))  {
            _ext_args[main_att] = arg_val;
          }
        }

        // Call the function with field_id
        return window[functionName](fres,_ext_args,field_id);

      }
    }

    static build_error_html_page(s = "Error while loading the desired resource!"){
      if(Lucinda.conf.verbose){console.log("Building HTML error page!")};
      if (Lucinda.conf.html_error_template != null) {
        fetch(Lucinda.conf.templates_url+Lucinda.conf.html_error_template+`.html?rand=${Math.random()}`)
            .then(response => response.text())
            .then(html_content => {
              document.getElementById('__lucinda__').innerHTML = html_content;
            })
            .catch(error => {console.error('Error loading the HTML file:', error);});

      }else {
          document.getElementById('__lucinda__').innerHTML = "<html><head></head><body><h3 class='lucinda-error-msg'>"+s+"</h3></body></html>";
      }
    }

    static add_main_loading_banner(){
      document.getElementById('__lucinda__').innerHTML = "<div id='lucinda_pendinghtml_main_loading'>Loading the resource<br><span class='loading-dots'><span>.</span><span>.</span><span>.</span> </span></div>";
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
    static add_endpoint_handler(endpoint_conf) {
      Lucinda.conf.endpoint.push(endpoint_conf);
    }

    static reqhandler_spqrqljson(data){
      return Lucinda_util.arrObj2matrix(
        data.head.vars,
        data.results.bindings,
        "value"
      );
    }


}
