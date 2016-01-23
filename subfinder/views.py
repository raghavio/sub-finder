from flask import render_template
from subfinder import app


@app.route("/")
def index():
    return render_template("index.html")
