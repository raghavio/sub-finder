from flask import render_template, request, json, Response
from subfinder import app
import opensubtitles
import requests
from . import red


@app.route("/")
def index():
    return render_template("index.html")


def event_stream():
    pubsub = red.pubsub()
    pubsub.subscribe('sub-data')
    # TODO: handle client disconnection.
    for message in pubsub.listen():
        yield 'data: %s\n\n' % message['data']


@app.route("/api/hash", methods=['POST'])
def get_hash():
    data = json.loads(request.form['data'])
    for fileData in data['data']:
        print fileData
        hash = fileData['hash']
        file_name = fileData['fileName']
        file_size = fileData['fileSize']
        search_data = [{'moviehash': hash, 'moviebytesize': file_size, 'sublanguageid': 'eng'}]
        sub_data = opensubtitles.search_sub(search_data)
        for imdb in sub_data:
            imdb_data = _get_imdb_data(imdb[0]['IDMovieImdb'])
            imdb[0]['plot'] = imdb_data['Plot']
            imdb[0]['poster'] = imdb_data['Poster']
        result = {'file': file_name, 'data': sub_data}
        red.publish("sub-data", u'%s' % result['file'])
    return Response(status=204)


@app.route('/stream')
def stream():
    return Response(event_stream(), mimetype="text/event-stream")


def _get_imdb_data(imdb_id):
    imdb_id = "tt" + "%07d" % int(imdb_id)
    payload = {"i": imdb_id, "plot": "full"}
    r = requests.get("http://www.omdbapi.com", params=payload)
    imdb_data = r.json()
    return imdb_data
