TODO:

Implement custom date filters:
for graphs, adjust the tables data coming from the requests


create a matrix for testing packages:
need to check that every package works as normal for different versions with the package (maybe do it for one package and then reuse instead of multile tests for multiple packages at the same time)

clean the code for the landing website, it is very messy.

setup the docs for the package, it is not that much actually

test the migrations (especially mysql2 first) for the package, make it known that mysql2 is the only connector supported for the package databses saving, but not for recording, they can still use prisma or whatever database but it will end up in the mysql2 connection.


understand better how the commonjs works and how to adjust it for esm. remember there are problems with ts-node-dev, maybe use the latest version of node since it can run typescript directly. you will need to compile and test it in javascript. maybe make everything a require instead of import initially and then adjust it for imports also 



NEW:
Implement Redis Streams for insert/search
Remove the datezone from mysql connection, try to normalize it inside the package (adjust the graphs dates at the bottom).
Allow for zooming into graph dates, similar to nightwatch.
Implement search based on page ling rather than direct requests.
Implement a user friendly package selector, route blocker inside the ui.
Clean types.d.ts

Today:
Make sure that the package works with both cjs or that it works with import and require. 