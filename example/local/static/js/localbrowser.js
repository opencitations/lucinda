
/*
You can also upgrade Lucinda_view with new type of views.
each new view function must take <args> and collect values from <this.data>.
*/

// Add a new method <capitalizetext>
Lucinda_view.prototype.capitalizetext = function (args) {
  try {
    var text = [];
    for (let i = 0; i < args.length; i++) {
      text.push(this.data[args[i]].toUpperCase());
    }
    return text.join(", ");
  } catch (e) {
    return "";
  }
};




/*
preprocess functions must always return an obj;
each key represent a param and its corresponding value;
*/

function generate_id_search(id){
  console.log("Calling a preprocess function <generate_id_search()>, ","on:",id);
  return null;
}


/*
postprocess functions must always take ONLY the data returned by the query as @param;
returns a transformed new version of data;
*/
function create_metadata_output(data){
  console.log("Calling a postprocess function <create_metadata_output()>, ","on:", data);
  var new_data = data[0];
  new_data["postprocess_value"] = "my_post_process_value";
  return new_data;
}
