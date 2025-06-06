# HTML template manual

## View functions
- A view function can be called from the resource HTML template following this syntax:
```[[Lucinda:<view_method>(<view_arg{0}>,<view_arg{1}>...)]]```
- View functions could be nested
- New view functions could be defined in the JS addon file, following [the corresponding guidelines](man_jsaddon.md)


### Arguments
Lucinda handles three types of variables, to be used in the HTML page:
- **Lucinda data frame**: defined as `<HF_BLOCK_ID>.<ATTRIBUTE>`, e.g. `docdata.title`
- **Lucinda data**: defined as `_DATA_(<JS_DATA>)`, e.g. `_DATA_(["a","b"])`
- **Lucinda html content**: defined as `_HTML_(<HTML_CONTENT>)`, e.g. `_HTML_(<p>Hi!</p>)`

### Example :
```
[[ Lucinda:_HTML_(<h1>This is the title</h1>) ]]
```

### Example (nested view):
```
[[Lucinda:concat(
  _HTML_(<i>Publisher retrieved via Api is :</i>),
  main.addinfo
)]]
```


## Registered View Functions

#### \_HTML\_()
Takes a random number of string arguments, variable values are not supported.
- **Returns:** an HTML string (if different arguments are given the values are concatanated)
- **Example:** `[[Lucinda:_HTML_(<h1>My new website is<i>The best web site</i></h1>)]]`

#### val()
Takes a random number of variables as arguments.
- **Returns:** the textual value of the given variables (if different arguments are given the values are concatanated)
- **Example:** `[[Lucinda:val(meta.title)]]`

#### table()
Takes one argument, in the form of a list (or a matrix) and converts it into an HTML table
- **Returns:** an HTML table following the original the data structure/organisation of the given argument value
- **Example:** `[[Lucinda:table(meta.author)]]`

#### concat()
Takes a random number of arguments and concat them.
- **Returns:** an HTML content build from the concatanation of the argument values
- **Example:**
```
[[Lucinda:concat(
    _HTML_(<h2>The authors of this BR are: <h2>),
    table(meta.author),
    _HTML_(<br>)
)]]
```

#### ifcond()
Apply a condition and generates a then/else corresponding result
- **Returns:** the corresponding value in the *then* or *else* statement following the condition result
- **Example:**  
```
[[Lucinda:ifcond(
  meta.title !== null,
  text(meta.title),
  htmlcontent(<span>Resource with no title</span>)
)]]
```
