from flask import render_template, request, json, Response
from subfinder import app
import opensubtitles
import requests


def _get_imdb_data(imdb_id):
    imdb_id = "tt" + "%07d" % int(imdb_id)
    payload = {"i": imdb_id}
    r = requests.get("http://www.omdbapi.com", params=payload)
    imdb_data = r.json()
    return imdb_data


def stream_template(template_name, **context):
    app.update_template_context(context)
    t = app.jinja_env.get_template(template_name)
    rv = t.stream(context)
    rv.enable_buffering(2)
    return rv


@app.route("/", methods=['GET', 'POST'])
def index():
    if request.method == "POST":
        form_data = json.loads(request.form['data'])
        dataa = form_data['data']

        def files(data):
            for fileData in data:
                hash = fileData['hash']
                file_name = fileData['fileName']
                file_size = fileData['fileSize']
                search_data = [{'moviehash': hash, 'moviebytesize': file_size, 'sublanguageid': 'eng'}]
                sub_data = opensubtitles.search_sub(search_data)
                if sub_data:
                    for imdb in sub_data:
                        imdb_data = _get_imdb_data(imdb[0]['IDMovieImdb'])
                        imdb[0].update(imdb_data)
                    result = {'file': file_name, 'data': sub_data}
                else:
                    result = {'file': file_name, 'error': "Could not find subtitle"}
                yield result
        return Response(stream_template("index.html", files=files(dataa)))

    return render_template("index.html")