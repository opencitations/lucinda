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
                    currentBlock[key] = value;
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
  }

  /*returns true if <arg> is already in <this.data>*/
  is_ready(arg){
    return arg in this.data;
  }

  /*sets a new <k> in <this.data> with a corresponding value <v>*/
  set_new_data_entry(k,v){
    this.data[k] = v;
  }


  /** VIEW FUNCTIONS
  * each function takes only one @param:
  * <args>: a list of keys that are inside <this.data>
  */

  /*Returns just the text*/
  text(...args){
    try {
      var text = [];
      for (let i = 0; i < args.length; i++) {
        text.push(this.data[args[i]]);
      }
      return text.join(", ");
    } catch (e) {
      return "";
    }
  }

}


class Lucinda {
    static conf = {
      url_base: "/",
      templates: [],
      addon: null,
      html_error: null,
      local_test: false
    }
    static current_resource = [];
    static lv = null;

    static init(_conf) {
      for (const _k in _conf) {
        if (Lucinda.conf.hasOwnProperty(_k)) {
          Lucinda.conf[_k] = _conf[_k];
        }
      }
    }

    static run( c = 0, templates = {} ) {
      if (c >= Lucinda.conf.templates.length) {
        const potential_templates = _get_potential_templates(templates);
        console.log(potential_templates);
        Lucinda.current_resource = _set_template(potential_templates);
        Lucinda.query_endpoint();
        return true;
      }

      const k_template = Lucinda.conf.templates[c];
      fetch(Lucinda.conf.url_base + k_template + '.hf')
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
          const href_path = window.location.href;
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

        const pa = potential_templates[i];
        if (c == potential_templates.length - 1) {
          return pa;
        }

        if (c < potential_templates.length - 1) {
          if (!("sparql" in pa.hfconf[0])) {
            return pa;
          }else {
            /*ASK Sparql*/
            // const endpoint_call = pa.hfconf[0]["endpoint"]+pa.hfconf[0]["sparql"];
            // fetch(endpoint_call)
            //   .then(response => response.json())
            //   .then(data => {
            //     /*if true stop and return pa*/
            //     /*else: _set_template(potential_templates, c + 1)*/
            //   })
          }
        }
      }
    }

    static query_endpoint() {

      _preprocess()

      const endpoint = Lucinda.current_resource.hfconf.endpoint;
      if (endpoint == undefined) {
        return null;
      }

      const method = Lucinda.current_resource.hfconf.method;
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


      if (Lucinda.conf.local_test) {
        const data = [
            {
                "id": "doi:10.1007/978-1-4020-9632-7 isbn:9781402096327 isbn:9789048127108 openalex:W4249829199 omid:br/0612058700",
                "title": "Adaptive Environmental Management",
                "pub_date": "2009"
            }
        ]
        var postprocess_data = _postprocess(data);
        Lucinda.build_success_html_page(postprocess_data);

      }else {
        fetch(endpoint_call,args)
          .then(response => response.json())
          .then(data => {
            // +++ POSTPROCESS OPERATION
            _postprocess(data);
            Lucinda.build_success_html_page(data);
          })
          .catch(error => {
            console.error('Error:', error);
            Lucinda.build_error_html_page();
          });
      }

      function _preprocess() {

        const hfconf = Lucinda.current_resource.hfconf;
        const param = Lucinda.current_resource.param;
        if (!("preprocess" in hfconf)) {
          return false;
        }

        const f_call = hfconf["preprocess"];
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

      function _postprocess(data) {
        const hfconf = Lucinda.current_resource.hfconf;
        if (!("postprocess" in hfconf)) {
          return false;
        }

        const f_call = hfconf["postprocess"];
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

    static build_success_html_page(data){
      console.log("Building HTML success page!");

      Lucinda.lv = new Lucinda_view(data);
      const template = Lucinda.current_resource.template;
      fetch(Lucinda.conf.url_base+template+'.html?t='+Date.now())
          .then(response => response.text())
          .then(html_content => {
            const fields = Lucinda_util.extract_lucinda_placeholders(html_content);
            // apply Lucinda view
            var html_index  = {};
            var async_extdata = {};
            if (fields) {
              for (const placeholder in fields) {
                const type = fields[placeholder]["type"];
                const value = fields[placeholder]["value"];
                if (Lucinda.lv.is_ready(value)) {
                  html_index[placeholder] = Lucinda.lv[type](value);
                }else {
                  html_index[placeholder] = "<span id='lucinda_extdata"+value+"' class='loading-dots'><span>.</span><span>.</span><span>.</span></span>";
                  async_extdata[value] = {"placeholder":placeholder,"type":type};
                }
              }
            }
            // ---
            const html_body = Lucinda_util.replace_lucinda_placeholders(html_index, html_content);
            document.getElementById('__lucinda__').innerHTML = html_body;
            Lucinda.run_extdata( data,async_extdata );
          })
          .catch(error => {console.error('Error loading the HTML file:', error);});
    }

    static build_async_html(...args){
      const value = args[0];
      const id = args[1];
      const type = args[2];
      const palceholder = args[3];
      Lucinda.lv.set_new_data_entry(id,value);
      const view = Lucinda.lv[type](id);
      const loading_placeholder = document.getElementById('lucinda_extdata'+id);
      loading_placeholder.parentNode.replaceChild( document.createTextNode(view), loading_placeholder );
    }

    static run_extdata(data,async_extdata){
      const hfconf = Lucinda.current_resource.hfconf;
      if ("extdata" in hfconf) {
        for (const data_id in hfconf["extdata"]) {
          if (data_id in async_extdata) {
            const placeholder = async_extdata[data_id]["placeholder"];
            const type = async_extdata[data_id]["type"];
            const data_extfun = _extfun(hfconf["extdata"][data_id]);
            window[data_extfun](data, Lucinda.build_async_html, data_id, type, placeholder );
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
