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

import xmlrpclib

server_url = "http://api.opensubtitles.org/xml-rpc"
user_agent = "OSTestUserAgent"  # Test user agent, you should request a new one.

server = xmlrpclib.Server(server_url)


# This is our custom rating algorithm, to find the best suitable sub
# in a list of dictionaries. It inserts our calculated rating value in
# the dictionary and returns the list.
def ratingAlgorithm(data):
    for i in data:
        i['ratingAlgo'] = 0
        if int(i['SubBad']) > 0:
            i['ratingAlgo'] -= 5
        rating = float(i['SubRating'])
        if 4.0 > rating > 0.0:
            i['ratingAlgo'] -= 5
        else:
            i['ratingAlgo'] += round(rating)
        if i['UserRank'] == "administrator" or i['UserRank'] == "trusted":
            i['ratingAlgo'] += 1
    return data


# OpenSubtitles DB is fucked up, it returns multiple results and
# sometimes of different movies/series. So we have to do a lot of
# shit to find the best sub.
def searchSub(data):
    try:
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
        mostCommon = c.most_common(2)
        movieCount = len(mostCommon)

        # We choose the most common movie if the count of
        # 1st & 2nd are different. [0][0] is IMDb id and
        # [0][1] is count of those IMDb ids in result
        isMostCommon = (movieCount == 1 or
                        (movieCount > 1 and
                         mostCommon[0][1] != mostCommon[1][1]))
        if isMostCommon:
            data = [i for i in data if i['IDMovieImdb'] == mostCommon[0][0]]

        data = ratingAlgorithm(data)

        # We sort the data on the basis of our rating algorithm
        # and sub add date(Assuming the latest sub would be better)
        sortedData = sorted(data,
                            key=lambda k: (float(k['ratingAlgo']),
                                           k['SubAddDate']),
                            reverse=True)
        return sortedData
    except Exception as e:
        print ('An error occured while searching sub: %s') % e


# This will end the session id.
# This is totally unnecessary to call, but OCD.
def _logout(token):
    try:
        server.LogOut(token)
    except Exception as e:
        print ('An error occured while logging out: %s') % e


def _login(lang, username="", password=""):
    try:
        result = server.LogIn(username, password,
                              lang, user_agent)
        return result
    except Exception as e:
        print ('An error occured while logging in: %s') % e


loginData = _login("eng")
token = loginData['token']
