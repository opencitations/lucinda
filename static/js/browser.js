
var browser = (function () {

		var resource = null;
		var resource_res = null;
		var browser_conf_json = {};
		var oscar_data = {};
		var pending_oscar_calls = 0;
		var oscar_content = null;
		var ext_data = {};

		/*it's a document or an author*/
		function _get_category(resource_text) {

			for (var key_cat in browser_conf_json.categories) {
				if (browser_conf_json.categories.hasOwnProperty(key_cat)) {
					var re = new RegExp(browser_conf_json.categories[key_cat]["rule"]);
					if (resource_text.match(re)) {return key_cat;}
				}
			}
			return -1;
		}

		/*build a string with all the prefixes in a turtle format*/
		function _build_turtle_prefixes(){
			var turtle_prefixes = "";
			for (var i = 0; i < browser_conf_json.prefixes.length; i++) {
				var pref_elem = browser_conf_json.prefixes[i];
				turtle_prefixes = turtle_prefixes+" "+"PREFIX "+pref_elem["prefix"]+":<"+pref_elem["iri"]+"> ";
			}
			return turtle_prefixes;
		}

		/*build a string representing the sparql query in a turtle format*/
		function _build_turtle_query(arr_query){
			var turtle_prefixes = "";
			for (var i = 0; i < arr_query.length; i++) {
				turtle_prefixes = turtle_prefixes +" "+ arr_query[i];
			}
			return turtle_prefixes;
		}

		/*THE MAIN FUNCTION CALL
		call the sparql endpoint and do the query*/
		function do_sparql_query(resource_iri){


			//console.log(resource_iri);
			//var header_container = document.getElementById("browser_header");

			if (resource_iri != "") {

				resource = "https://w3id.org/oc"+"/corpus/"+resource_iri;

				//initialize and get the browser_config_json
				browser_conf_json = browser_conf;

				var category = _get_category(resource);

				//build the sparql query in turtle format
				var sparql_query = _build_turtle_prefixes() + _build_turtle_query(browser_conf_json.categories[category].query);
				//since its a resource iri we put it between < >
				var global_r = new RegExp("<VAR>", "g");
				sparql_query = sparql_query.replace(global_r, "<"+resource+">");
				//console.log(sparql_query);

				//use this url to contact the sparql_endpoint triple store
				var query_contact_tp =  String(browser_conf_json.sparql_endpoint)+"?query="+ encodeURIComponent(sparql_query) +"&format=json";

				//call the sparql end point and retrieve results in json format
				$.ajax({
			        dataType: "json",
			        url: query_contact_tp,
							type: 'GET',
	    				success: function( res_data ) {
									//console.log(res_data);
									_build_page(res_data, category);
	    				}
			   });
			 }
		}

		function build_extra_sec(data_obj, category){
			browser_conf_json = browser_conf;
			//console.log(browser_conf_json);
			var contents = browser_conf_json.categories[category]["contents"];

			for (var key_extra in contents.extra) {
				var extra_comp = contents.extra[key_extra];
				switch (key_extra) {
					case "browser_view_switch":
						var flag = true;
						for (var i = 0; i < extra_comp.values.length; i++) {
							var sparql_query = _build_turtle_query(extra_comp.query[i]);
							sparql_query = sparql_query.replace(/\[\[VAR\]\]/g, data_obj[extra_comp.values[i]].value);
							//console.log(sparql_query);
							var query_contact_tp =  String(browser_conf_json.sparql_endpoint)+"?query="+ encodeURIComponent(sparql_query) +"&format=json";
							$.ajax({
						        dataType: "json",
						        url: query_contact_tp,
										async: false,
										type: 'GET',
				    				success: function( res_data ) {
												//console.log(res_data);
												if (res_data.results.bindings.length == 0) {
													flag = false;
												}
				    				}
						   });
						 }

						 if (flag) {
							 b_htmldom.build_extra_comp(data_obj, contents, null, key_extra);
						 }
						break;
				}
			}
		}

		function _build_page(res_data, category){
			var group_by = browser_conf_json.categories[category]["group_by"];
			var links = browser_conf_json.categories[category]["links"];
			var none_values = browser_conf_json.categories[category]["none_values"];
			var text_mapping = browser_conf_json.categories[category]["text_mapping"];
			var ext_data_obj = browser_conf_json.categories[category]["ext_data"];

			var data_none_vals = _init_none_vals(res_data.results.bindings, none_values);
			//console.log(data_none_vals);
			var data_with_links = _init_uris(data_none_vals, links);
			var data_grouped = b_util.group_by(data_with_links, group_by);
			var one_result = data_grouped[0];
			one_result = b_util.text_mapping(one_result, text_mapping);
			resource_res = JSON.parse(JSON.stringify(one_result));
			_exec_ext_data(one_result, ext_data_obj);
			//console.log(ext_data);
			//console.log(JSON.parse(JSON.stringify(data_grouped)));

			var contents = browser_conf_json.categories[category]["contents"];
			oscar_content = contents["oscar"];

			b_htmldom.build_body(one_result,contents );

			_execute_oscar(one_result,contents);

			//b_htmldom.build_oscar(one_result,contents );

			//console.log(document.getElementById("browser"));

			//search.do_sparql_query("search?text="+one_result[oscar_tab["query_text"]].value+"&rule="+oscar_tab["rule"], config_mod);


		}

		function _execute_oscar(one_result,contents) {
			var oscar_content = contents['oscar'];
			if (oscar_content != undefined) {
				pending_oscar_calls = oscar_content.length;
				for (var i = 0; i < oscar_content.length; i++) {
					var oscar_entry = oscar_content[i];
					call_oscar(one_result[oscar_entry.query_text].value, oscar_entry["rule"]);
				}
			}
		}

		function get_ext_data() {
			return ext_data;
		}

		/*retrieve the externa data*/
		function _exec_ext_data(obj_vals, ext_data_obj){
			//console.log(ext_data_obj,obj_vals);
			if (ext_data_obj != undefined) {
				for (var key in ext_data_obj) {

					var res = -1;
					var func_obj = ext_data_obj[key];
					//my func name
					var func_name = func_obj['name'];

					//my func params
					var func_param = []
					var func_param_fields = func_obj['param']['fields'];
					var func_param_values = func_obj['param']['values'];
					for (var j = 0; j < func_param_fields.length; j++) {
						var p_field = func_param_fields[j];
						if ( p_field == "FREE-TEXT"){
							func_param.push(func_param_values[j]);
						}else {
							if (obj_vals.hasOwnProperty(p_field)) {
								if (! b_util.is_undefined_key(func_obj,"concat_style."+String(p_field))) {
										func_param.push(b_util.build_str(p_field, obj_vals[p_field],func_obj.concat_style[p_field], include_link= false));
								}else {
										func_param.push(b_util.build_str(p_field, obj_vals[p_field],null, include_link= false));
								}
							}
						}
					}
					res = Reflect.apply(func_name,undefined,func_param);
					ext_data[key] = res;
				}
			}
		}

		/*map the fields with their corresponding links*/
		function _init_uris(data, links){
			var new_data = data;
			for (var i = 0; i < new_data.length; i++) {
				var obj_elem = new_data[i];
				for (var key_field in obj_elem) {
					if (obj_elem.hasOwnProperty(key_field)) {
						new_data[i] = _get_uri(new_data[i], key_field, links);
					}
				}
			}
			return new_data;

			function _get_uri(elem_obj, field, links){
				var new_elem_obj = elem_obj;
				var uri = null;
				if (links.hasOwnProperty(field)){
						var link_obj = links[field];
						if (link_obj.hasOwnProperty("field")) {
							if ((link_obj.field != null) && (link_obj.field != "")) {
								// I have field to link to

								if (elem_obj.hasOwnProperty(link_obj.field)) {
									uri = elem_obj[link_obj.field].value;
									if (link_obj.hasOwnProperty("prefix")) {
										uri = String(link_obj.prefix) + uri;
									}
									new_elem_obj[field]["uri"] = uri;
								}
							}
						}
					}
					return new_elem_obj;
				}
			}

		/*handle the none values for the fields */
		function _init_none_vals(data, none_vals_obj){
			var new_data = data;

			for (var key_field in none_vals_obj) {
				for (var i = 0; i < new_data.length; i++) {
					var obj_elem = new_data[i];
					if (!obj_elem.hasOwnProperty(key_field)) {
						obj_elem[key_field] = {"value": none_vals_obj[key_field]};
					}
				}
			}

			return new_data;
		}

		function call_oscar(query,rule){
				var oscar_key = 'search?text='+query+'&rule='+rule;

				if (!(oscar_key in oscar_data)) {
					var config_mod = [
							//{"key":"progress_loader.title" ,"value":"Searching ..."},
							{"key":"progress_loader.title" ,"value":""},
							{"key":"progress_loader.subtitle" ,"value":""},
							{"key":"progress_loader.abort.title" ,"value":""}
					];
					search.do_sparql_query(oscar_key, config_mod, true, browser.assign_oscar_results);
				}else {
					//don't call again sparql
					search.build_table(oscar_data[oscar_key]);
				}
		}

		function assign_oscar_results(oscar_key, results){

			pending_oscar_calls = pending_oscar_calls - 1;

			if (results.results.bindings.length == 0) {
				//get rule key from regex
				var rule_key = "";
				reg = /rule=(.+?)(?=&bc|$)/g;
				if (match = reg.exec(oscar_key)) {
					rule_key = match[1];
				}

				var index_oscar_obj = b_util.index_in_arrjsons(oscar_content,["rule"],[rule_key]);
				if (index_oscar_obj != -1) {
					oscar_content.splice(index_oscar_obj, 1);
				}
			}else {
				oscar_data[oscar_key] = results;
			}

			if (pending_oscar_calls == 0) {
				//console.log(oscar_data, oscar_content);
				//build oscar menu
				b_htmldom.build_oscar(resource_res, {"oscar": oscar_content});
			}
		}

		return {
				assign_oscar_results: assign_oscar_results,
				call_oscar : call_oscar,
				build_extra_sec: build_extra_sec,
				do_sparql_query: do_sparql_query,
				get_ext_data: get_ext_data
		 }
})();


