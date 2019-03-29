//GLOBALS
var lucinda_tags = document.getElementsByClassName("__lucinda__");
var lucinda_doms = [];

//Get LUCINDA parameters from the HTML tag
for (var i = 0; i < lucinda_tags.length; i++) {
	var lucinda_container = lucinda_tags[i];

	var data_content = ['switch','header','details','metrics'];
	if(lucinda_container.getAttribute('data-content') != undefined){
		data_content = lucinda_container.getAttribute('data-content');
		data_content = data_content.split(" ");
	}

	lucinda_doms.push(
		{
			'container': lucinda_container,
			'data-content': data_content
		}
	);
}

//Build all the inner elements
for (var i = 0; i < lucinda_doms.length; i++) {

	var str_html_inner = '';

	//LUCINDA contents
	if (lucinda_doms[i]["data-content"].length != 0) {
			var switch_index = lucinda_doms[i]["data-content"].indexOf('switch');
			if (switch_index != -1){
				str_html_inner = str_html_inner + '<div id="browser_extra" class="browser-extra"><div id="browser_view_switch"></div></div>';
			}

			var header_index = lucinda_doms[i]["data-content"].indexOf('header');
			var details_index = lucinda_doms[i]["data-content"].indexOf('details');

			if ((header_index != -1) || (details_index != -1)){
				str_html_inner = str_html_inner + '<div id="browser_info" class="browser-info">';
				if (header_index != -1){
					str_html_inner = str_html_inner + '<div id="browser_header" class="browser-header"></div>';
				}
				if (details_index != -1){
					str_html_inner = str_html_inner + '<div id="browser_details" class="browser-details"></div>';
				}
				str_html_inner = str_html_inner + '</div>';
			}

			var metrics_index = lucinda_doms[i]["data-content"].indexOf('metrics');
			if (metrics_index != 0){
				str_html_inner = str_html_inner + '<div id="browser_metrics" class="browser-metrics"></div>';
			}


	}

	//put it inside the page
	lucinda_doms[i]['container'].innerHTML = '<div id="browser" class="browser">'+ str_html_inner + '</div>';
}


