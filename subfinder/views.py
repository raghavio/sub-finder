from flask import render_template, request, jsonify
from subfinder import app
import opensubtitles
import requests

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/hash")
def get_hash():
    hash = request.args['hash']
    file_name = request.args['fileName']
    file_size = request.args['fileSize']
    search_data = [{'moviehash': hash, 'moviebytesize': file_size, 'sublanguageid': 'eng'}]
    sub_data = opensubtitles.searchSub(search_data)
    for data in sub_data:
        imdb_data = _get_imdb_data(data['IDMovieImdb'])
        data['plot'] = imdb_data['Plot']
        data['poster'] = imdb_data['Poster']
    result = {'file': file_name, 'data': sub_data}
    return jsonify(result), 200


def _get_imdb_data(imdb_id):
    imdb_id = "tt" + "%07d" % int(imdb_id)
    payload = {"i": imdb_id, "plot": "full"}
    r = requests.get("http://www.omdbapi.com", params=payload)
    imdb_data = r.json()
    return imdb_data
