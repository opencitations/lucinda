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
  - Create a directory to store your custom Lucinda files. For best practices, place this directory within your static folder, such as `static/browser/`.

- **2.** In case you have a custom JS addon file, create it in your custom Lucinda directory and it right after the Lucinda JS previously imported:
  ```
  <script type="text/javascript" src="path/to/lucinda.js"></script>
  <script type="text/javascript" src="path/to/lucinda_custom_dir/my_lucionda_addon.js"></script>

- **3.** Define your resource template(s):
  - Create a templates directory within your custom Lucinda directory, such as `static/browser/templates/`.
  - Each template is defined by two files, to be added in the directory just created:
    - HF file, have a look at the guidelines on how to correctly define it (TBA).
    - HTML file, have a look at the guidelines on how to correctly define it (TBA).

- **4.** Run Lucinda:
  - From your browsing page (of step **(1)**), add `<script>` block right after the imported JS modules and set the default configurations of Lucinda (have a look at the guidelines on how to correctly do this (TBA) ):
  ```
  Lucinda.init({
      templates_url: "/static/browser/templates/",
      templates: [
        "br_any_browser",
        ...
      ]
  });
  ```
  - Run lucinda right after:
  ```
  Lucinda.run();
  ```