var browser = (function () {


		var resource = null;
		var resource_res = null;
		var browser_conf_json = {};
		var oscar_data = {};
		var pending_oscar_calls = 0;
		var oscar_content = null;
		var current_oscar_tab = null;
		var ext_data = {};
		//targets -> data
		var ext_source_data_post = {};
		//call-id -> data
		var ext_source_data = {};
		var pending_ext_calls = 0;

		var contents = null;
		var one_result = null;

		var COLORS = ["#ff4d4d","#4d79ff","#8c66ff","#71da71"];

		/*it's a document or an author*/
		function _get_category(resource_text, exclude_list = []) {

			for (var key_cat in browser_conf_json.categories) {
				if (browser_conf_json.categories.hasOwnProperty(key_cat)) {
					var re = new RegExp(browser_conf_json.categories[key_cat]["rule"]);
					if (resource_text.match(re)) {
						if (exclude_list.indexOf(key_cat) == -1) {
							return key_cat;
						}
					}
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

		/*apply heuristics to the original value*/
		function _apply_heuristics(val,category) {
			var final_val = val;
			if ('heuristics' in browser_conf_json.categories[category]) {
				var list_h = browser_conf_json.categories[category].heuristics;
				for (var i = 0; i < list_h.length; i++) {
					final_val = Reflect.apply(list_h[i],undefined,[final_val]);
				}
			}

			return final_val;
		}


		/*THE MAIN FUNCTION CALL
		call the sparql endpoint and do the query*/
		function do_sparql_query(resource_iri, given_category = null, exclude_list = [], call_fun = null){

			//var header_container = document.getElementById("browser_header");
			if (resource_iri != "") {

				//initialize and get the browser_config_json
				browser_conf_json = browser_conf;

				var category = given_category;
				if (category == null) {
					category = _get_category(resource_iri, exclude_list);
					if (category == -1) {
						_build_page({}, category);
					}
				}

				//build the sparql query in turtle format
				var sparql_query = _build_turtle_prefixes() + _build_turtle_query(browser_conf_json.categories[category].query);
				//apply heuristics
				resource_iri = _apply_heuristics(resource_iri, category);
				sparql_query = sparql_query.replace(/\[\[VAR\]\]/g, resource_iri);

				//use this url to contact the sparql_endpoint triple store
				var query_contact_tp =  String(browser_conf_json.sparql_endpoint)+"?query="+ encodeURIComponent(sparql_query) +"&format=json";

				//call the sparql end point and retrieve results in json format
				$.ajax({
			        dataType: "json",
			        url: query_contact_tp,
							type: 'GET',
	    				success: function( res_data ) {
									if (res_data.results.bindings.length == 0) {
										//try look for another category
										var new_exclude_list = exclude_list;
										new_exclude_list.push(category);
										do_sparql_query(resource_iri, given_category= given_category, exclude_list = new_exclude_list, call_fun = call_fun);
									}else {
											if (call_fun != null) {
												Reflect.apply(call_fun,undefined,[res_data,category]);
											}
											_build_page(res_data, category);
									}
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
			var ext_sources = browser_conf_json.categories[category]["ext_sources"];

			var data_none_vals = _init_none_vals(res_data.results.bindings, none_values);
			//console.log(data_none_vals);
			var data_with_links = _init_uris(data_none_vals, links);
			var data_grouped = b_util.group_by(data_with_links, group_by);
			var one_result = data_grouped[0];
			one_result = b_util.text_mapping(one_result, text_mapping);
			resource_res = JSON.parse(JSON.stringify(one_result));

			contents = browser_conf_json.categories[category]["contents"];
			if (contents["oscar"] != undefined) {
				oscar_content = contents["oscar"];
			}

			b_htmldom.build_body(one_result,contents);


			//Execute external sources Calls
			_exec_ext_sources_calls(one_result, ext_sources);

			//Build OSCAR table
			_build_oscar_table(one_result,contents);

		}

		function _exec_ext_sources_calls(one_result, ext_sources) {
			if (ext_sources != undefined) {
				pending_ext_calls = ext_sources.length;
				for (var i = 0; i < ext_sources.length; i++) {
					var source_param = ext_sources[i];

					if (!(source_param.id in ext_source_data)) {
						ext_source_data[source_param.id] = {};
					}

					//check if I have already that result
					var flag_call_service = true;
					if ('data' in ext_source_data[source_param.id]) {
						if (ext_source_data[source_param.id]['data'] != null) {
							flag_call_service = false;
						}
					}

					//if I dont have the result call the service
					if (flag_call_service) {
						var call_url = __build_text_query(one_result, source_param.call);
						b_util.httpGetAsync(call_url, source_param.id, source_param.handle, source_param);
					}else {
						//I have a result now check if I post processed it
						//Check if post processing has been done
						if (source_param.targets in ext_source_data_post) {
								browser.target_ext_call(source_param, ext_source_data_post[source_param.targets].data);
						}else{
								Reflect.apply(source_param.handle,undefined,[ext_source_data[source_param.id].data]);
						}
					}
				}
			}
			function __build_text_query(one_result, query_text) {
				var myRegexp = /\[\[\?(.*)\]\]/g;
				var match = myRegexp.exec(query_text);

				//get all values
				var index = [];
				for (var i = 1; i <= match.length; i++) {
					if (one_result[match[i]] != undefined) {
						index.push(
							{
								'name': match[i],
								'value': one_result[match[i]].value
							}
						)
					}
				}

				//rebuild the query
				var matched_query = query_text;
				for (var i = 0; i < index.length; i++) {
					matched_query = matched_query.replace("[[?"+index[i].name+"]]", index[i].value);
				}

				return matched_query;
			}
		}

		function update_ext_source_data(key,result) {
			ext_source_data[key]['data'] = result;
		}

		function target_ext_call(call_param, data){

			var dataset_data = data[Object.keys(data)[0]];
			var splits_dot = call_param.targets.split('.');
			var index = 0;
			var target_type = null;
			var target_id = null;

			if (splits_dot.length > 1) {
				target_type = splits_dot[0];
				index = 1;
			}
			var myRegexp = /\[\[(.*)\]\]/g;
			var match = myRegexp.exec(splits_dot[index]);
			if (match) {
				target_id = match[1];
			}

			/*
				1) Check data validity
				2) Search the corresponding HTML container
				3) Update the corresponding data retrieved
				4) In case the data has been updated -> update the html containers of the page
			*/

			var content_param = search_content_item(target_type,target_id);
			if (b_util.check_data_validity(call_param,dataset_data)) {
				if (_update_ext_source_data_post(call_param.targets,data,content_param)) {
						b_htmldom.update_html_from_ext_source(target_type, target_id, call_param.targets, call_param.id);
				}
			}

			/*
				Check if the values respect the heuristics of their corresponding html container
				Once all the external calls finish their execution
			*/
			pending_ext_calls -= 1;
			if (pending_ext_calls == 0) {
				//NOW Update the page and remove the elements that do not follow the heuristics
				_update_page();
			}

			function _update_ext_source_data_post(target_content_id,data,content_param) {

				var flag_first_data = false;
				if (!(target_content_id in ext_source_data_post)) {
					flag_first_data = true;
					ext_source_data_post[target_content_id] = {};
					ext_source_data_post[target_content_id]['param'] = content_param;
				}

				//var current_data = ext_source_data_post[target_content_id]['data'];
				//join the current data with the new ones
				//in case we have new
				var format_data = 'ONE-VAL';
				if ('data_param' in content_param) {
					if ('format' in content_param['data_param']) {
						format_data = content_param.data_param.format;
					}
				}

				//the new data to add and the name of its corresponding dataset
				var new_data = data;
				var dataset_name = Object.keys(data)[0];

				//switch according to the format of the data
				switch (format_data) {
						case 'X_AND_Y':
							if (flag_first_data) {
								ext_source_data_post[target_content_id]['data'] = {'value':null,'data':{}};
							}
							//if an update occured
							if(__update_x_and_y(new_data)){
								__operation_x_and_y();
								__normalize_x_and_y();
							}
							return true;

						case 'MULTI-VAL':
							if (flag_first_data) {
								ext_source_data_post[target_content_id]['data'] = {'value':null,'data':{}};
							}
							if(__update_one_val(new_data)){
								__operation_one_val();
								console.log(ext_source_data_post[target_content_id]['data']);
								__normalize_multi_val();
							}
							return true;

						case 'ONE-VAL':
							if (flag_first_data) {
								ext_source_data_post[target_content_id]['data'] = {'value':null,'data':{}};
							}
							if(__update_one_val(new_data)){
								//console.log(ext_source_data_post[target_content_id]['data']);
								__operation_one_val();
								__normalize_one_val();
							}
							return true;

						default:
							break;
				}

				return false;

				//*X_AND_Y DATA UPDATE*//
				function __update_x_and_y(data) {

					var new_data = data;
					var current_data = ext_source_data_post[target_content_id]['data'].data;
					if (!(dataset_name in current_data)) {
						ext_source_data_post[target_content_id]['data'].data[dataset_name] = data[dataset_name];
						return true;
					}

					current_data = ext_source_data_post[target_content_id]['data'].data[dataset_name];
					new_data = data[dataset_name];
					var updated_flag = false;

					for (var x_key in new_data) {
							var cor_val = new_data[x_key];

							var flag_insert_it = true;
							if (x_key in current_data) {
								if (cor_val.y == current_data[x_key].y) {
									flag_insert_it = false;
								}
							}

							if (flag_insert_it) {
								updated_flag = true;
								ext_source_data_post[target_content_id]['data'].data[dataset_name][x_key] = cor_val;
							}
					}
					return updated_flag;

				}
				function __operation_x_and_y(){
					//check if we have operations to apply on the data
					if ('data_param' in content_param) {
						if ('operation' in content_param.data_param) {
								for (var op in content_param.data_param.operation) {
									//for each dataset do operations
									var current_data = ext_source_data_post[target_content_id]['data'].data;
									for (var dataset_key in current_data) {
										___exec_operation(op,current_data[dataset_key],dataset_key);
									}
								}
						}
					}

					function ___exec_operation(op,dataset_data,dataset_name) {
						switch (op) {
							case 'sort':
								if (content_param.data_param.operation[op]['sort'] == true){
									//sort the data
								  var sorted_all_data = {};
								  Object.keys(dataset_data)
								      .sort()
								      .forEach(function(v, i) {
								          sorted_all_data[v] = current_data[dataset_name][v];
								       });
									ext_source_data_post[target_content_id]['data'].data[dataset_name] = sorted_all_data;
								}
								break;
							default:
						}
					}
				}
				function __normalize_x_and_y() {
					var current_data = ext_source_data_post[target_content_id]['data'].data;
					var final_normal_data = {'labels':[],'datasets':[]};

					//build labels first
					for (var dataset_key in current_data) {
						for (var key_date in current_data[dataset_key]) {
							if (final_normal_data.labels.indexOf(key_date) == -1) {
								final_normal_data.labels.push(key_date);
							}
						}
					}

					//now build the dataset
					var color_index = 0;
					for (var dataset_key in current_data) {
						var normal_data = {'data':[],'yAxisID': dataset_key,'label':dataset_key, 'backgroundColor': COLORS[color_index]}
						color_index = color_index + 1;
						for (var i = 0; i < final_normal_data.labels.length; i++) {
							var xlbl_val = final_normal_data.labels[i];

							if (xlbl_val in current_data[dataset_key]) {
								normal_data.data.push(current_data[dataset_key][xlbl_val].y);
							}else {
								//OR null also
								normal_data.data.push(0);
							}
						}
						final_normal_data.datasets.push(normal_data);
					}

					ext_source_data_post[target_content_id]['data'].value = final_normal_data;
				}

				//*ONE-VAL DATA UPDATE*//
				function __update_one_val(data){
					var current_data = ext_source_data_post[target_content_id]['data'].data;

					if (!(dataset_name in current_data)) {
						ext_source_data_post[target_content_id]['data'].data[dataset_name] = [data[dataset_name]];
						return true;
					}

					current_data = ext_source_data_post[target_content_id]['data'].data[dataset_name];
					new_data = data[dataset_name];

					var update_it = false;
					for (var i = 0; i < current_data.length; i++) {
						var elem = current_data[i];
						if ((new_data.value != elem.value)&&(new_data.value.toLowerCase() != elem.value.toLowerCase()))  {
							update_it = true;
							break;
						}else {
							if (elem.source != new_data.source) {
								update_it = true;
								break;
							}
						}
					}

					if (update_it) {
						ext_source_data_post[target_content_id]['data'].data[dataset_name].push(data[dataset_name]);
						return true;
					}

					return false;
				}
				function __operation_one_val(){
					//check if we have operations to apply on the data
					if ('data_param' in content_param) {
						if ('operation' in content_param.data_param) {
								for (var op in content_param.data_param.operation) {
									//for each dataset do operations
									var current_data = ext_source_data_post[target_content_id]['data'].data;
									for (var dataset_key in current_data) {
										___exec_operation(op,current_data[dataset_key],dataset_key);
									}
								}
						}
					}

					function ___exec_operation(op,dataset_data,dataset_name) {
						switch (op) {
							case 'sort':
								if (content_param.data_param.operation[op]['sort'] == true){
									//sort the data
								  var sorted_all_data = {};
								  Object.keys(dataset_data)
								      .sort()
								      .forEach(function(v, i) {
								          sorted_all_data[v] = current_data[dataset_name][v];
								       });
									ext_source_data_post[target_content_id]['data'].data[dataset_name] = sorted_all_data;
								}
								break;
							default:
						}
					}
				}
				function __normalize_one_val(){
					var current_data = ext_source_data_post[target_content_id]['data'].data;
					var final_normal_data = "";
					//we have only one dataset in this case
					for (var key_dataset in current_data) {
						for (var i = 0; i < current_data[key_dataset].length; i++) {
							var elem = current_data[key_dataset][i];
							if ((elem.value == "") || (elem.value == null)){
								continue;
							}else {
									final_normal_data = elem.value;
									break;
							}
						}
					}
					ext_source_data_post[target_content_id]['data'].value = final_normal_data;
				}

				//*MULTI-VAL DATA UPDATE*//
				function __normalize_multi_val(){

					var current_data = ext_source_data_post[target_content_id]['data'].data;
					//we have only one dataset in this case
					var dict_index = {};
					for (var key_dataset in current_data) {
						for (var i = 0; i < current_data[key_dataset].length; i++) {
							var elem = current_data[key_dataset][i];
							if ((elem.value == "") || (elem.value == null)){
								continue;
							}else {
									//rules to consider multi elements
									var similar_entry = -1;
									for (var key_val in dict_index) {
										if (elem.value.toLowerCase() == key_val.toLowerCase()) {
											similar_entry = key_val;
										}
									}

									if (similar_entry == -1) {
										dict_index[elem.value] = [elem.source];
									}else {
										//check source fo each element
										var insert_it = true;
										for (var j = 0; j < dict_index[similar_entry].length; j++) {
											if (elem.source.toLowerCase() == dict_index[similar_entry][j].toLowerCase()) {
												insert_it = false;
											}
										}

										if (insert_it) {
											dict_index[similar_entry].push(elem.source);
										}
									}

							}
						}
					}
					console.log(dict_index);

					var final_normal_data = "";
					for (var key_val in dict_index) {
						var lbl = key_val;
						var coif = i+1;
						if (coif > 4) {
							coif = 4;
						}
						var size_perc = (1/coif*40)+60;

						//ALL SOURCES
						var show_source_flag = false;
						if ('show_source' in content_param.data_param) {
							if (content_param.data_param.show_source == true) {
								show_source_flag = true;
							}
						}

						if (show_source_flag) {
							//var source_lbl = "*Source: ";
							var source_lbl = "[";
							for (var i = 0; i < dict_index[key_val].length; i++) {
								var source = dict_index[key_val][i];
								var source_lbl = source_lbl+source+ ",";
							}
							source_lbl = source_lbl.slice(0,source_lbl.length-1)+"]";
							var source_dom = "<span style='float:right; font-size: "+(50).toString()+"%; font-style: oblique; color: black'>"+source_lbl;
						}

						final_normal_data = final_normal_data + "<div style='font-size: "+(size_perc).toString()+"%'>"+ lbl +"</span>"+source_dom+"</div>";
					}
					ext_source_data_post[target_content_id]['data'].value = final_normal_data;
				}
			}
		}

		function search_content_item(type,id) {
			if (contents[type] != undefined) {

				var res = -1;
				for (var i = 0; i < contents[type].length; i++) {
					var item = contents[type][i];

					if ('id' in item) {
						if (item['id'].constructor === Array) {
							if (item['id'].indexOf(id) != -1) {
								return item.param[item['id'].indexOf(id)];
							}
						}else {
							if (id == item['id']) {
								return item;
							}
						}
					}
				}
			}

			return res;
		}

		function _update_page(){
			b_htmldom.build_body(resource_res, contents, is_updating = true);
		}

		function _build_oscar_table(one_result,contents) {
			var oscar_content = contents['oscar'];
			if (oscar_content != undefined) {
				if ('oscar_conf' in contents) {
					if ('progress_loader' in contents['oscar_conf']) {
						b_htmldom.loader(true, progress_loader = contents['oscar_conf']['progress_loader'], query_label=null);
					}
				}
				pending_oscar_calls = oscar_content.length;

				for (var i = 0; i < oscar_content.length; i++) {
					var oscar_entry = oscar_content[i];
					var query = one_result[oscar_entry.query_text].value;
					var rule = oscar_entry["rule"];
					var oscar_key = 'search?text='+query+'&rule='+rule;

					oscar_data[oscar_key] = {};
					//get the OSCAR configuration with the updates indicated
					oscar_data[oscar_key]["data"] = search.get_search_data(rule = rule, native = true, config_mod = oscar_entry["config_mod"]);
				}
				//console.log(JSON.parse(JSON.stringify(oscar_data[oscar_key]["data"])));

				for (var i = 0; i < oscar_content.length; i++) {
					var oscar_entry = oscar_content[i];
					call_oscar(one_result[oscar_entry.query_text].value, oscar_entry["rule"], browser.assign_oscar_results, oscar_entry["config_mod"]);
				}
			}
		}

		function get_ext_source_data_post() {
			return ext_source_data_post;
		}

		function get_ext_source_data() {
			return ext_source_data;
		}

		function get_pending_calls() {
			return pending_ext_calls;
		}

		function get_view_data() {
			return view_data;
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

		function click_for_oscar(query,rule,arr,i){
				call_oscar(query,rule,browser.assign_oscar_results,arr,i);
		}

		function call_oscar(query,rule, callbk_func_key, config_mod = [], li_id = null){
				var oscar_key = 'search?text='+query+'&rule='+rule;
				if (li_id != null) {
					b_htmldom.update_oscar_li(oscar_content,li_id);
				}

				//in case there is still no results (first time)
				if (!("results" in oscar_data[oscar_key])) {
						// load new oscar data
						search.change_search_data(oscar_data[oscar_key].data, check_and_update = false);
						search.do_sparql_query(oscar_key, true ,[], true, callbk_func_key);
				}else {
					if (oscar_data[oscar_key]['results']) {
							//in case the table data has not been yet initialized
							if (oscar_data[oscar_key].data.table_conf.data == null) {
								 //search.change_search_data(oscar_data[oscar_key].data);
								 oscar_data[oscar_key]["data"] = search.build_table(oscar_data[oscar_key].results, do_init = false);
							}else {
								// save current state of oscar
								oscar_data[current_oscar_tab].data = search.get_search_data();
								// load new oscar data
								search.change_search_data(oscar_data[oscar_key].data, check_and_update = true);
							}
					}
				}
				current_oscar_tab = oscar_key;
		}

		function assign_oscar_results(oscar_key, results, cat_conf, empty_res){
			pending_oscar_calls = pending_oscar_calls - 1;
			if (empty_res) {
				//get rule key from regex
				var rule_key = "";
				reg = /rule=(.+?)(?=&bc|$)/g;
				if (match = reg.exec(oscar_key)) {
					rule_key = match[1];
				}

				var index_oscar_obj = b_util.index_in_arrjsons(oscar_content,["rule"],[rule_key]);
				if (index_oscar_obj != -1) {
					//comment this to add oscar menu element in any case
					oscar_content.splice(index_oscar_obj, 1);
				}
			}else {
				//the header
				var head_list = [];
				for (var key_name in results[0]) {
					head_list.push(key_name);
				}
				oscar_data[oscar_key]["results"] = true;
				oscar_data[oscar_key]["data"]["cat_conf"] = JSON.parse(JSON.stringify(cat_conf));
				oscar_data[oscar_key]["data"]["table_conf"] = JSON.parse(JSON.stringify(results));

				//var data_res = {'head':{'vars': head_list},'results':{'bindings':results}};
				//oscar_data[oscar_key]["data"]["table_conf"]["data"] = JSON.parse(JSON.stringify(data_res));
				//oscar_data[oscar_key]["data"]["table_conf"]["filters"]["data"] = JSON.parse(JSON.stringify(data_res));
				//oscar_data[oscar_key]["data"]["table_conf"]["view"]["data"] = JSON.parse(JSON.stringify(data_res));

			}

			//decomment this to add oscar menu element in any case
			//oscar_data[oscar_key]["results"] = results;

			if (pending_oscar_calls == 0) {

				b_htmldom.loader(false);

				//console.log(oscar_data);
				//build oscar menu
				console.log(JSON.parse(JSON.stringify(resource_res)));
				b_htmldom.build_oscar(resource_res, {"oscar": oscar_content});
			}
		}

		return {
				_update_page: _update_page,
				call_oscar : call_oscar,
				build_extra_sec: build_extra_sec,
				do_sparql_query: do_sparql_query,
				//get_ext_data: get_ext_data,
				get_ext_source_data_post: get_ext_source_data_post,
				get_ext_source_data: get_ext_source_data,
				get_pending_calls: get_pending_calls,
				get_view_data: get_view_data,
				//call back functions
				assign_oscar_results: assign_oscar_results,
				click_for_oscar: click_for_oscar,
				target_ext_call: target_ext_call,
				update_ext_source_data: update_ext_source_data
		 }
})();


var b_util = (function () {

	function httpGetAsync(theUrl, key, callback, call_param = null){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', theUrl);
		xhr.onload = function() {
		    if (xhr.status === 200) {
						var result = {};
						result['call_url'] = theUrl;
						result['key'] = key;
						result['call_param'] = call_param;

						//BUILD the data
						//convert to format
					  result['data'] = convert_to_format(xhr.responseText, is_in_and_defined(call_param,'format'));
						//get the subset fields
						var fields = is_in_and_defined(call_param,'fields');
						if (fields != -1) {
							var new_data = {}
							for (var i = 0; i < fields.length; i++) {
								var parts = fields[i].split(".");
								if (parts.length > 1) {
									for (var j = 0; j < parts.length; j++) {
										result['data'] = result['data'][parts[j]];
									}
									new_data[fields[i]] = result['data'];
								}else {
										new_data[fields[i]] = result['data'][fields[i]];
								}
							}
							result['data'] = new_data;
						}

						//update_ext_source_data
						browser.update_ext_source_data(key, result);
						/*
						Call the handle function in case the data retrieved are valid
						*/
						Reflect.apply(callback,undefined,[result]);
		    }
		    else {
		        //console.log("Error: "+xhr.status);
						var result = {};
						result['call_url'] = theUrl;
						result['key'] = key;
						result['call_param'] = call_param;
					  result['data'] = null;

						//update_ext_source_data
						browser.update_ext_source_data(key, result);
						//call the handle function
						Reflect.apply(callback,undefined,[result]);
		    }
		};
		xhr.send();
	}

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

					var arr_vals = [obj[key_field]];
					if (obj[key_field].hasOwnProperty("concat-list")) {
						arr_vals = obj[key_field]["concat-list"];
					}

					for (var j = 0; j < arr_vals.length; j++) {
						for (var i = 0; i < conf_obj[key_field].length; i++) {
							var rule_entry = conf_obj[key_field][i];

							var new_val = arr_vals[j].value;
							if (rule_entry.hasOwnProperty("regex")) {
								new_val = new_val.replace(rule_entry.regex,rule_entry.value);
							}

							if (rule_entry.hasOwnProperty("func")) {
								new_val = _func_map(new_val, rule_entry.func);
							}

							arr_vals[j].value = new_val;
						}
					}
				}
			}
		}
		return obj;

		function _func_map(val, func_arr) {
			  var result = val;
				for (var k = 0; k < func_arr.length; k++) {
					var fname = func_arr[k];
					result = Reflect.apply(fname,undefined,[result]);
				}
				return result;
			}

 		return new_data;
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
		if ((params == null) || (params == undefined)) {
			return arr_objs;
		}
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
	function collect_values(obj,keys, heuristics = null){
		var new_obj = {};
		if ((obj != null) && (obj != undefined) && (keys != null) && (keys != undefined)) {
			for (var k in obj) {
				if (obj.hasOwnProperty(k)){
					//add them all
					if (keys == 1) {
						new_obj[k] = obj[k];
					}else if (keys.indexOf(k) != -1){
						var inserit = true;
						//check Heuristics
						if (heuristics != null) {
							for (var h_obj in heuristics) {
								var my_fun = heuristics[h_obj]['func'];
								var my_params = heuristics[h_obj]['param'];
								inserit = inserit && Reflect.apply(my_func,undefined,collect_values(obj[k],my_params));
							}
						}
						// add it
						if (inserit) {
								new_obj[k] = obj[k];
						}
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
						str_html = "<a href='"+String(obj.uri)+"' target='_blank'>"+obj.value+"</a>";
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

	function is_in_and_defined(obj,key) {
		if (key in obj) {
	    if (obj[key] != null){
				return obj[key];
	    }
	  }
		return -1;
	}

	function convert_to_format(str_obj,format) {
		switch (format) {
			case 'json':
				return JSON.parse(str_obj);
				break;
			default:
				return str_obj;
				break;
		}
	}

	function check_heuristics(content_entry,i,val){
		var add_it = true;
		if (content_entry != undefined) {
			if (content_entry.respects != undefined) {

				var i_respects_list = content_entry.respects;
				if (i != -1) {
					i_respects_list = content_entry.respects[i];
				}
				if (i_respects_list != undefined) {
						for (var j = 0; j < i_respects_list.length; j++) {
							var h_func = i_respects_list[j];
							add_it = Reflect.apply(h_func,undefined,[val]);
						}
				}
			}
		}
		return add_it;
	}

	function transform_value(content_entry,i,val){
		var final_val = val;
		if (content_entry != undefined) {
			if (content_entry.transform != undefined) {

				var i_transform_list = content_entry.transform;
				if (i != -1) {
					i_transform_list = content_entry.transform[i];
				}
				if (i_transform_list != undefined) {
						for (var j = 0; j < i_transform_list.length; j++) {
							var h_func = i_transform_list[j];
							final_val = Reflect.apply(h_func,undefined,[final_val]);
						}
				}
			}
		}
		return final_val;
	}

	function check_data_validity(content_entry,val){
		var is_valid = true;
		if (content_entry.valid_data != undefined) {
					var my_heur = content_entry.valid_data;
					for (var j = 0; j < my_heur.length; j++) {
						var h_func = my_heur[j];
						is_valid = Reflect.apply(h_func,undefined,[val]);
					}
		}
		return is_valid;
	}

	return {
		convert_to_format: convert_to_format,
		is_in_and_defined: is_in_and_defined,
		httpGetAsync: httpGetAsync,
		index_in_arrjsons: index_in_arrjsons,
		get_obj_key_val: get_obj_key_val,
		text_mapping: text_mapping,
		get_sub_obj: get_sub_obj,
		group_by: group_by,
		is_undefined_key: is_undefined_key,
		collect_values: collect_values,
		build_str: build_str,
		check_heuristics: check_heuristics,
		check_data_validity: check_data_validity,
		transform_value: transform_value
	}
})();


var b_htmldom = (function () {

	var dict_charts = {};

	var oscar_container = document.getElementById("search");
	var loader_container = document.getElementById("loader_container");
	var browser_container = document.getElementById("browser");
	var info_container = document.getElementById("browser_info");
	var extra_container = document.getElementById("browser_extra");
	var header_container = document.getElementById("browser_header");
	var details_container = document.getElementById("browser_details");
	var metrics_container = document.getElementById("browser_metrics");
	var view_container = document.getElementById("browser_view");

	function _init_tr(obj_vals, content_entry, section, is_updating = false){
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
					var inner_text = "unknown";
					if (obj_vals.hasOwnProperty(key)) {
						if (! b_util.is_undefined_key(content_entry,"concat_style."+String(key))) {
								inner_text = b_util.build_str(key, obj_vals[key],content_entry.concat_style[key]);
						}else {
								inner_text = b_util.build_str(key, obj_vals[key],null);
						}
						if (inner_text == "REMOVE") {

						}
					}else {
						if (key == "FREE-TEXT") {
							 inner_text = content_entry.values[i];
						}else {
							if (key == "EXT-VAL") {


								if (is_updating) {
									if (browser.get_pending_calls() == 0) {
										var ext_call_id_post = section+"."+"[["+content_entry.id[i]+"]]";
										if (browser.get_ext_source_data_post()[ext_call_id_post].data.value != undefined) {
												//inner_text = "Now is all done";
												inner_text = browser.get_ext_source_data_post()[ext_call_id_post].data.value;
										}
									}else {
											inner_text = content_entry.values[i];
									}
								}

							}
						}
					}

					//transform data
					inner_text = b_util.transform_value(content_entry,i,inner_text);

					//check heuristics
					var add_it = b_util.check_heuristics(content_entry,i,inner_text);
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

					if (content_entry.id != undefined) {
						if (content_entry.id[i] != undefined) {
							elem_dom.id = content_entry.id[i];
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

	function _update_all_row(elem_id, data, data_format){

			var remove_row = false;
			switch (data_format) {
				case 'ONE-VAL':
					remove_row = __check_row_one_val(data);
					break;

				case 'MULTI-VAL':
					remove_row = __check_row_multi_val(data);
					break;

				default:
			}

			console.log(data);
			if (remove_row) {
				var row_to_remove = document.getElementById(elem_id).parentNode;
				row_to_remove.parentNode.removeChild(row_to_remove);
			}

			function __check_row_one_val(data) {
				return (Object.keys(data).length == 0)
			}

			function __check_row_multi_val(data) {
				return (Object.keys(data).length == 0)
			}

			function __check_row_x_and_y(data) {

			}
	}

	function process_contents(obj_vals,content_entry) {
	}

	function _build_section(data_obj, contents, class_name, section, is_updating= false){

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
										mycontents[i],
										section,
										is_updating = is_updating
									).outerHTML;
					}
				}
				if (table.rows.length == 0) {
					return -1;
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

					if (is_active != "active") {
						var loc_href = extra_comp.links[i].replace(/\[\[VAR\]\]/g, data_obj[extra_comp.values[i]].value);
						str_lis = str_lis + "<li class='"+is_active+"'><a regex_rule="+extra_comp.regex[i]+" href="+loc_href+">"+extra_comp.labels[i]+"</a></li>";
					}
				}
				return str_lis;
			}
	}

	function build_body(data_obj, contents, is_updating = false){

		if (header_container == null) {
			return -1;
		}else {
			//the header is a must
			header_container.innerHTML = _build_section(data_obj, contents, "browser-header-tab", "header",is_updating = is_updating).outerHTML;
			if (extra_container != null) {
				_build_section(data_obj, contents, null, "extra", is_updating = is_updating);
			}
			if (details_container != null) {
				var sec_tab_con = _build_section(data_obj, contents, "browser-details-tab", "details",is_updating = is_updating);
				if (sec_tab_con != -1) {
					details_container.innerHTML = sec_tab_con.outerHTML;
				}else {
					details_container.parentNode.removeChild(details_container);
				}
			}
			if (metrics_container != null) {
				var sec_tab_con = _build_section(data_obj, contents, "browser-metrics-tab", "metrics", is_updating = is_updating);
				if (sec_tab_con != -1) {
					metrics_container.innerHTML = sec_tab_con.outerHTML;
				}else {
					metrics_container.parentNode.removeChild(metrics_container);
					info_container.setAttribute('style', "width :"+ 100 + "%");
				}
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
				_build_section(adhoc_data_obj, contents, null, "extra", is_updating = is_updating);
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
				//menu_obj.active_li.click();
				menu_obj.active_li.dispatchEvent(new MouseEvent('click', {}));
			}
		}
		function _build_menu(oscar_content, data_obj, config_mod, def_menu_index = 0){
			var str_lis = "";
			var active_elem = null;
			for (var i = 0; i < oscar_content.length; i++) {
				var oscar_obj = oscar_content[i];

				var a_elem = document.createElement("a");
				var query = data_obj[oscar_obj.query_text].value;
				var rule = oscar_obj.rule;

				a_elem.href = "javascript:browser.click_for_oscar('"+query+"','"+rule+"','"+[]+"','"+i+"')";
				a_elem.innerHTML = oscar_obj["label"];
				var is_active = "";
				if (i == def_menu_index) {
					is_active = "active";
					active_elem = a_elem;
				}

				str_lis = str_lis + "<li id='"+"oscar_menu_"+i+"' class='"+is_active+"'>"+a_elem.outerHTML+"</li>";
			}
			return {"str_lis":str_lis, "active_li": active_elem};
		}
	}

	function update_oscar_li(oscar_content, li_id) {
		for (var i = 0; i < oscar_content.length; i++) {
			if (i == li_id) {
				document.getElementById("oscar_menu_"+i).className = "active";
			}else {
				document.getElementById("oscar_menu_"+i).className = "";
			}
		}
	}

	function handle_menu(a_elem_id){
		//console.log(a_elem_id);
		var arr_li = document.getElementById("oscar_nav").getElementsByTagName("li");

		console.log(arr_li);

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


	/*creates the loader panel (while waiting for the results)*/
	function loader(build_bool, progress_loader = null, query_label=null){

		if (header_container != null) {
			if (build_bool) {
				if (query_label != null) {
					retain_box_value(input_box_container,query_label);
				}

				var abort_obj = progress_loader.abort;
				var str_html_abort = "";
				if (abort_obj != undefined) {
					str_html_abort = "<p><div id='abort_oscar' class='abort-oscar'><a class='allert-a' href="+abort_obj.href_link+">"+abort_obj.title+"</a></div></p>";
				}

				var title_obj = progress_loader.title;
				var str_html_title = "";
				if (title_obj != undefined) {
					str_html_title = "<p><div id='oscar_loader' class='oscarLoader'>"+title_obj+"</div></p>";
				}

				var subtitle_obj = progress_loader.subtitle;
				var str_html_subtitle = "";
				if (subtitle_obj != undefined) {
					str_html_subtitle = "<p><div class='oscarLoader subtitle'>"+subtitle_obj+"</div></p>";
				}

				var spinner_obj = progress_loader.spinner;
				var str_html_spinner = "";
				if ((spinner_obj != undefined) && (spinner_obj == true)){
					str_html_spinner = "<p><div class='oscarLoader loader-spinner'></div></p>";
				}

				var str_html = str_html_title + str_html_subtitle + str_html_spinner + str_html_abort;
				parser = new DOMParser()
				//var dom = parser.parseFromString(str_html, "text/xml").firstChild;
				//header_container.appendChild(dom);

				//extra_container.innerHTML = str_html;
				if (loader_container == null) {
					loader_container = document.createElement('div');
					loader_container.id = "loader_container";
    			loader_container.innerHTML = str_html;
					oscar_container.parentNode.insertBefore(loader_container,oscar_container);
				}else {
					loader_container.innerHTML = str_html;
				}


			}else {
				//var element = document.getElementById("search_loader");
				//element.parentNode.removeChild(element);
				if (loader_container != null) {
					loader_container.innerHTML = "";
				}
			}
		}
	}

	function update_html_from_ext_source(target_type, target_id, target_content, call_param_id) {
		var data_format = null;
		var dom_data = null;
		switch (target_type) {
			case 'view':
				_update_view_by_ext_data(target_id, target_content);
				break;

			default :
				_update_dom_by_ext_data(target_id, target_content);
				data_format = browser.get_ext_source_data_post()[target_content].param.data_param.format;
				dom_data = browser.get_ext_source_data_post()[target_content].data;
				break;
		}

		function _update_dom_by_ext_data(content_id,call_param_targets) {
			var ext_dom_container = document.getElementById(content_id);
			if (ext_dom_container != undefined) {
				var a_dom_data = browser.get_ext_source_data_post()[call_param_targets];
				if (a_dom_data != -1) {
						var val = a_dom_data.data.value;
						ext_dom_container.innerHTML = val;
						return val;
				}
			}
			return -1;
		}
		function _update_view_by_ext_data(view_key, ext_data_targets){

			if (view_container == undefined) {
				return -1;
			}
			var a_view_data = browser.get_ext_source_data_post()[ext_data_targets];

			//build the html DOM
			var a_view_div = _build_a_view_content(view_key, a_view_data);
			var a_view_dom = _populate_a_view_dom(view_key, a_view_data, a_view_div);

			function _build_a_view_content(view_key, a_view_data) {
				var view_div = document.getElementById(view_key);
				if (view_div == undefined){
					view_div = document.createElement("div");        // Create a <button> element
					view_div.setAttribute("id", view_key);
					if ('class' in a_view_data.param) {
						view_div.setAttribute("class", "view_elem "+a_view_data.param['class']);
					}
					view_container.appendChild(view_div);
				}
				return view_div;
			}
			function _populate_a_view_dom(view_key, a_view_data, a_view_div){
				var a_view_data_param = a_view_data.param;

				var is_updating = true;
				//reset it first
				if (document.getElementById(view_key+"_canavas") == undefined){
					//create it
					var canavas_dom = document.createElement("canvas");
					canavas_dom.setAttribute("id", view_key+"_canavas");
					if ('width' in a_view_data_param) {
						canavas_dom.style.width =  a_view_data_param.width;
					}
					if ('height' in a_view_data_param) {
						canavas_dom.style.height =  a_view_data_param.height;
					}
					a_view_div.appendChild(canavas_dom);
					is_updating = false;
				}
				document.getElementById(view_key+"_canavas").innerHTML = "";


				switch (a_view_data_param.type) {
					case 'chart':
						if (view_key in dict_charts) {
							if (dict_charts[view_key] != null) {
								console.log(dict_charts[view_key]);
								dict_charts[view_key].destroy();
								dict_charts[view_key] = __create_hor_chart_bars_dom(a_view_data, a_view_data_param, view_key);
								//__update_hor_chart_bars_dom(a_view_data, dict_charts[view_key]);
								//dict_charts[view_key].destroy();
								//dict_charts[view_key] = null;
							}
						}
						else {
							switch (a_view_data_param.style) {
								case 'bars':
									dict_charts[view_key] = __create_chart_bars_dom(a_view_data, a_view_data_param, view_key);
									break;
								case 'horizontalbars':
									dict_charts[view_key] = __create_hor_chart_bars_dom(a_view_data, a_view_data_param, view_key);

									break;
							}
						}
						break;
					default:
						break;
				}

				function __create_chart_bars_dom(a_view_data, param, view_key) {

					var canavas_dom = document.getElementById(view_key+"_canavas");

					var ctx = canavas_dom.getContext('2d');
					var chart_data = a_view_data.data.value;

					var myChart = new Chart(ctx, {
					    type: 'bar',
							data: {
								labels: chart_data.labels,
								datasets: chart_data.datasets,
							},
					    options: {
									responsive: true,
									tooltips: {
										mode: 'index',
										intersect: true
									},
									scales: __build_scales(chart_data)
					    }
					});
					return myChart;
				}
				function __create_hor_chart_bars_dom(a_view_data, param, view_key) {

					var canavas_dom = document.getElementById(view_key+"_canavas");

					var ctx = canavas_dom.getContext('2d');
					var chart_data = a_view_data.data.value;

					var myChart = new Chart(ctx, {
					    type: 'bar',
							data: {
								labels: chart_data.labels,
								datasets: chart_data.datasets,
							},
					    options: {
									responsive: true,
					        scales: __build_scales(chart_data)
					    }
					});

					return myChart;

				}
				/*function __update_hor_chart_bars_dom(a_view_data, mychart) {
					var chart_data = a_view_data.data.value;
					mychart.data.labels = chart_data.labels;
					//console.log(chart_data.datasets);
					//chart_data.datasets[1].data[0] = 4;
					console.log(chart_data);
					mychart.config.data = {labels: chart_data.labels, datasets: chart_data.datasets};
					console.log(mychart);
					mychart.update();

				}*/

				function __build_scales(chart_data) {
					var final_scales = {};
					var yAxes = [];
					var pos_axis = "left";
					for (var i = 0; i < chart_data.datasets.length; i++) {
						var ds_i = chart_data.datasets[i];
						yAxes.push({
							ticks: {
									beginAtZero:true
							},
							type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
							display: true,
							position: pos_axis,
							id: ds_i['yAxisID'],
							gridLines: {
								drawOnChartArea: false
							}
						});

						if (pos_axis == "left") {
								pos_axis = "right";
						}else {
							pos_axis = "left";
						}

					}
					final_scales['yAxes'] = yAxes;
					return final_scales;
				}
			}
		}
	}


	return {
		handle_menu: handle_menu,
		enable_oscar_menu: enable_oscar_menu,
		build_extra_comp: build_extra_comp,
		build_extra: build_extra,
		build_body: build_body,
		build_oscar: build_oscar,
		update_oscar_li: update_oscar_li,
		loader: loader,
		update_html_from_ext_source: update_html_from_ext_source
	}
})();