var b_util = (function () {

	/*get the value of obj[key]
	key is a string with inner keys also
	return -1 if there is no key*/
	function get_obj_key_val(obj,key){
		if (!is_undefined_key(obj,key)) {
			return _obj_composed_key_val(obj,key);
		}else {
			return -1;
		}

		function _obj_composed_key_val(obj,key_str) {
			var arr_key = key_str.split(".");
			var inner_val = obj;
			for (var i = 0; i < arr_key.length; i++) {
				inner_val = inner_val[arr_key[i]];
			}
			return inner_val;
		}
	}

	function text_mapping(obj, conf_obj) {
		if (conf_obj != undefined) {
			for (var key_field in obj) {
				if (conf_obj.hasOwnProperty(key_field)) {

					var arr_vals = obj[key_field].value;
					if (obj[key_field].hasOwnProperty("concat-list")) {
						arr_vals = obj[key_field]["concat-list"];
					}

					for (var j = 0; j < arr_vals.length; j++) {
						for (var i = 0; i < conf_obj[key_field].length; i++) {
							var rule_entry = conf_obj[key_field][i];
							if (rule_entry.hasOwnProperty("regex")) {
								var new_val = arr_vals[j].value.replace(rule_entry.regex,rule_entry.value);
								arr_vals[j].value = new_val;
							}
						}
					}
				}
			}
		}
		return obj;
	}

		/**
	 * Returns true if key is not a key in object or object[key] has
	 * value undefined. If key is a dot-delimited string of key names,
	 * object and its sub-objects are checked recursively.
	 */
	function is_undefined_key(object, key) {
		var keyChain = Array.isArray(key) ? key : key.split('.'),
				objectHasKey = keyChain[0] in object,
				keyHasValue = typeof object[keyChain[0]] !== 'undefined';

		if (objectHasKey && keyHasValue) {
				if (keyChain.length > 1) {
						return is_undefined_key(object[keyChain[0]], keyChain.slice(1));
				}

				return false;
		}
		else {
				return true;
		}
	}

	/*get index of obj from 'arr_objs' where
	obj['key'] (or an array of multi keys) equals val
	(or an array of multi values), it returns -1 in
	case there is no object*/
	function index_in_arrjsons(arr_objs, keys, vals){

		for (var i = 0; i < arr_objs.length; i++) {
			var elem_obj = arr_objs[i];
			var flag = true;

			for (var j = 0; j < keys.length; j++) {
				if (elem_obj.hasOwnProperty(keys[j])) {
					if (elem_obj[keys[j]].hasOwnProperty("value")) {
						flag = flag && (elem_obj[keys[j]].value == vals[j]);
					}else{
						flag = flag && (elem_obj[keys[j]] == vals[j]);
					}
				}else {
					flag = false;
				}
			}

			if (flag) {
				return i;
			}
		}
		return -1;
	}

	/*group by the 'arr_objs' with distinct 'keys' and by concatinating
	the fields in 'arr_fields_concat'*/
	function group_by(arr_objs, params){
		var keys = params.keys;
		var arr_fields_concat = params.concats;

		if((keys != undefined) && (arr_fields_concat != undefined)){
			var new_arr = [];
				for (var i = 0; i < arr_objs.length; i++) {

					var obj_values = collect_values(arr_objs[i], keys);
					var values = [];
					for (var k = 0; k < keys.length; k++) {
						values.push(obj_values[keys[k]].value);
					}

					var index = index_in_arrjsons(new_arr, keys, values);
					if (index == -1) {
						for (var j = 0; j < arr_fields_concat.length; j++) {
							var elem = arr_objs[i];
							if (arr_objs[i].hasOwnProperty(arr_fields_concat[j])) {
								elem[arr_fields_concat[j]] = {"concat-list": [elem[arr_fields_concat[j]]]};
							}
							new_arr.push(elem);
						}
					}else {
						for (var j = 0; j < arr_fields_concat.length; j++) {
							if (arr_objs[i].hasOwnProperty(arr_fields_concat[j])) {
								var elem = arr_objs[i][arr_fields_concat[j]];

								var index_concat_list = index_in_arrjsons(new_arr[index][arr_fields_concat[j]]["concat-list"], ["value"], [elem.value]);
								if(index_concat_list == -1){
									new_arr[index][arr_fields_concat[j]]["concat-list"].push(elem);
								}
							}
						}
					}
				}
				return new_arr;
			}
			return arr_objs;
	}

	/*collect the values of all the 'keys' in obj*/
	function collect_values(obj,keys){
		var new_obj = {};
		if ((obj != null) && (obj != undefined) && (keys != null) && (keys != undefined)) {
			for (var k in obj) {
				if (obj.hasOwnProperty(k)){
					if (keys == 1) {
						new_obj[k] = obj[k];
					}else if (keys.indexOf(k) != -1){
						new_obj[k] = obj[k];
					}
				}
			}
		}else {return null;}

		return new_obj;
	}

	/*get object with part of keys only*/
	function get_sub_obj(obj,arr_keys) {
		var new_obj = {};
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (arr_keys.indexOf(key) != -1) {
					new_obj[key] = obj[key];
				}
			}
		}
		return new_obj;
	}

	function build_str(field, obj,concat_style, include_link = true){
		if (obj.hasOwnProperty("concat-list")) {
			return __concat_vals(obj["concat-list"],concat_style, include_link);
		}else {
			return __get_val(obj, include_link);
		}

		function __get_val(obj, include_link){
			if ((obj != null) && (obj != undefined)){
				//if (obj.value == "") {obj.value = "NONE";}
				var str_html = obj.value;
				if (include_link) {
					if (obj.hasOwnProperty("uri")) {
						str_html = "<a href='"+String(obj.uri)+"'>"+obj.value+"</a>";
					}
				}
				return str_html;
			}
			/*else {
				return "NONE";
			}*/
		}
		function __concat_vals(arr,concat_style, include_link){
			var str_html = "";
			var separator = ", ";

			if ((concat_style != null) && (concat_style != undefined)) {
				if (concat_style == "newline") {separator = "<br/>";}
				if (concat_style == "inline") {separator = ", ";}
				if (concat_style == "first") {
					if (arr.length > 0) {arr = [arr[0]];}
				}
				if (concat_style == "last") {
					if (arr.length > 0) {arr = [arr[arr.length - 1]];}
				}
			}

			for (var i = 0; i < arr.length; i++) {
				var obj = arr[i];
				if (i == arr.length - 1) {separator = " ";}
				str_html = str_html + __get_val(obj,include_link) + separator;
			}
			return str_html;
		}
	}

	return {
		index_in_arrjsons: index_in_arrjsons,
		get_obj_key_val: get_obj_key_val,
		text_mapping: text_mapping,
		get_sub_obj: get_sub_obj,
		group_by: group_by,
		is_undefined_key: is_undefined_key,
		collect_values: collect_values,
		build_str: build_str
	}
})();


