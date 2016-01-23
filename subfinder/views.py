from flask import render_template, request, jsonify
from subfinder import app


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/hash")
def get_hash():
    data = {'file': request.args['fileName'], 'hash': request.args['hash']}
    return jsonify(data), 200
