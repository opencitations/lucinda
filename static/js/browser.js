
var browser = (function () {

		var resource = null;
		var browser_conf_json = {};

		/*it's a document or an author*/
		function _get_category(resource_text) {

			var re = new RegExp(browser_conf_json["document"]["rule"]);
			if (resource_text.match(re)) {return "document";}

			re = new RegExp(browser_conf_json["author"]["rule"]);
			if (resource_text.match(re)) { return "author";}

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

				resource = resource_iri;

				//initialize and get the browser_config_json
				browser_conf_json = browser_conf;

				var category = _get_category(resource_iri);

				//build the sparql query in turtle format
				var sparql_query = _build_turtle_prefixes() + _build_turtle_query(browser_conf_json[category].query);
				//since its a resource iri we put it between < >
				var global_r = new RegExp("<VAR>", "g");
				sparql_query = sparql_query.replace(global_r, "<"+resource_iri+">");

				//use this url to contact the sparql_endpoint triple store
				var query_contact_tp = "http://localhost:8080/sparql?query="+ encodeURIComponent(sparql_query) +"&format=json";

				//call the sparql end point and retrieve results in json format
				$.ajax({
			        dataType: "json",
			        url: query_contact_tp,
							type: 'GET',
	    				success: function( res_data ) {
									console.log(res_data);
									_build_page(res_data, category);
	    				}
			   });
			 }
		}

		function _build_page(res_data, category){
			var group_by = browser_conf_json[category]["group_by"];
			var links = browser_conf_json[category]["links"];
			var text_mapping = browser_conf_json[category]["text_mapping"];

			//Group all results in one row
			var data_with_links = _init_uris(res_data.results.bindings, links);
			var data_grouped = b_util.group_by(data_with_links, group_by);
			var one_result = data_grouped[0];
			one_result = b_util.text_mapping(one_result, text_mapping);

			console.log(JSON.parse(JSON.stringify(data_grouped)));

			var dom_sections = b_htmldom.build_body(one_result, browser_conf_json[category]["contents"]);

			//build the table under using the search module
			// in case is an agent resource
			if (category == "author") {
				console.log("<"+resource+">");
				search.do_sparql_query("<"+resource+">");
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

		return {
				do_sparql_query: do_sparql_query
		 }
})();


var b_util = (function () {

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
					if (keys.indexOf(k) != -1) {
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

	return {
		text_mapping: text_mapping,
		get_sub_obj: get_sub_obj,
		group_by: group_by,
		is_undefined_key: is_undefined_key,
		collect_values: collect_values
	}
})();


var b_htmldom = (function () {

	var header_container = document.getElementById("browser_header");
	var details_container = document.getElementById("browser_details");
	var metrics_container = document.getElementById("browser_metrics");

	function _build_str(obj,concat_style){
		if (obj.hasOwnProperty("concat-list")) {
			return __concat_vals(obj["concat-list"],concat_style);
		}else {
			return __get_val(obj);
		}

		function __get_val(obj){
			if ((obj != null) && (obj != undefined)){
				if (obj.value == "") {obj.value = "NONE";}
				var str_html = obj.value;
				if (obj.hasOwnProperty("uri")) {
					str_html = "<a href='"+String(obj.uri)+"'>"+obj.value+"</a>";
				}
				return str_html;
			}else {
				return "NONE";
			}
		}
		function __concat_vals(arr,concat_style){
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
				str_html = str_html + __get_val(obj) + separator;
			}
			return str_html;
		}
	}
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
				for (var i = 0; i < content_entry.fields.length; i++) {

					var elem_dom = document.createElement("elem");

					var key = content_entry.fields[i];
					if (obj_vals.hasOwnProperty(key)) {
						if (! b_util.is_undefined_key(content_entry,"concat_style."+String(key))) {
								elem_dom.innerHTML = _build_str(obj_vals[key],content_entry.concat_style[key]);
						}else {
								elem_dom.innerHTML = _build_str(obj_vals[key],null);
						}
					}else {
						if (key == "FREE-TEXT") {
							elem_dom.innerHTML = content_entry.values[i];
						}else {
							//empty value
							elem_dom.innerHTML = "NONE";
						}
					}

					if (content_entry.classes != undefined) {
						if (content_entry.classes[i] != undefined) {
							elem_dom.className = content_entry.classes[i];
						}
					}

					str_innerHtml = str_innerHtml+ String(elem_dom.outerHTML);
				}

				myCell.innerHTML = str_innerHtml;
			}
		}else {
			//white line
			myCell.setAttribute("style","height:"+ String(content_entry.classes[0]));
		}

		tr.appendChild(myCell);
		return tr;
	}

	function _build_section(data_obj, contents, class_name, section){
		var table = document.createElement("table");
		table.className = class_name;

		var mycontents = contents[section];
		if(mycontents != undefined){
			for (var i = 0; i < mycontents.length; i++) {
				table.insertRow(-1).innerHTML = _init_tr(
								b_util.collect_values(data_obj, mycontents[i].fields),
								mycontents[i]
							).outerHTML;
			}
		}
		return table;
	}
	function build_body(data_obj, contents){

		if (header_container == null) {
			return -1;
		}else {
			header_container.innerHTML = _build_section(data_obj, contents, "browser-header-tab", "header").outerHTML;
			if (details_container != null) {
				details_container.innerHTML = _build_section(data_obj, contents, "browser-details-tab", "details").outerHTML;
			}
			if (metrics_container != null) {
				metrics_container.innerHTML = _build_section(data_obj, contents, "browser-metrics-tab", "metrics").outerHTML;
			}
			return {"header": header_container, "details": details_container, "metrics": metrics_container};
		}
	}

	return {
		build_body: build_body
	}
})();
