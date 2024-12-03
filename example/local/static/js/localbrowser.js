
/*
You can also upgrade Lucinda_view with new type of views.
each new view function must take <args> and collect values from <this.data>.
*/

// Add a new method <capitalizetext>
Lucinda_view.prototype.capitalizetext = function (...args) {
  try {
    var text = [];
    for (const arg of args) {
      text.push(arg.toUpperCase());
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
function strip(...args) {
  console.log("Calling a preprocess function <strip()> on:", args);
  if (args.length !== 0) {
    return args.join(" ");
  }
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
To access the data use:
Lucinda.data

Once done call the following function with the id and the value:
Lucinda.build_extdata_view

E.G. Lucinda.build_extdata_view("main.myextdata","THIS IS THE NEW VALUE")
*/
function get_additional_info() {
  console.log("Calling a function to get exteranldata <get_additional_info()>, ","on:",Lucinda.data);

  var new_value = "external value: ID:"+Lucinda.data.meta.id;
  Lucinda.build_extdata_view("main.addinfo",new_value);
  return true;

  // const url = "https://w3id.org/oc/meta/api/v1/metadata/doi:10.1007/978-1-4020-9632-7";
  // fetch(url)
  //     .then(response => {return response.json();})
  //     .then(data => {
  //         if (data.length > 0) {
  //             var new_value = "Publisher retrieved via Api is : "+data[0].publisher;
  //             Lucinda.build_extdata_view("main.addinfo",new_value);
  //         }
  //     })
  //     .catch(error => {
  //       var new_value = "error while retrieving data!";
  //       Lucinda.build_extdata_view("main.addinfo",new_value);
  //     });
}
