/*
    A simple Web application that allows to insert data into MySQL 
    table and also reads and displays the data that was entered.

    Start a webserver with two routes (one for displaying data, 
        one for taking user input), and pass user input to the database
        and database results to the webpage.
*/

'use strict'

var mysql = require('mysql'),
    http = require('http'),
    url = require('url'),
    querystring = require('querystring');

// Start a web server on port 8888. Requests go to function handleRequest

http.createServer(handleRequest).listen(8888);

// Page HTML as one big string, with placeholder "DBCONTENT" for data from the DB

function handleRequest(request, response){
    var pageContent = '<html>' + 
                    '<head>' + 
                    '<meta http-equiv="Content-Type">' +
                    '<content="text/html"; charset=UTF-8 />' +
                    '</head>' + 
                    '<body>' +
                    '<form action="/add" method="post">' +
                    '<input type="text" name="content">' +
                    '<input type="submit" value="Add content">' +
                    '</form>' +
                    '<div>' +
                    '<strong>Content in database:</strong>' +
                    '<pre>' +
                    'DBCONTENT' +
                    '</pre>' +
                    '</div>' +
                    '<form action="/" method="get">' +
                    '<input type="text" name="q">' +
                    '<input type="submit" value="Filter content">' +
                    '</form>' +
                    '</body>' +
                    '</html>';

    // Parsing the requested URL path in order to distinguish between the '/' and the '/add' route
    var pathname = url.parse(request.url).pathname;

    // User wants to add content to the database (POST request to /add)
    if(pathname == '/add'){
        var requestBody = '';
        var postParameters;

        request.on('data', function(data){
            requestBody += data;
        });

        request.on('end', function(){
            postParameters = querystring.parse(requestBody);

            // The content to be added is in POST parameter "content"
            addContentToDatabase(postParameters.content, function(){
                // Redirect back to homepage when the database has finished adding the new content to the database
                response.writeHead(302, {'Location':'/'});
                response.end();
            });
        });
    
        // User wants to read data from the database (GET request to /)
    } else {
    
        // The text to use for filtering is in GET parameter "q"
        var filter = querystring.parse(url.parse(request.url).query).q;

        getContentsFromDatabase(filter, function(contents){
            response.writeHead(200, {'Content-Type':'text/html'});

            // Poor man's templating system : Replace "DBCONTENT" in page HTML with the actual content we received from the database
            response.write(pageContent.replace('DBCONTENT', contents));
            response.end();
        });
    }
}


// Function that is called by the code that handles the /route and retrieves contents from the database, applying a LIKE filter 
// if one is supplied
function getContentsFromDatabase(filter, callback){
    var connection = mysql.createConnection({
        host:'localhost',
        user:'root',
        password:'root',
        database:'node'
    });

    var query;
    var resultAsString = '';

    if(filter){
        query = connection.query('SELECT id, content FROM test ' + 
                                'WHERE content LIKE "' + filter + '%"');
    } else {
        query = connection.query('SELECT id, content FROM test');
    }

    //Streaming API
    query.on('error', function(err){
        console.log('A database error occured:');
        console.log(err);
    });


    query.on('result', function(result){
        resultAsString += 'id: ' + result.id;
        resultAsString += ', content: ' + result.content;
        resultAsString += '\n';
    });

    // When we have worked through all results, we call the callback with our completed string
    query.on('end', function(result){
        connection.end();
        callback(resultAsString);
    });
}

// Function that is called by the code that handles the /add route  
// and inserts the supplied string as a new content entry

function addContentToDatabase(content, callback){
    var connection = mysql.createConnection({
        host:'localhost',
        user:'root',
        password:'root',
        database:'node'
    });

    connection.query('INSERT INTO test (content)' +
    'VALUES ("' + content + '")', function(err){
        if(err){
            console.log('Could not insert content "' + content + '" into database');
        }
        callback();
    });
}