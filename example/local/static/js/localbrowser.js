
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
  new_data["spino"] = "ciao";
  return new_data;
}



/*
functions to get external data, should always take "...args" as param
args[0] = data,
args[1] = callback function
args[2:] = to be added when calling the callback + the result
*/
function get_additional_info(...args) {
  console.log("Calling a function to get exteranldata <get_additional_info()>, ","on:",args[0]);

  const url = "https://w3id.org/oc/meta/api/v1/metadata/doi:10.1007/978-1-4020-9632-7";
  fetch(url)
      .then(response => {return response.json();})
      .then(data => {
          if (data.length > 0) {
              var new_value = "Publisher retrieved via Api is : "+data[0].publisher;
              args[1](new_value,...args.slice(2));
          }
      })
      .catch(error => {
        var new_value = "error while retrieving data!";
        args[1](new_value,...args.slice(2));
      });
}
