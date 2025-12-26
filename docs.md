TO DO:

Make use of custom Error Classes.
In BaseWatcher, you need to deal with what happens when the server crashes, regarding the redis streams. They will still be open without the server running.
Fix the database-sql.ts.