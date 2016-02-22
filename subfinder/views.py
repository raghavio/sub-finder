from flask import render_template, request, json, Response
from subfinder import app
import opensubtitles
import requests

all_languages = {'Arabic': 'ara', 'Bulgarian': 'bul', 'Dutch': 'dut', 'English': 'eng', 'French': 'fre',
                 'German': 'ger',
                 'Greek': 'ell', 'Hungarian': 'hun', 'Italian': 'ita', 'Polish': 'pol', 'Portuguese': 'por',
                 'Portuguese_BR': 'pob', 'Romanian': 'rum', 'Russian': 'rus', 'Spanish': 'spa', 'Turkish': 'tur'}


def _get_imdb_data(imdb_id):
    imdb_id = "tt" + "%07d" % int(imdb_id)
    payload = {"i": imdb_id}
    r = requests.get("http://www.omdbapi.com", params=payload)
    imdb_data = r.json()
    return imdb_data


def _get_tmdb_data(imdb_id):
    imdb_id = "tt" + "%07d" % int(imdb_id)
    payload = {"external_source": "imdb_id", "api_key": app.config['MOVIEDB_API_KEY']}
    r = requests.get("http://api.themoviedb.org/3/find/%s" % imdb_id, params=payload)
    return r.json()


def _get_poster_url_from_tmdb(tmdb_data, width):
    image_path = None
    for key, value in tmdb_data.iteritems():
        for data in value:
            if 'poster_path' or 'still_path' in data:
                image_path = data.get('poster_path') or data.get('still_path')
    if not image_path:
        return None
    tmdb_image_url = "http://image.tmdb.org/t/p/w%s/%s" % (width, image_path)
    return tmdb_image_url


def _stream_template(template_name, **context):
    app.update_template_context(context)
    t = app.jinja_env.get_template(template_name)
    rv = t.stream(context)
    rv.disable_buffering()
    return rv


@app.route("/", methods=['GET', 'POST'])
def index():
    selected_language = request.cookies.get('language') or all_languages['English']
    if request.method == "POST":
        form_data = json.loads(request.form['data'])
        language = request.form['language']  # language user selected
        data = form_data['data']

        def files(data):
            for i, fileData in enumerate(data):
                hash = fileData['hash']
                file_name = fileData['fileName']
                file_size = fileData['fileSize']
                search_data = [{'moviehash': hash, 'moviebytesize': file_size, 'sublanguageid': language}]
                sub_data = opensubtitles.search_sub(search_data)
                if sub_data:
                    for imdb in sub_data:
                        imdb_data = _get_imdb_data(imdb[0]['IDMovieImdb'])
                        tmdb_data = _get_tmdb_data(imdb[0]['IDMovieImdb'])

                        imdb[0]['poster_tmdb'] = _get_poster_url_from_tmdb(tmdb_data, width=300)
                        imdb[0].update(imdb_data)
                    result = {'file': file_name, 'data': sub_data}
                else:
                    result = {'file': file_name, 'error': "Could not find subtitle"}
                yield (result, i + 1)

        resp = Response(
            _stream_template("index.html", files=files(data), total_files=len(data), languages=all_languages,
                             selected_language=language))
        if selected_language != language:
            resp.set_cookie('language', language)  # Store language in cookie if it is different than default
        return resp

    return render_template("index.html", total_files=0, files=[], languages=all_languages,
                           selected_language=selected_language)
