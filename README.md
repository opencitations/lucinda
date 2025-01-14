<img src="doc/lucinda_logo.svg" alt="drawing" width="350"/>

### The OpenCitations RDF Resource Browser (v3.0)
Lucinda is a general RDF-resource browser which could be configured to work with any triplestore providing a SPARQL-endpoint address. In this repository you can find few [examples](examples/) of Lucinda usage. Lucinda was first presented at [Wikicite2018](https://meta.wikimedia.org/wiki/WikiCite_2018).

# LUCINDA Configuration

- **1.** Copy the CSS and JS files contained in the `lucinda` directory into your `static` directory (typically CSS file into `static/css` and JS file into `static/js`)

- **2.** In your HTML browsing page, do the following things:
  - Import Lucinda CSS file in your `<head>`:
  ```<link href="path/to/lucinda.css" rel="stylesheet">```
  - Insert in the `<body>`:
  ```<div id="__lucinda__"></div>```
  - Import Lucinda JS file at the end of your HTML file (typically in `<footer>`):
  ```<script type="text/javascript" src="path/to/lucinda.js"></script>```
  - Create a directory to store your custom Lucinda files. For best practices, place this directory within your static folder, such as `static/browser/`.

- **3.** In case you have a custom JS addon file, add it to your custom Lucinda directory and import it right after the Lucinda JS previously imported:
  ```
  <script type="text/javascript" src="path/to/lucinda.js"></script>
  <script type="text/javascript" src="path/to/lucinda_custom_dir/my_lucionda_addon.js"></script>
  ```

- **4.** Define your resource template(s):
  - Create a templates directory within your custom Lucinda directory, such as `static/browser/templates/`.
  - Each template is defined by two files, to be added in the directory just created:
    - **HF file**, have a look at the guidelines on how to correctly define it (TBA).
    - **HTML file**, have a look at the guidelines on how to correctly define it (TBA).

- **4.** Run Lucinda:
  - From your browsing page (step **(1)**), add `<script>` block right after the imported JS modules (step **(3)**) and set the default configurations of Lucinda (have a look at the guidelines on how to correctly do this (TBA) ):
  ```
  Lucinda.init({
      templates_url: "/static/browser/templates/",
      templates: [
        "br_any_browser",
        ...
      ]
  });

  Lucinda.run();
  ```
