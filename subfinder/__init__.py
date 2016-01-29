from flask import Flask
import redis

app = Flask(__name__)
red = redis.StrictRedis()

from subfinder import views
