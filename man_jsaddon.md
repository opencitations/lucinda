# JS addon manual

## External data methods

- The method definition must follow this syntax ```<name_of_method>(...args)```. e.g. ```get_extdata(...args)``` (this method takes no custom param)
- This method could be called only from the main block of the HF file
- To access the data of Lucinda (from the other blocks) call `Lucinda.data`, e.g. `Lucinda.data.meta.id` (this is used to get the `id` returned and defined inside the `meta` block)
- Once done call `Lucinda.build_extdata_view` with the spreaded `...args` and the new value. e.g.
`e.g. Lucinda.build_extdata_view(...args,"THIS IS THE NEW VALUE")`

*Note: The args[0] corresponde to the <block_id>.<ext_data_id>*

### Example:
```
function get_additional_info(...args) {
  fetch("https://api.to.get.data/val")
      .then(response => {return response.json();})
      .then(data => {
          if (data) {
              Lucinda.build_extdata_view(...args,data);
          }
      })
      .catch(error => {
        Lucinda.build_extdata_view(...args,"");
      });
}
```

## Preprocess methods
- The method definition must follow this syntax ```<pre_process_method>(...args)```. e.g. ```strip(...args)```.
- The parameters `args` follow the order of the variables defined in the HF file. e.g. if `pre_process(id)` then `args[0]` is the value of the `id` variable.
- The returned value must be a list with the same length and corresponding positions of args, or null in case something wrong happend.

### Example
```
function strip(...args) {
  if (args.length === 0) return [];
  return args
    .filter(arg => typeof arg === 'string')
    .map(str => str.trim());
}
```

## Postprocess methods
- The method definition must follow this syntax ```<post_process_method>(...args)```. e.g. ```post_normalize(...args)```.
- The parameters `args` follow the order of the variables defined in the HF file. e.g. if `post_normalize(title,author)` then `args[0]` is the value of the `?title` and `args[1]` is the value of the `?author`, resulted from the sparql query.
- The returned value must be a list with the same length and corresponding positions of args, or null in case something wrong happend.

### Example
```
function post_ocmeta_call(...args) {
  const [title, author] = args;

  let processedAuthor = author;
  if (author != null) { processedAuthor = author.split(";"); }

  let processedTitle = title;
  if (title != null) { processedTitle = `[Postprocessed title >] ${title}`; }

  return [processedAuthor, processedTitle];
}
```


## View functions
- The method definition must follow this syntax ```Lucinda_view.prototype.<view_method> = function(...args)```. e.g. ```Lucinda_view.prototype.capitalizetext = function (...args)```.
- The returned value must be string in HTML format, or an empty string.

### Example
```
Lucinda_view.prototype.capitalizetext = function (...args) {
  try {
    var text = [];
    for (const arg of args) { text.push(arg.toUpperCase()); }
    return text.join(", ");
  } catch (e) {
    return "";
  }
};
```
