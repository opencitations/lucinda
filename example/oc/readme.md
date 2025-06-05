## Local run

open the terminal on the corresponding directory

first start the server:
`python3 -m http.server 8000`

from your browser run:
`http://localhost:8000/html_template/home.html`

**Note:** in case you have CORS problems run your browser with no-cors. On mac you should run Chrome for instance using this command `open -na "Google Chrome" --args --disable-web-security --user-data-dir="/tmp/chrome-no-cors"`
