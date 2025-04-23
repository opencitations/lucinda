# HF template manual
The HF file is formed by blocks, each block **MUST** contain the **#id** attribute.

## First/Main block

– **\[MADATORY\]** define the **#url** attribute to define the URL regex that matches the corresponding resource. This value should also contain the variable to use in the rest of the hf file representing the resource to browse, e.g. `#url my/resource/is/{rsc_id}` the variable `br_id` will be refered to as `rsc_id` and as `[[rsc_id]]` in the sparql query definition.

– **\[OPTIONAL]** define the **#extdata** attribute to define a JS method to call for getting additional external data. This method is called at the end, once all the SPARQL queries are done. The definition of this attribute should follow the following syntax `<var_name>:<method()>`:
- `<var_name>`: the name of the variable to use in order to get the corresponding related values
- `<method()>`: a JS method to build/get the external data. This method takes __no params__ and should be defined in the custom JS addon file ([see step 4 in the LUCINDA Configuration](README.md)). Follow [JS addon guidelines](man_jsadddon.md) to correctly define this method.
E.G. `addinfo:get_additional_info()`

### Example:
```
#id main
#url br/{br_id}
#extdata addinfo:get_additional_info()
```

## SPARQL queries
Each other block that needs to call a sparql endpoint must define the following attributes:
- **#endpoint** – defines the url of the sparql endpoint
- **#method** – the HTTP method to use *get | post*
- **#sparql** – defines the SPARQL to call in the endpoint. The parameters defined in the first block (after the preprocessing operations, if any) could be used inside the SPARQL query with the syntax: `[[<var>]]`, e.g. `[[rsc_id]]`

### Example:
```
#endpoint https://opencitations.net/index/sparql
#sparql PREFIX cito: <http://purl.org/spar/cito/>
SELECT ?citing WHERE {
    ?oci cito:hasCitedEntity <https://w3id.org/oc/meta/br/[[br_id]]> .
    ?oci cito:hasCitingEntity ?citing .
}
```

## Pre/Post processing
Each block can pre and post process the its values:
– **#preprocess** – calls a function that must be defined in the addon JS file with the corresponding params of the variables to preprocess (if any). e.g. `strip(rsc_id)`. Follow [JS addon guidelines](man_jsadddon.md) to correctly define this method.
– **#postprocess** – calls a function that must be defined in the addon JS file with NO parameters, the function should postprocess the results of the query (if needed). e.g `postp_results()`. Follow [JS addon guidelines](man_jsadddon.md) to correctly define this method.

### Example:
```
#preprocess strip(br_id)
#postprocess post_ocindex_call()
```