var b_htmldom = (function () {

	var oscar_container = document.getElementById("search");
	var browser_container = document.getElementById("browser");
	var extra_container = document.getElementById("browser_extra");
	var header_container = document.getElementById("browser_header");
	var details_container = document.getElementById("browser_details");
	var metrics_container = document.getElementById("browser_metrics");

	function _init_tr(obj_vals, content_entry){
		var tr = document.createElement("tr");

		//create cell
		var cellType = "td";
		if (content_entry.tag != undefined) {
			cellType = content_entry.tag;
		}
		var myCell = document.createElement(cellType);
		myCell.innerHTML = "";


		if (content_entry.fields != undefined) {
			if (content_entry.fields.length > 0) {

				str_innerHtml = "";
				//console.log(JSON.stringify(obj_vals));
				for (var i = 0; i < content_entry.fields.length; i++) {

					var elem_dom = document.createElement("elem");

					var key = content_entry.fields[i];
					var inner_text = "NONE"
					if (obj_vals.hasOwnProperty(key)) {
						if (! b_util.is_undefined_key(content_entry,"concat_style."+String(key))) {
								inner_text = b_util.build_str(key, obj_vals[key],content_entry.concat_style[key]);
						}else {
								inner_text = b_util.build_str(key, obj_vals[key],null);
						}
					}else {
						if (key == "FREE-TEXT") {
							 inner_text = content_entry.values[i];
						}else {
							if (key == "EXT_DATA") {
								var data_field = content_entry.values[i];
								var lucinda_ext_data = browser.get_ext_data();
								if (! b_util.is_undefined_key(lucinda_ext_data, data_field)) {
									inner_text = b_util.get_obj_key_val(lucinda_ext_data, data_field);
								}
							}
						}
					}


					//check heuristics
					var add_it = true;
					if (content_entry.respects != undefined) {
						if (content_entry.respects[i] != undefined) {
							var my_heur = content_entry.respects[i];
							for (var j = 0; j < my_heur.length; j++) {
								var h_func = my_heur[j];
								add_it = Reflect.apply(h_func,undefined,[inner_text]);
							}
						}
					}

					if (!add_it) {
						str_innerHtml = "";
						break;
					}

					elem_dom.innerHTML = inner_text;
					//elem_dom.innerHTML = "NONE";

					if (content_entry.classes != undefined) {
						if (content_entry.classes[i] != undefined) {
							elem_dom.className = content_entry.classes[i];
						}
					}

					str_innerHtml = str_innerHtml+ String(elem_dom.outerHTML);
				}

				//var str_innerHtml = process_contents(obj_vals,content_entry);
				myCell.innerHTML = str_innerHtml;
			}
		}else {
			//white line
			myCell.setAttribute("style","height:"+ String(content_entry.classes[0]));
		}

		tr.appendChild(myCell);
		return tr;
	}

	function process_contents(obj_vals,content_entry) {
	}

	function _build_section(data_obj, contents, class_name, section){

		switch (section) {
			case "extra":
				for (var extra_key in contents.extra) {
					build_extra_comp(data_obj, contents, class_name, extra_key);
				}
				break;

			default:
				var table = document.createElement("table");
				table.className = class_name;

				var mycontents = contents[section];
				if(mycontents != undefined){
					for (var i = 0; i < mycontents.length; i++) {
						table.insertRow(-1).innerHTML = _init_tr(
										//b_util.collect_values(data_obj, mycontents[i].fields),
										b_util.collect_values(data_obj, 1),
										mycontents[i]
									).outerHTML;
					}
				}
				return table;
		}
	}

	function build_extra_comp(data_obj, contents, class_name, extra_key) {
			var contents_extra = b_util.get_obj_key_val(contents,"extra");
			if (contents_extra != -1) {
					var html_elem = document.getElementById(extra_key);
					var extra_comp = contents.extra[extra_key];
					if (html_elem != -1) {
						switch (extra_key) {
							case "browser_view_switch":
								html_elem.innerHTML = __build_browser_menu(data_obj, extra_comp);
								break;
						}
					}
			}
			function __build_browser_menu(data_obj, extra_comp){
				var str_lis = "";
				for (var i = 0; i < extra_comp.labels.length; i++) {
					var is_active = "";

					var regex_cat = new RegExp(extra_comp.regex[i], "g");
					//console.log(regex_cat);
					//console.log(window.location.href);
					if(window.location.href.match(regex_cat)){
						is_active = "active";
					}


					var loc_href = extra_comp.links[i].replace(/\[\[VAR\]\]/g, data_obj[extra_comp.values[i]].value);

					str_lis = str_lis + "<li class='"+is_active+"'><a regex_rule="+extra_comp.regex[i]+" href="+loc_href+">"+extra_comp.labels[i]+"</a></li>"
				}
				return str_lis;
			}
	}

	function build_body(data_obj, contents){

		if (header_container == null) {
			return -1;
		}else {
			//the header is a must
			header_container.innerHTML = _build_section(data_obj, contents, "browser-header-tab", "header").outerHTML;
			if (extra_container != null) {
				_build_section(data_obj, contents, null, "extra");
			}
			if (details_container != null) {
				details_container.innerHTML = _build_section(data_obj, contents, "browser-details-tab", "details").outerHTML;
			}
			if (metrics_container != null) {
				metrics_container.innerHTML = _build_section(data_obj, contents, "browser-metrics-tab", "metrics").outerHTML;
			}
			return {"header": header_container, "details": details_container, "metrics": metrics_container};
		}
	}

	function build_oscar(data_obj, contents) {
		if (oscar_container != null) {
			_build_oscar_menu(data_obj, contents);
			return true;
		}
		return false;
	}

	/*call this in case i want to build extra with ad-hoc data created*/
	function build_extra(adhoc_data_obj, contents){
		if (extra_container != null) {
			if (adhoc_data_obj != null) {
				_build_section(adhoc_data_obj, contents, null, "extra");
			}
		}
	}

	function _build_oscar_menu(data_obj, contents){

		var oscar_content = b_util.get_obj_key_val(contents,"oscar");
		if (oscar_content != -1) {
			if (oscar_content.length > 0) {
				var config_mod = [{"key":"progress_loader","value":false}];
				//build a nav menu
				var menu_obj = _build_menu(oscar_content, data_obj, config_mod);

				var dom_nav = document.createElement("ul");
				dom_nav.setAttribute("id","oscar_nav");
				dom_nav.setAttribute("class",'nav pages-nav');
				dom_nav.innerHTML = menu_obj.str_lis;
				//var divul = document.createElement("p");
				//divul.appendChild(dom_nav)

				oscar_container.parentNode.insertBefore(dom_nav, oscar_container);
				//enable_oscar_menu(false);

				//click first elem of OSCAR menu
				menu_obj.active_li.click();
			}
		}
		function _build_menu(oscar_content, data_obj, config_mod){
			var str_lis = "";
			var active_elem = null;
			for (var i = 0; i < oscar_content.length; i++) {
				var oscar_obj = oscar_content[i];

				var a_elem = document.createElement("a");
				var query = data_obj[oscar_obj.query_text].value;
				var rule = oscar_obj.rule;

				a_elem.href = "javascript:browser.call_oscar('"+query+"','"+rule+"')";
				a_elem.innerHTML = oscar_obj["label"];
				var is_active = "";
				if (i == 0) {
					is_active = "active";
					active_elem = a_elem;
				}

				str_lis = str_lis + "<li id='"+"oscar_menu_"+i+"' class='"+is_active+"'>"+a_elem.outerHTML+"</li>";
			}
			return {"str_lis":str_lis, "active_li": active_elem};
		}
	}

	function handle_menu(a_elem_id){
		//console.log(a_elem_id);
		var arr_li = document.getElementById("oscar_nav").getElementsByTagName("li");

		//console.log(arr_li);

		for (var i = 0; i < arr_li.length; i++) {
			var my_li = arr_li[i];
			if (my_li.id == a_elem_id) {
				my_li.setAttribute("class", my_li.getAttribute("class")+" active");
			}else {
				my_li.setAttribute("class","");
			}
		}
	}

	function enable_oscar_menu(flag){
		var oscar_nav = document.getElementById("oscar_nav");
		if (flag) {
			oscar_nav.style.visibility='visible';
		}else {
			oscar_nav.style.visibility='hidden';
		}
	}

	return {
		handle_menu: handle_menu,
		enable_oscar_menu: enable_oscar_menu,
		build_extra_comp: build_extra_comp,
		build_extra: build_extra,
		build_body: build_body,
		build_oscar: build_oscar
	}
})();
