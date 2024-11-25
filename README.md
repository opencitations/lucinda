<img src="doc/lucinda_logo.svg" alt="drawing" width="350"/>

### The OpenCitations RDF Resource Browser (v3.0)
Lucinda is a general RDF-resource browser which could be configured to work with any triplestore providing a SPARQL-endpoint address. In this repository you can find few [examples](examples/) of Lucinda usage. Lucinda was first presented at [Wikicite2018](https://meta.wikimedia.org/wiki/WikiCite_2018).

# LUCINDA Configuration

- **1.** In your HTML browsing page, do the following things:
  - Insert in your HTML page the following block:
  ```<div id="__lucinda__"></div>```
  - Import Lucinda CSS file in your `<head>`:
  ```<link href="path/to/lucinda.css" rel="stylesheet">```
  - Import Lucinda JS at the end of your HTML file (typically after the `<footer>`):
  ```<script type="text/javascript" src="path/to/lucinda.js"></script>```
  - In case you have a custom JS addon file, import it right after the Lucinda JS previously imported:
  ```
  <script type="text/javascript" src="path/to/lucinda.js"></script>
  <script type="text/javascript" src="../static/js/my_lucionda_addon.js"></script>
  ```

- **2.** Define your resource template(s), each template is defined by:
  - HF file, have a look at the guidelines on how to correctly define it.
  - HTML file, have a look at the guidelines on how to correctly define it.

- **3.** Run Lucinda:
  - From your browsing page (of step **(1)**), add `<script>` block right after the imported JS modules and set the default configurations of Lucinda (have a look at the guidelines on how to correctly do this):
  ```
  Lucinda.init({
      url_base: "/browser",
      templates: [
        "brbrowser"
      ]
  });
  ```
  - Run lucinda right after:
  ```
  Lucinda.run();
  ```
