################################################################################
# Author: Raghav Sharma                                                        #
# E-mail: Raghav_FTW@hotmail.com                                               #
#                                                                              #
# License: GNU General Public License v2.0                                     #
#                                                                              #
# A subtitle downloader using the www.opensubtitles.org API                    #
# Look http://trac.opensubtitles.org/projects/opensubtitles for more details.  #
#                                                                              #
# Copyright (C) 2015 Raghav Sharma                                             #
#                                                                              #
# This program is free software; you can redistribute it and/or modify         #
# it under the terms of the GNU General Public License as published by         #
# the Free Software Foundation; either version 2 of the License, or            #
# (at your option) any later version.                                          #
#                                                                              #
# This program is distributed in the hope that it will be useful,              #
# but WITHOUT ANY WARRANTY; without even the implied warranty of               #
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the                #
# GNU General Public License for more details                                  #
################################################################################
import collections
import operator
import itertools
import xmlrpclib
import logging

server_url = "http://api.opensubtitles.org/xml-rpc"
user_agent = "OSTestUserAgent"  # Test user agent, you should request a new one.

server = xmlrpclib.Server(server_url)


# This is our custom rating algorithm, to find the best suitable sub
# in a list of dictionaries. It inserts our calculated rating value in
# the dictionary and returns the list.
def rating_algorithm(data):
    for i in data:
        i['rating_algo'] = 0
        if int(i['SubBad']) > 0:
            i['rating_algo'] -= 5
        rating = float(i['SubRating'])
        if 4.0 > rating > 0.0:
            i['rating_algo'] -= 5
        else:
            i['rating_algo'] += round(rating)
        if i['UserRank'] == "administrator" or i['UserRank'] == "trusted":
            i['rating_algo'] += 1
    return data


# OpenSubtitles DB is fucked up, it returns multiple results and
# sometimes of different movies/series. So we have to do a lot of
# shit to find the best sub.
def search_sub(data):
    try:
        login_data = _login("eng")
        token = login_data['token']
        result = server.SearchSubtitles(token, data)

        if result['status'] != "200 OK":
            print ("Server returned: '" + result['status'] + "' while \
                        searching for sub")
            return None

        data = result['data']

        if not data:
            print ("Couldn't find subtitle for this file.")
            return None

        # Gets the two most common movie from result by matching
        # their imdb ids.
        # (Like I said, sometimes there can be different movies
        # in result, so we use the most common movie one (by
        # checking their IMDB ids) and use that. We get the 2nd
        # most common to check if the count of 1 & 2 are not equal,
        # in that case we use the original result.
        c = collections.Counter(i['IDMovieImdb'] for i in data)
        most_common = c.most_common(2)
        movie_count = len(most_common)

        # We choose the most common movie if the count of
        # 1st & 2nd are different. [0][0] is IMDb id and
        # [0][1] is count of those IMDb ids in result
        is_most_common = (movie_count == 1 or
                          (movie_count > 1 and
                           most_common[0][1] != most_common[1][1]))
        if is_most_common:
            data = [i for i in data if i['IDMovieImdb'] == most_common[0][0]]

        data = rating_algorithm(data)

        # We sort the data on the basis of our rating algorithm
        # and sub add date(Assuming the latest sub would be better)
        sorted_data = sorted(data, key=lambda k: (float(k['rating_algo']), k['SubAddDate']), reverse=True)

        # group sorted data by IMDb ids
        grouped_data = []
        for key, items in itertools.groupby(sorted_data, operator.itemgetter('IDMovieImdb')):
            grouped_data.append(list(items))

        return grouped_data
    except Exception as e:
        logging.error("An error occurred while searching sub: %s" % e)


# This will end the session id.
# This is totally unnecessary to call, but OCD.
def _logout(token):
    try:
        server.LogOut(token)
    except Exception as e:
        logging.error("An error occurred while logging out: %s" % e)


def _login(lang, username="", password=""):
    try:
        result = server.LogIn(username, password, lang, user_agent)
        return result
    except Exception as e:
        logging.error("An error occurred while logging in: %s" % e)
