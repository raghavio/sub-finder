from flask import render_template, request, jsonify
from subfinder import app
import opensubtitles


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
    result = {'file': file_name, 'data': sub_data}
    return jsonify(result), 200
