const fs = require('fs');

const deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => { // the [unlink] for deleting 
        if (err) {
            throw (err); // throwing the error in the synchronous code -> it will call the error handling middleware 
        }
    });
}

exports.deleteFile = deleteFile;