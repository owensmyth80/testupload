const express = require('express');
const fs = require('fs');
const path = require('path');
const { FtpSrv } = require('ftp-srv');

const app = express();
const PORT = process.env.PORT || 3000;

// Define the regex pattern for matching filenames
function shouldMoveFile(filename) {
    //const regexPattern = /^131|132|141|142|151|152|161|162|171|172|181|182|191|192|201|202|211|212|221|222|231|232|241|242|251|252|261|262|271|272|281|282|291|292|301(CW|L|RN|CN|LK|SO|CE|LS|TN|C|LM|TS|D|LD|W|DL|LH|WD|G|MO|WH|KY|MH|WX|KE|MN|WW)[1-9]\d{0,4}\.jpg$/;
    //const regexPattern1 = /^(131|132|141|142|151|152|161|162|171|172|181|182|191|192|201|202|211|212|221|222|231|232|241|242|251|252|261|262|271|272|281|282|291|292|301)(CW|L|RN|CN|LK|SO|CE|LS|T|C|LM|D|LD|W|DL|LH|WD|G|MO|WH|KY|MH|WX|KE|MN|WW)\d{1,5}\.jpg$/;
    //leading 0 after the letters
    //const regexPattern2 = /^(00|01|02|03|04|05|06|07|08|09|10|11|12|87|88|89|90|91|92|93|94|95|96|97|98|99)(CW|L|RN|CN|LK|SO|CE|LS|TN|C|LM|TS|D|LD|W|DL|LH|WD|G|MO|WH|KY|MH|WX|KE|MN|WW)\d{1,5}\.jpg$/;
    const regexPattern1 = /^(131|132|141|142|151|152|161|162|171|172|181|182|191|192|201|202|211|212|221|222|231|232|241|242|251|252|261|262|271|272|281|282|291|292|301)(CW|L|RN|CN|LK|SO|CE|LS|T|C|LM|D|LD|W|DL|LH|WD|G|MO|WH|KY|MH|WX|KE|MN|WW)\d{1,5}\.jpg$/;
    const regexPattern2 = /^(00|01|02|03|04|05|06|07|08|09|10|11|12|87|88|89|90|91|92|93|94|95|96|97|98|99)(CW|L|RN|CN|LK|SO|CE|LS|TN|C|LM|TS|D|LD|W|DL|LH|WD|G|MO|WH|KY|MH|WX|KE|MN|WW)(?!0)\d{1,5}\.jpg$/;


    return regexPattern1.test(filename) || regexPattern2.test(filename) ;
}
// Create an instance of the FTP server
const ftpServer = new FtpSrv({
    url: 'ftp://127.0.0.1:21', // FTP server URL and port
    pasv_url: '127.0.0.1',      // Passive mode IP address
    pasv_min: 1024,             // Passive mode minimum port
    pasv_max: 1040              // Passive mode maximum port
});

//define the ftp upload directory here.
const ftpUploadsPath = path.join(__dirname, 'uploads');
// Handle FTP server events
ftpServer.on('login', (data, resolve, reject) => {
    const { username, password } = data;
    if (username === 'ANPR' && password === 'Complex123') {
        resolve({ root: ftpUploadsPath }); // Provide the root directory for FTP access
    } else {
        reject(new Error('Authentication failed'));
    }
});

ftpServer.on('client-error', (connection, context, error) => {
    console.error(`Client error: ${error}`);
});

// Start the FTP server
ftpServer.listen()
    .then(() => {
        console.log('FTP server listening');
    })
    .catch((error) => {
        console.error('Error starting FTP server:', error);
    });
// Move files based on criteria during server startup
function moveFilesOnStartup() {
    const uploadsPath = path.join(__dirname, 'uploads');
    const outputPath = path.join(__dirname, 'output');

    // Read the files in the uploads folder
    fs.readdir(uploadsPath, (err, files) => {
        if (err) {
            console.error('Error reading upload directory:', err);
            return;
        }

        console.log('Files found in the uploads folder:', files);

        // Iterate through each file
        files.forEach(file => {
            // Check if the file meets the criteria for moving
            if (shouldMoveFile(file)) {
                const sourcePath = path.join(uploadsPath, file);
                const destinationPath = path.join(outputPath, file);

                console.log('Attempting to move file:', file);

                // Move the file to the output folder
                fs.rename(sourcePath, destinationPath, (err) => {
                    if (err) {
                        console.error('Error moving file:', file, err);
                    } else {
                        console.log('File moved to output folder:', file);
                    }
                });
            } else {
                console.log('File does not meet criteria, not moved:', file);
            }
        });
    });
}

// Call the function to move files on server startup
moveFilesOnStartup();
// Set up static folder for serving images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route to serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web-client', 'index.html'));
});

// Route to get the list of files in the uploads folder
app.get('/files', (req, res) => {
    fs.readdir('uploads', (err, files) => {
        if (err) {
            return res.status(500).send('Error reading upload directory');
        }
        res.json(files);
    });
});

// Route to rename a file
app.put('/files/:oldName/:newName', (req, res) => {
    const oldName = req.params.oldName;
    const newName = req.params.newName;

    const oldPath = path.join('uploads', oldName);
    const newPath = path.join('output', newName);

    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            return res.status(500).send('Error renaming file');
        }
        res.send('File renamed & moved successfully');
    });
});

//new route for the delete, which is a rename: 
app.put('/files/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const sourcePath = path.join(__dirname, 'uploads', fileName);
    const destinationPath = path.join(__dirname, 'delete', fileName);

    // Attempt to move the file
    fs.rename(sourcePath, destinationPath, (err) => {
        if (err) {
            return res.status(500).send('Error moving file');
        }
        res.send('File moved to delete folder successfully');
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
